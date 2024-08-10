import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import db from "./connection.js";

puppeteer.use(StealthPlugin());

export default async function ComingGames() {
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

    // Select all <a> tags with the specified class
    const results = await page.evaluate(() => {
      // Query selector for all matching <a> tags
      const anchors = document.querySelectorAll(
        "a"
      );

      // Array to hold the extracted data
      const data = [];

      // Loop through each <a> tag
      anchors.forEach((anchor) => {
        // Extract the title from the <h1> element
        const h1 = anchor.querySelector("h1[title]");
        const title = h1 ? h1.getAttribute("title") : null;

        // Extract the time from the <div> element
        const timeDiv = anchor.querySelector("div:last-child");
        const time = timeDiv ? timeDiv.textContent.trim() : null;

        // Extract the href attribute from the <a> tag and remove '/watch' if present
        let href = anchor.getAttribute("href");
        if (href) {
          href = href.replace('/watch', ''); // Remove '/watch' from href
        }

        // Push the extracted data to the array
        if (title && time && href) {
          data.push({ title, time, href });
        }
      });

      return data;
    });

    // Log the results
    console.log(results);

    await db.collection("all-games").deleteMany({});

    await db.collection("all-games").insertMany(results);

    // Close the browser
    await browser.close();
  } catch (error) {
    console.log(error);
  }
}
