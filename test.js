import puppeteer from 'puppeteer-extra';
import StleathPlugin from "puppeteer-extra-plugin-stealth"
import {Browser} from "puppeteer"

puppeteer.use(StleathPlugin())  
import { executablePath } from "puppeteer" 

(async () => {
  const allData = {};

  try {
    const browser  = await puppeteer.launch({ headless: true, executablePath: executablePath() });
const page = browser.newPage()
    await (await page).goto('https://bot.sannysoft.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000 // Increase timeout to 60 seconds
    });
    (await page).screenshot({ path: "hy.png" })
    browser.close()
  } catch (error) {
    console.log(error)
  }
})();
