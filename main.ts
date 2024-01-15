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
    username: "haruhisasami@gmail.com",
    password: "lolmmlol777",
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

  const loginPromise = page.waitForNavigation();
  await Promise.all([loginPromise, page.click(loginButtonSelector)]);

  logger.info({}, "Logged successfully");

  const bodySelector = "body";

  await page.waitForSelector(bodySelector, { timeout: 30000 });

  const bodyText = await page.evaluate((bodySelector) => document.body.innerHTML, bodySelector);

  if (bodyText.includes(`<em class="em">次へ</em>`)) {
    logger.info({}, "Checking next page...");
    const nextSelector = "form p.submit > input";

    await page.waitForSelector(nextSelector);
    const nextPromise = page.waitForNavigation();
    await Promise.all([nextPromise, page.click(nextSelector)]);

    logger.info({}, "Next page is checked");

    const bodySelector2 = "body";

    await page.waitForSelector(bodySelector2, { timeout: 30000 });
  
    const bodyText2 = await page.evaluate((bodySelector2) => document.body.innerHTML, bodySelector2);

    if (bodyText2.includes(`<em class="em">次へ</em>`)) {
      logger.warn({}, "Again to check next page");

      const nextSelector2 = "form p.submit > input";

      await page.waitForSelector(nextSelector2);

      const nextPromise2 = page.waitForNavigation();

      await Promise.all([nextPromise2, page.click(nextSelector2)]);

      logger.info({}, "Next page is again checked");

      const bodySelector3 = "body";

      await page.waitForSelector(bodySelector3, { timeout: 30000 });

      const bodyText3 = await page.evaluate((bodySelector3) => document.body.innerHTML, bodySelector3);

    }
  }

  setTimeout(async () => {
    const redirectedUrl = page.url();
    if (redirectedUrl !== "https://grp01.id.rakuten.co.jp/rms/nid/logini") {
      logger.info({ redirectedUrl }, "Redirected to: " + redirectedUrl);

      const pointSelector =
        "#wrapper > div:nth-child(9) > div > ul > li:nth-child(3) > div > div:nth-child(2) > a > span > div > div > div";
      await page.waitForSelector(pointSelector, { timeout: 3000 });

      try {
        const result: string = await page.evaluate((pointSelector) => {
          const points = Array.from(document.querySelectorAll(pointSelector));
          console.log(document.body.innerHTML);

          if (points.length === 0) {
            logger.warn({}, "Point not found");
            throw new Error("No points found");
          }

          return points[0].innerHTML;
        }, pointSelector);

        logger.info({ result }, "Result: point is {result}".replace("{result}", result));
      } catch (error) {
        logger.error(error, "Failed to evaluate results");
      }
    } else {
      logger.warn({}, "This account does not have any point");
    }

    try {
      await browser.close();
      logger.info({}, "Browser closed");
    } catch (error) {
      logger.error(error, "Failed to close browser");
    }
  }, 3000);
}

main();
