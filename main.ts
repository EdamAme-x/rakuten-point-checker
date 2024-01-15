import puppeteer from "puppeteer";
import pino from "pino";
import { createLogger } from "./createLogger";

const logger = createLogger(
  pino({
    level: "trace",
    transport: {
      target: "pino/file",
      options: {
        destination: "tmp/out.log",
        mkdir: true,
      },
    },
  }),
);

async function main(): Promise<void> {
  const loginConfig = {
    username: "btakethis1@gmail.com",
    password: "1openthedoor",
  } as const;

  const browser = await puppeteer.launch({
    headless: "new",
  });
  const page = await browser.newPage();
  await page.goto("https://grp01.id.rakuten.co.jp/rms/nid/logini");
  logger.info({}, "Opened login page");

  // input username
  await page.type("#loginInner_u", loginConfig.username);
  // input password
  await page.type("#loginInner_p", loginConfig.password);
  logger.info({}, "Typed username and password");

  logger.info({}, "Logged...");
  const allResultsSelector = "#loginInner > p:nth-child(3) > input";
  await page.waitForSelector(allResultsSelector);
  await page.click(allResultsSelector);

  const resultsSelector =
    "#wrapper > div:nth-child(9) > div > ul > li:nth-child(3) > div > div:nth-child(2) > a > span > div > div > div";
  await page.waitForSelector(resultsSelector, { timeout: 3000 });

  const result: string = await page.evaluate((resultsSelector) => {
    if (Array.from(document.querySelectorAll(resultsSelector)).length === 0) {
      try {
        logger.info({}, "No results found");
        browser.close().then(() => {
          logger.info({}, "Browser closed");
        });
      } catch (error) {
        logger.error(error, "Failed to close browser");
      }
    }

    const result = Array.from(document.querySelectorAll(resultsSelector))[0];

    return result.innerHTML;
  }, resultsSelector)[0];

  logger.info({ result }, "Result: point is {result}");

  try {
    await browser.close();
    logger.info({}, "Browser closed");
  } catch (error) {
    logger.error(error, "Failed to close browser");
  }
}

main();
