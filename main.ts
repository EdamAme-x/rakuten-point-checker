import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
    headless: "new"
});
const page = await browser.newPage();
await page.goto('https://example.com');
await page.screenshot({path: 'screenshot.png'});
await browser.close();