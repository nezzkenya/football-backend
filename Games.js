import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import db from "./connection.js";

puppeteer.use(StealthPlugin());

const AddGame = async (game) => {
  try {
    const collection = db.collection("games"); // Assuming `db` is already connected to your MongoDB instance

    const exists = await collection.findOne({ href: game.href });
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
            language: game.language, // Include language in the update
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
  const browserInstances = [];

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--disable-setuid-sandbox", "--no-sandbox"],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });
    browserInstances.push(browser);

    const page = await browser.newPage();

    await page.goto("https://streamed.su/category/football", {
      waitUntil: "networkidle2",
      timeout: 60000, // Increase timeout to 60 seconds
    });

    const hrefs = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll("a")); // Select all <a> elements
      const now = new Date();
      const tenMinutesLater = new Date(now.getTime() + 10 * 60000); // 10 minutes later

      return anchors.map((anchor) => {
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
        const getLanguage = (anchor) => {
          const div = anchor.querySelector("div:last-child");
          return div ? div.textContent.trim() : null;
        };

        const href = anchor.getAttribute("href");
        const isAvailable24_7 = anchor.textContent.includes("24/7");
        const timeString = anchor.getAttribute("data-time"); // Assuming this attribute contains the time in "HH:MM AM/PM" format

        // Check if timeString is valid before parsing
        let isWithinTenMinutes = false;
        if (timeString) {
          const timeParts = timeString.split(" ");
          if (timeParts.length === 2) {
            const [hourMinute, period] = timeParts[0].split(":");
            let hour = parseInt(hourMinute, 10);
            if (period === "PM" && hour < 12) hour += 12;
            const minute = parseInt(hourMinute, 10);

            const gameTime = new Date();
            gameTime.setHours(hour, minute, 0);

            const now = new Date();
            const tenMinutesLater = new Date(now.getTime() + 10 * 60000); // 10 minutes later

            isWithinTenMinutes = gameTime <= tenMinutesLater;
          }
        }

        return {
          href: href,
          Quality: h2 ? h2.textContent : null,
          Name: getName(href),
          date: now.toISOString(),
          link: Getlink(href),
          stream: Getstream(href),
          language: getLanguage(anchor), // Extract language
          available24_7: isAvailable24_7,
          withinTenMinutes: isWithinTenMinutes,
        };
      }).filter((item) => item.Quality); // Filter out items without h2 text
    });

    console.log(hrefs);

    for (let i = 0; i < hrefs.length; i++) {
      if (hrefs[i]) {
        const link = `https://streamed.su${hrefs[i].href}`;
        await page.goto(link, { waitUntil: "networkidle2" });

        const data = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll("a"));

          return anchors.map((anchor) => {
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
            const getLanguage = (anchor) => {
              const div = anchor.querySelector("div:last-child");
              return div ? div.textContent.trim() : null;
            };
            const now = new Date();
            const link =  Getlink(anchor.href)
            const stream = Getstream(anchor.href)
            return {
              href: anchor.href,
              Quality: h2 ? h2.textContent : null,
              Name: getName(anchor.href),
              date: now.toISOString(),
              link: link ,
              stream: stream,
              language: getLanguage(anchor), // Extract language
              iframeSrc: `https://embedme.top/embed/${link}/${stream}`
            };
          }).filter((item) => item.Quality); // Filter out items without h2 text
        });

        // Add or update each game in the database
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
