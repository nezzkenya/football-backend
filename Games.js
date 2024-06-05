import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import db from "./connection.js";
puppeteer.use(StealthPlugin());

const AddGame = async (game) => {
  try {
    const collection = db.collection("games");

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
      );
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
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--disable-setuid-sandbox", "--no-sandbox"]
    });

    const page = await browser.newPage();

    await page.goto("https://streamed.su/category/football", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    const hrefs = await page.evaluate(() => {
      const divs = Array.from(
        document.querySelectorAll("div.font-bold.text-red-500")
      );
      const hrefs = divs.map((div) => div.closest("a")?.getAttribute("href"));
      return hrefs.filter((href) => href);
    });

    console.log(hrefs);

    for (const href of hrefs) {
      if (href) {
        const link = `https://streamed.su${href}`;
        await page.goto(link, { waitUntil: "networkidle2" });

        const data = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll("a"));
          const now = new Date();
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
              const getLink = (href) => {
                const regex = /watch\/([^\/]+)\//;
                const match = href.match(regex);
                if (match && match[1]) {
                  return match[1];
                }
                return null;
              };
              const getStream = (href) => {
                const regex = /\/(\d+)$/;
                const match = href.match(regex);
                if (match && match[1]) {
                  return match[1];
                }
                return null;
              };
              return {
                href: anchor.href,
                Quality: h2 ? h2.textContent : null,
                Name: getName(anchor.href),
                date: now.toISOString(),
                link: getLink(anchor.href),
                stream: getStream(anchor.href),
              };
            })
            .filter((item) => item.Quality);
        });

        for (const item of data) {
          try {
            await page.goto(item.href, { waitUntil: "networkidle2" });

            const iframeSrc = await page.evaluate(() => {
              const iframe = document.querySelector("iframe");
              return iframe ? iframe.src : null;
            });

            item.iframeSrc = iframeSrc;
            console.log(item);
            await AddGame(item);
          } catch (error) {
            console.error(`Error fetching iframe for ${item.href}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in GetGames function:", error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
