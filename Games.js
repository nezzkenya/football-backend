import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import db from "./connection.js";
import { createLogger, format, transports } from "winston";

// Puppeteer setup
puppeteer.use(StealthPlugin());

// Logger setup
const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: "app.log" }),
  ],
});

// Function to add or update a game in the database
const addGame = async (game) => {
  try {
    const collection = db.collection("games");
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
          },
        }
      );
      logger.info(`Game updated: ${game.Name}`);
    } else {
      await collection.insertOne(game);
      logger.info(`Game added: ${game.Name}`);
    }
  } catch (error) {
    logger.error(`Error adding or updating game: ${error.message}`);
  }
};

// Function to extract game data from a given page
const extractGameData = async (page) => {
  return await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a"));
    const now = new Date();

    return anchors
      .map((anchor) => {
        const h2 = anchor.querySelector("h2");
        const getName = (href) => {
          const regex = /watch\/([^\/]+)\//;
          const match = href.match(regex);
          return match ? match[1].replace(/-/g, " ") : null;
        };
        const getLink = (href) => {
          const regex = /watch\/([^\/]+)\//;
          const match = href.match(regex);
          return match ? match[1] : null;
        };
        const getStream = (href) => {
          const regex = /\/(\d+)$/;
          const match = href.match(regex);
          return match ? match[1] : null;
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
};

// Function to get games from the main page
const getGames = async () => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--disable-setuid-sandbox", "--no-sandbox"],
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
      return divs
        .map((div) => div.closest("a")?.getAttribute("href"))
        .filter((href) => href);
    });

    logger.info(`Found ${hrefs.length} game links.`);

    for (const href of hrefs) {
      if (href) {
        const link = `https://streamed.su${href}`;
        await page.goto(link, { waitUntil: "networkidle2" });

        const data = await extractGameData(page);

        for (const item of data) {
          try {
            await page.goto(item.href, { waitUntil: "networkidle2" });

            const iframeSrc = await page.evaluate(() => {
              const iframe = document.querySelector("iframe");
              return iframe ? iframe.src : null;
            });

            item.iframeSrc = iframeSrc;
            await addGame(item);
          } catch (error) {
            logger.error(`Error fetching iframe for ${item.href}: ${error.message}`);
          }
        }
      }
    }
  } catch (error) {
    logger.error(`Error in GetGames function: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

export default getGames;
