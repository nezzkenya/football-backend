import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fetch from "node-fetch"; // Ensure you have node-fetch installed
import db from "./connection.js"; // Assuming `db` is already connected to your MongoDB instance

puppeteer.use(StealthPlugin());

await db.collection("games").deleteMany({})
const BASE_EMBED_URL = "https://embedme.top/embed/";
const API_URL = "https://telegraf-five.vercel.app/api";
const AddGame = async (game) => {
  try {
    const collection = db.collection("games");
    const exists = await collection.findOne({ href: game.href });

    if (exists) {
      // Update the existing game
      await collection.updateOne(
        { href: game.href },
        {
          $set: {
            Quality: game.Quality,
            Name: game.Name,
            iframeSrc: game.iframeSrc,
            link: game.link,
            stream: game.stream,
            language: game.language,
            time: game.time,
          },
        }
      );
      console.log("Game updated:", game.href);
    } else {
      // Add the new game
      await collection.insertOne(game);
      console.log("Game added:", game.href);
    }
  } catch (error) {
    console.error("Error adding or updating game:", error);
  }
};

const isTimeBeforeCurrent = (gameTime) => {
  const now = new Date();
  const [time, period] = gameTime.split(" ");
  const [hours, minutes] = time.split(":").map(Number);
  let hours24 = hours % 12 + (period === "PM" ? 12 : 0);
  
  const timeToCompare = new Date();
  timeToCompare.setHours(hours24, minutes, 0, 0);
  
  return timeToCompare < now;
};

const isTimeWithinNext10Minutes = (timeStr) => {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  hours += modifier === "PM" && hours !== 12 ? 12 : 0;
  if (modifier === "AM" && hours === 12) hours = 0;

  const now = new Date();
  const parsedTime = new Date(now);
  parsedTime.setHours(hours, minutes, 0, 0);
  
  const timeIn10Minutes = new Date(now.getTime() + 10 * 60000);
  return parsedTime >= now && parsedTime <= timeIn10Minutes;
};

export default async function GetGames() {
  const browserInstances = [];

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--disable-setuid-sandbox", "--no-sandbox"],
      executablePath: process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
    });
    browserInstances.push(browser);

    const page = await browser.newPage();
    await page.goto("https://streamed.su/category/football", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    const hrefs = await page.evaluate(() => {
      const getName = (href) => {
        const regex = /watch\/(?:\d+-)?([^\/]+)/; // Improved regex
        const match = href.match(regex);
        return match ? match[1].replace(/-/g, " ").replace(/\s*-\s*$/, "") : null; // Remove trailing dashes
      };

      const anchors = Array.from(document.querySelectorAll("a"));
      return anchors.map((anchor) => {
        const h2 = anchor.querySelector("h2");
        const href = anchor.getAttribute("href");
        const isAvailable24_7 = anchor.textContent.includes("24/7");
        const getTime = (anchor) => {
          const div = anchor.querySelector("div:last-child");
          return div ? div.textContent.trim() : null;
        };

        return {
          href,
          Quality: h2 ? h2.textContent : null,
          date: new Date().toISOString(),
          available24_7: isAvailable24_7,
          time: getTime(anchor),
        };
      }).filter((item) => item.Quality);
    });

    console.log(hrefs);

    for (const { href, time, available24_7 } of hrefs) {
      const isWithin10Minutes = isTimeWithinNext10Minutes(time);
      const started = isTimeBeforeCurrent(time);

      if (available24_7 || started || isWithin10Minutes) {
        const link = `https://streamed.su${href}`;
        await page.goto(link, { waitUntil: "networkidle2" });

        const data = await page.evaluate(() => {
          const getName = (href) => {
            const regex = /watch\/(?:\d+-)?([^\/]+)\//;
            const match = href.match(regex);
            if (match && match[1]) {
              return match[1].replace(/-\d+$/, "").replace(/-/g, " ");
            }
            return null;
          };

          const GetIframeSrc = (href) => {
            // Define the base URL for the iframe src
            const baseEmbedUrl = "https://embedme.top/embed/";
          
            // Use a regex to extract the necessary parts from the href
            const regex = /watch\/([\d+-]+|[^\/]+)\/([a-z]+)\/(\d+)/; // Match both patterns
            const match = href.match(regex);
          
            if (match) {
              const [, gameInfo, provider, id] = match;
              // Construct the iframe src URL
              return `${baseEmbedUrl}${provider}/${gameInfo}/${id}`;
            }
          
            // Return the href itself if it already matches the desired format or can't be parsed
            return href;
          };
          

          const anchors = Array.from(document.querySelectorAll("a"));
          return anchors.map((anchor) => {
            const h2 = anchor.querySelector("h2");
            const stream = anchor.href.match(/\/(\d+)$/)?.[1] || null;
            const getLanguage = () => {
              const div = anchor.querySelector("div:last-child");
              return div ? div.textContent.trim() : null;
            };
            
            const gameName = getName(anchor.href);
            const gameLink = gameName ? gameName.replace(/\s+/g, "-").toLowerCase() : null;

            return {
              href: anchor.href,
              Quality: h2 ? h2.textContent : null,
              Name: gameName,
              date: new Date().toISOString(),
              link: gameLink, // Use the formatted link
              stream,
              language: getLanguage(),
              iframeSrc: GetIframeSrc(anchor.href), // Use the updated function to get iframeSrc
            };
          }).filter((item) => item.Quality);
        });

        for (const item of data) {
          console.log(item);
          await AddGame({ ...item, time });
        }
      }
    }
  } catch (error) {
    console.error("Error in GetGames:", error);
  } finally {
    for (const instance of browserInstances) {
      await instance.close();
    }
  }
}
