import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import db from "./connection.js";  // Ensure this is configured to connect to your database

puppeteer.use(StealthPlugin());

export default async function ComingGames() {
  const browserInstances = [];

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--disable-setuid-sandbox", "--no-sandbox"],
      executablePath: process.env.GOOGLE_CHROME_BIN || null,
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
        "a.bg-secondary.transition-all"
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

        // Push the extracted data to the array
        if (title && time) {
          data.push({ title, time });
        }
      });

      return data;
    });

    // Log the results
    console.log(results);

    // Ensure we handle the database connection properly
    await db.collection("all-games").deleteMany({});
    await db.collection("all-games").insertMany(results);

  } catch (error) {
    console.error('Error occurred:', error);
  } finally {
    // Ensure all browser instances are closed
    for (const browser of browserInstances) {
      await browser.close();
    }
  }
}

// Call the function if you want it to run immediately when the script is executed
ComingGames();
