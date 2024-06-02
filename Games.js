import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import db from "./connection.js";

puppeteer.use(StealthPlugin());

const AddGame = async (game) => {
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
      console.log("Game updated:", game.href);
    } else {
      await collection.insertOne(game);
      console.log("Game added:", game.href);
    }
  } catch (error) {
    console.error("Error adding or updating game:", error);
  }
};


export default async function GetGames() {
  const browserInstances = [];
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--disable-setuid-sandbox", "--no-sandbox"],
      executablePath:puppeteer.executablePath(),
    });
    const page = await browser.newPage();
    browserInstances.push(browser);

    await page.goto("https://streamed.su/category/football", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    const hrefs = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll("div.font-bold.text-red-500"));
      return divs.map((div) => div.closest("a")?.getAttribute("href")).filter(Boolean);
    });

    console.log(hrefs);

    for (let i = 0; i < hrefs.length; i++) {
      const link = `https://streamed.su${hrefs[i]}`;
      await page.goto(link, { waitUntil: "networkidle2" });

      const data = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll("a"));
        return anchors.map((anchor) => {
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
          const now = new Date();
          return {
            href: anchor.href,
            Quality: h2 ? h2.textContent : null,
            Name: getName(anchor.href),
            date: now.toISOString(),
            link: getLink(anchor.href),
            stream: getStream(anchor.href),
          };
        }).filter((item) => item.Quality);
      });

      for (const item of data) {
        const newPage = await browser.newPage();
        try {
          await newPage.goto(item.href, { waitUntil: "networkidle2" });
          const iframeSrc = await newPage.evaluate(() => {
            const iframe = document.querySelector("iframe");
            return iframe ? iframe.src : null;
          });
          item.iframeSrc = iframeSrc;
          await AddGame(item);
        } catch (error) {
          console.error(`Error fetching iframe for ${item.href}:`, error);
        } finally {
          await newPage.close();
        }
      }
    }
  } catch (error) {
    console.log(error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
