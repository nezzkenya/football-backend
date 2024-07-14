import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export default async function ComingGames() {
  const browserInstances = [];

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--disable-setuid-sandbox", "--no-sandbox"],
      executablePath: puppeteer.executablePath(),
    });
    browserInstances.push(browser);

    const page = await browser.newPage();

    await page.goto("https://youtube.com/live/a6F84LJoYUc?feature=share", {
      waitUntil: "networkidle2",
      timeout: 60000, // Increase timeout to 60 seconds
    });

    // Wait for the consent dialog and click "Accept all"
    try {
      await page.waitForSelector('button', { timeout: 10000 });
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const buttonText = await page.evaluate(button => button.textContent, button);
        if (buttonText.includes('Accept all')) {
          await button.click();
          break;
        }
      }
      console.log("Accepted cookies.");

      // Wait for 10 seconds using setTimeout
      await new Promise(resolve => setTimeout(resolve, 6000));
    } catch (consentError) {
      console.error("Error accepting cookies:", consentError);
    }

    // Try taking a full-page screenshot and handle specific errors
    try {
      await page.screenshot({ path: "x.png"});
      console.log("Full-page screenshot taken successfully.");
    } catch (screenshotError) {
      console.error("Error taking screenshot:", screenshotError);
    }
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

ComingGames()