import { inputManager } from "../inputManager";
import {
  EnoguLike,
  LoggerLike,
  PointResult,
  RouterResult,
  config,
} from "../types";
import { AlphabetAndNumberValidator } from "./../validator/index";
import { loggerMessage } from "./../loggerMessage/index";
import * as puppeteer from "puppeteer";
import { wait } from "./../utils/wait";

const unnecessaryRequests = [
  "https://rat.rakuten.co.jp/",
  "https://gateway-api-r2p2.recommend.rakuten.co.jp/r2p2/ichiba/v2/recommend/top_item_pc",
  "https://s-dlv.rmp.rakuten.co.jp/cd",
  "https://gateway-api-r2p2.recommend.rakuten.co.jp/r2p2/ichiba/v2/recommend/top_buyagain_pc",
];

const unnecessaryExtensions = ["png", "jpg", "jpeg", "gif", "ico", "css"];

const passWords = ["no-image.png"];

export class StandRakutenRouter {
  constructor(
    private logger: LoggerLike,
    private enogu: EnoguLike,
    private loggerMessages: loggerMessage,
    private config: config,
  ) {}

  async start(withProxy: boolean, proxyContent: string[]) {
    this.logger.info({}, "単体楽天垢 ポイントチェック");
    this.logger.info({}, "Crtl + C で終了");
    this.loggerMessages.blank();
    let userId = (
      await new inputManager(`${this.enogu.green("[UserId]: ")} `).waitInput()
    ).trim();
    let password = (
      await new inputManager(`${this.enogu.green("[Password]: ")} `).waitInput()
    ).trim();

    if (
      !AlphabetAndNumberValidator(userId) ||
      !AlphabetAndNumberValidator(password)
    ) {
      this.logger.error(
        {},
        `${this.enogu.red("[UserId]")} と ${this.enogu.red("[Password]")} には半角英数字記号のみを入力してください。`,
      );
      this.loggerMessages.blank();

      return await this.start(withProxy, proxyContent);
    }

    const result = await this.check(userId, password, withProxy, proxyContent);

    if (result.success) {
      const resultObject: PointResult = JSON.parse(result.message);
      this.logger.info({}, `[成功]`);
      this.logger.info({}, `ユーザーID: ${userId}`);
      this.logger.info({}, `パスワード: ${password}`);
      this.logger.info({}, `ポイント: ${resultObject.point}`);
      for (let i = 0, len = resultObject.some.length; i < len; i++) {
        const some = resultObject.some[i];
        this.logger.info({}, `${some.name}: ${some.value}`);
      }
    }
  }

  async check(username: string, password: string, withProxy: boolean, proxyContent: string[]): Promise<RouterResult> {
    this.logger.info({}, "起動中・・");

    const args = [
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-setuid-sandbox",
      "--no-first-run",
      "--no-sandbox",
      "--no-zygote",
      "--single-process",
    ]

    if (withProxy) {
      args.push(`--proxy-server=${proxyContent[Math.floor(Math.random() * proxyContent.length)]}`)
    }

    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        ...args
      ],
    });

    const result: {
      point: string;
      some: {
        name: string;
        value: string;
      }[];
    } = {
      point: "0",
      some: [],
    };

    this.logger.info({}, "ページの読み込み中・・");
    const page = await browser.newPage();
    page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" +
        Math.floor(Math.random() * 200) +
        ".0.4692.99 Safari/537.36",
    );
    page.setRequestInterception(true);
    this.setUnnecessary(page);

    await page.goto(this.config.values.entryPoint);

    await page.type("#loginInner_u", username);
    await page.type("#loginInner_p", password);

    const loginButtonSelector = "#loginInner > p:nth-child(3) > input";

    await page.waitForSelector(loginButtonSelector, {
      timeout: 0,
    });

    const loginPromise = page.waitForNavigation();

    try {
      await Promise.all([loginPromise, page.click(loginButtonSelector)]);
    } catch (_e) {
      await browser.close();
      return {
        success: false,
        message: JSON.stringify({
          point: "0",
          some: [],
        }),
      };
    }

    const bypass = await this.bypassNextPage(browser, page);

    switch (bypass) {
      case "bypass":
        this.logger.info({}, "取得中・・・");
        break;
      case "notBypass":
        this.logger.info({}, "取得中・・・");
        break;
      case "failBypass":
        this.logger.error({}, "認証に失敗しました。");
        await browser.close();
        return {
          success: false,
          message: "認証に失敗しました。",
        };
    }

    const Point = await this.getPoint(browser, page);

    if (Point.success) {
      result.point = Point.point;
    } else {
      this.logger.error({}, "取得失敗しました");
      await browser.close();
      return {
        success: false,
        message: JSON.stringify(result),
      };
    }

    for (let i = 0, len = Point.some.length; i < len; i++) {
      const some = Point.some[i];
      result.some.push({
        name: some.name,
        value: some.value,
      });
    }

    await browser.close();
    return {
      success: true,
      message: JSON.stringify(result),
    };
  }

  async getPoint(
    browser: puppeteer.Browser,
    page: puppeteer.Page,
  ): Promise<PointResult> {
    const bodySelector = "body";

    await page.waitForSelector(bodySelector);

    const body = await page.evaluate(
      (bodySelector) => document.body.innerHTML,
      bodySelector,
    );

    if (body.includes("認証コードをご入力ください ")) {
      this.logger.error({}, "SMS認証を要求されました。");
      return {
        success: false,
        point: "0",
        some: [],
      };
    }

    await wait(this.config.values.waitTime * (Math.random() + 0.75));

    const currentUrl = await page.url();

    if (currentUrl !== this.config.values.entryPoint) {
      try {
        const pointSelector =
          "#wrapper > div:nth-child(9) > div > ul > li:nth-child(3) > div > div:nth-child(2) > a > span > div > div > div";
        await page.waitForSelector(pointSelector, { timeout: 5000 });
        let point = "0";

        const pointText = await page.evaluate((pointSelector) => {
          const points = Array.from(
            document.querySelectorAll(pointSelector),
          )[0];

          return points.innerHTML;
        }, pointSelector);

        if (pointText) {
          point = pointText;
        }

        let isRakutenMobile = false;

        const mobileSelector =
          "#wrapper > div:nth-child(19) > div > div > div > div > div > div > div > div > div.swiper-slide.swiper-slide-next > div > div > img";

        await page.waitForSelector(mobileSelector, { timeout: 5000 });

        const isRakutenMobileBool = await page.evaluate((mobileSelector) => {
          const isRakutenMobile = Array.from(
            document.querySelectorAll(mobileSelector),
          )[0];

          return isRakutenMobile.getAttribute("src") ===
            "https://r.r10s.jp/com/inc/home/20080930/ris/img/spu_icon/status_change.svg"
            ? false
            : true;
        }, mobileSelector);

        if (isRakutenMobileBool) {
          isRakutenMobile = isRakutenMobileBool;
        }

        await page.goto(
          "https://my.rakuten.co.jp/?l-id=top_normal_myrakuten_account",
        );

        let myStatus = "";

        const myStatusSelector = "#mystatus_rankName";

        await page.waitForSelector(myStatusSelector, { timeout: 5000 });

        const myStatusText = await page.evaluate((myStatusSelector) => {
          const myStatus = Array.from(
            document.querySelectorAll(myStatusSelector),
          )[0];

          return myStatus.innerHTML;
        }, myStatusSelector);

        if (myStatusText) {
          myStatus = myStatusText.trim();
        }

        return {
          success: true,
          point: point,
          some: [
            {
              name: "会員レベル",
              value: myStatus,
            },
            {
              name: "Rakuten Mobile",
              value: isRakutenMobile ? "Mobile会員" : "Mobile未会員",
            },
          ],
        };
      } catch (error) { 
        const bodySelector = "body";

        await page.waitForSelector(bodySelector);

        const body = await page.evaluate(
          (bodySelector) => document.body.innerHTML,
          bodySelector,
        )

        if (body.includes("認証コード")) {
          this.logger.error({}, "IP 規制");
          return {
            success: false,
            point: "0",
            some: [],
          };
        }

        this.logger.error({}, "取得失敗 存在しません。");
        this.logger.error({}, error);
      }
    }

    return {
      success: false,
      point: "0",
      some: [],
    };
  }

  async bypassNextPage(
    browser: puppeteer.Browser,
    page: puppeteer.Page,
  ): Promise<"bypass" | "notBypass" | "failBypass"> {
    this.logger.info({}, "認証を自動試行中・・・");

    try {
      const bodySelector = "body";

      await page.waitForSelector(bodySelector, { timeout: 5000 });

      const bodyText = await page.evaluate(
        (bodySelector) => document.body.innerHTML,
        bodySelector,
      );

      if (bodyText.includes(`<em class="em">次へ</em>`)) {
        const nextSelector = "form p.submit > input";

        await page.waitForSelector(nextSelector);

        const nextPromise = page.waitForNavigation();

        await Promise.all([nextPromise, page.click(nextSelector)]);
        await this.bypassNextPage(browser, page);
      } else {
        return "notBypass";
      }
    } catch (_e) {
      this.logger.info({}, "認証に失敗しました。");
      this.logger.error({}, _e);
      return "failBypass";
    }

    this.logger.info({}, "認証に成功しました。");
    return "bypass";
  }

  private setUnnecessary(page: puppeteer.Page) {
    page.on("request", (request) => {
      // if (scrapingUrl === request.url()) {
      //   request.continue().catch(err => console.error(err))
      // } else {
      //   request.abort().catch(err => console.error(err))
      // }

      const url = new URL(request.url());
      const serializedUrl = url.origin + url.pathname;

      for (let i = 0, len = passWords.length; i < len; i++) {
        if (serializedUrl.includes(passWords[i])) {
          request.continue().catch();
          return;
        }
      }

      for (let i = 0, len = unnecessaryRequests.length; i < len; i++) {
        if (serializedUrl === unnecessaryRequests[i]) {
          request.abort().catch();
          return;
        }
      }

      for (let i = 0, len = unnecessaryExtensions.length; i < len; i++) {
        if (serializedUrl.split(".").pop() === unnecessaryExtensions[i]) {
          request.abort().catch();
          return;
        }
      }

      request.continue().catch();
    });
  }
}
