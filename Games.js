import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fetch from "node-fetch"; // Ensure you have node-fetch installed
import db from "./connection.js"; // Assuming `db` is already connected to your MongoDB instance

puppeteer.use(StealthPlugin());

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
      console.log("Game updated");
    } else {
      // Add the new game
      await collection.insertOne(game);
      console.log("Game added");
    }
  } catch (error) {
    console.error("Error adding or updating game:", error);
  }
};

function isTimeBeforeCurrent(gameTime) {
  const now = new Date();
  const [time, period] = gameTime.split(" ");
  const [hours, minutes] = time.split(":");

  let hours24 = parseInt(hours, 10);
  if (period === "PM" && hours24 < 12) {
    hours24 += 12;
  } else if (period === "AM" && hours24 === 12) {
    hours24 = 0;
  }

  const timeToCompare = new Date();
  timeToCompare.setHours(hours24, parseInt(minutes, 10), 0, 0);

  return timeToCompare < now;
}

function isTimeWithinNext10Minutes(timeStr) {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);

  if (modifier === "PM" && hours !== 12) {
    hours += 12;
  } else if (modifier === "AM" && hours === 12) {
    hours = 0;
  }

  const now = new Date();
  const parsedTime = new Date(now);
  parsedTime.setHours(hours, minutes, 0, 0);

  const currentTime = new Date();
  const timeIn10Minutes = new Date(currentTime.getTime() + 10 * 60000);

  return parsedTime >= currentTime && parsedTime <= timeIn10Minutes;
}

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
      timeout: 60000,
    });

    const hrefs = await page.evaluate(() => {
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
          const getTime = (anchor) => {
            const div = anchor.querySelector("div:last-child");
            return div ? div.textContent.trim() : null;
          };

          const href = anchor.getAttribute("href");
          const isAvailable24_7 = anchor.textContent.includes("24/7");
          return {
            href: href,
            Quality: h2 ? h2.textContent : null,
            date: now.toISOString(),
            available24_7: isAvailable24_7,
            time: getTime(anchor),
          };
        })
        .filter((item) => item.Quality);
    });

    console.log(hrefs);

    for (let i = 0; i < hrefs.length; i++) {
      const isWithin10Minutes = isTimeWithinNext10Minutes(hrefs[i].time);
      const started = isTimeBeforeCurrent(hrefs[i].time);

      if (hrefs[i] && (hrefs[i].available24_7 || started || isWithin10Minutes)) {
        const time = hrefs[i].time;
        const link = `https://streamed.su${hrefs[i].href}`;
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
              const getLanguage = (anchor) => {
                const div = anchor.querySelector("div:last-child");
                return div ? div.textContent.trim() : null;
              };
              const now = new Date();
              const link = Getlink(anchor.href);
              const stream = Getstream(anchor.href);
              return {
                href: anchor.href,
                Quality: h2 ? h2.textContent : null,
                Name: getName(anchor.href),
                date: now.toISOString(),
                link: link,
                stream: stream,
                language: getLanguage(anchor),
                iframeSrc: `https://embedme.top/embed/${link}/${stream}`,
              };
            })
            .filter((item) => item.Quality);
        });
        const collection = db.collection("games");
if(data[0]?.link !== undefined){
  const added = await collection.findOne({ link: data[0]?.link });

  if (!added) {
    // Send POST request
    const res = await fetch("https://telegraf-five.vercel.app/api", {
      method: "POST",
      body: JSON.stringify({...data[0],time: time}),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (res.ok) {
      console.log("Game successfully posted to the API");
    } else {
      console.error("Failed to post game to the API", res.statusText);
    }
  }
}

        data.forEach((item) => {
          const item2 = { ...item, time: time };
          console.log(item2);
          AddGame(item2);
        });
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
