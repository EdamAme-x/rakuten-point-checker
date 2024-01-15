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
  const loginButtonSelector = "#loginInner > p:nth-child(3) > input";
  await page.waitForSelector(loginButtonSelector);

  await Promise.all([
    page.waitForNavigation(),
    page.click(loginButtonSelector),
  ]);

  logger.info({}, "Logged successfully");

  const pointSelector =
    "#wrapper > div:nth-child(9) > div > ul > li:nth-child(3) > div > div:nth-child(2) > a > span > div > div > div";
  await page.waitForSelector(pointSelector, { timeout: 3000 });

  try {
    const result: string = await page.evaluate((pointSelector) => {
      const results = Array.from(document.querySelectorAll(pointSelector));

      if (results.length === 0) {
        logger.info({}, "Login failed. Closing browser...");
        throw new Error("No results found");
      }

      return results[0].innerHTML;
    }, pointSelector);

    logger.info({ result }, "Result: point is {result}");
  } catch (error) {
    logger.error(error, "Failed to evaluate results");
  } finally {
    try {
      await browser.close();
      logger.info({}, "Browser closed");
    } catch (error) {
      logger.error(error, "Failed to close browser");
    }
  }
}

main();
