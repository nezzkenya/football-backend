import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import db from "./connection.js";
puppeteer.use(StealthPlugin());
const AddGame = async (game) => {
  try {
    const collection = db.collection("games"); // Assuming `db` is already connected to your MongoDB instance

    const exists = await collection.findOne({ href: game.href });
    console.log(exists);
    if (exists) {
      await collection.updateOne(
        { href: game.href },
        {
          $set: {
            href: game.href,
            Quality: game.Quality,
            Name: game.Name,
            iframeSrc: game.iframeSrc,
            link: game.link,
            stream: game.stream,
          },
        }
      ); // Use $set to update only the specified fields
      console.log("Game updated");
    } else {
      await collection.insertOne(game);
      console.log("Game added");
    }
  } catch (error) {
    console.error("Error adding or updating game:", error);
  }
};

export default async function GetGames() {
  const browserInstances = [];

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--disable-setuid-sandbox", "--no-sandbox"],
      executablePath: puppeteer.executablePath(),
    });
    browserInstances.push(browser);

    const page = await browser.newPage();

    await page.goto("https://streamed.su/category/football", {
      waitUntil: "networkidle2",
      timeout: 60000, // Increase timeout to 60 seconds
    });

    const hrefs = await page.evaluate(() => {
      const divs = Array.from(
        document.querySelectorAll("div.font-bold.text-red-500")
      );
      const hrefs = divs.map((div) => div.closest("a")?.getAttribute("href"));
      return hrefs.filter((href) => href); // Filter out null or undefined hrefs
    });

    console.log(hrefs);

    for (let i = 0; i < hrefs.length; i++) {
      if (hrefs[i]) {
        const link = `https://streamed.su${hrefs[i]}`;
        await page.goto(link, { waitUntil: "networkidle2" });

        const data = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll("a"));
          return anchors
            .map((anchor) => {
              const h2 = anchor.querySelector("h2");
              const getName = (href) => {
                const regex = /watch\/([^\/]+)\//;
                const match = href.match(regex);
                if (match && match[1]) {
                  return match[1].replace(/-/g, " ");
                }
                return null;
              };
              const Getlink = (href) => {
                const regex = /watch\/([^\/]+)\//;
                const match = href.match(regex);
                if (match && match[1]) {
                  return match[1];
                }
                return null;
              };
              const Getstream = (href) => {
                const regex = /\/(\d+)$/;
                const match = href.match(regex);
                if (match && match[1]) {
                  return match[1];
                }
                return null;
              };
              const now = new Date();
              return {
                href: anchor.href,
                Quality: h2 ? h2.textContent : null,
                Name: getName(anchor.href),
                date: now.toISOString(),
                link: Getlink(anchor.href),
                stream: Getstream(anchor.href),
              };
            })
            .filter((item) => item.Quality); // Filter out items without h2 text
        });

        for (const item of data) {
          const newPage = await browser.newPage();
          browserInstances.push(newPage);

          try {
            await newPage.goto(item.href, { waitUntil: "networkidle2" });

            const iframeSrc = await newPage.evaluate(() => {
              const iframe = document.querySelector("iframe");
              return iframe ? iframe.src : null;
            });

            item.iframeSrc = iframeSrc;
          } catch (error) {
            console.error(`Error fetching iframe for ${item.href}:`, error);
          } finally {
            await newPage.close();
            browserInstances.pop();
          }
        }
        // Group the data by Name
        data.forEach((item) => {
          console.log(item);
          AddGame(item);
        });
      }
    }
  } catch (error) {
    console.log(error);
  } finally {
    for (const instance of browserInstances) {
      await instance.close();
    }
  }
}
