import { inputManager } from "../inputManager";
import {
  EnoguLike,
  LoggerLike,
  PointAndNameResult,
  RouterResult,
  config,
} from "../types";
import { AlphabetAndNumberValidator } from "./../validator/index";
import { loggerMessage } from "./../loggerMessage/index";
import * as puppeteer from "puppeteer";
import { wait } from "./../utils/wait";

export class StandRakutenRouter {
  constructor(
    private logger: LoggerLike,
    private enogu: EnoguLike,
    private loggerMessages: loggerMessage,
    private config: config,
  ) {}

  async start() {
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
        `${this.enogu.red("[UserId]")} と ${this.enogu.red("[Password]")} には半角英数字のみを入力してください。`,
      );
      this.loggerMessages.blank();

      return await this.start();
    }

    const result = await this.check(userId, password);

    if (result.success) {
      const resultObject: PointAndNameResult = JSON.parse(result.message);
      this.logger.info({}, `ユーザー名: ${resultObject.name}`);
      this.logger.info({}, `ポイント: ${resultObject.point}`);
    }else {
      this.logger.error({}, result.message);
    }
  }

  async check(username: string, password: string): Promise<RouterResult> {
    this.logger.info({}, "起動中・・");
    const browser = await puppeteer.launch({
      headless: "new",
    });

    const result = {
      point: "0",
      name: "",
    };

    this.logger.info({}, "ページの読み込み中・・");
    const page = await browser.newPage();

    await page.goto(this.config.values.entryPoint);

    await page.type("#loginInner_u", username);
    await page.type("#loginInner_p", password);

    const loginButtonSelector = "#loginInner > p:nth-child(3) > input";

    await page.waitForSelector(loginButtonSelector);

    const loginPromise = page.waitForNavigation();

    await Promise.all([loginPromise, page.click(loginButtonSelector)]);
    this.logger.info({}, "ログイン処理中・・");

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
        return {
          success: false,
          message: "認証に失敗しました。",
        };
    }

    const pointAndName = await this.getPointAndName(browser, page);

    if (pointAndName.success) {
      result.point = pointAndName.point;
      result.name = pointAndName.name;
    } else {
      this.logger.error({}, "取得失敗しました");
      return {
        success: false,
        message: JSON.stringify(result),
      };
    }

    return {
      success: true,
      message: JSON.stringify(result),
    };
  }

  async getPointAndName(
    browser: puppeteer.Browser,
    page: puppeteer.Page,
  ): Promise<PointAndNameResult> {
    await wait(this.config.values.waitTime);

    const currentUrl = await page.url();

    if (currentUrl !== this.config.values.entryPoint) {
      try {
        const pointSelector =
          "#wrapper > div:nth-child(9) > div > ul > li:nth-child(3) > div > div:nth-child(2) > a > span > div > div > div";
        await page.waitForSelector(pointSelector, { timeout: 3000 });

        const nameSelector =
          "#wrapper > div:nth-child(9) > div > ul > li:nth-child(2) > a > span > div > div > div > div";

        await page.waitForSelector(nameSelector, { timeout: 3000 });

        let point = "0";
        let name = "名無し";

        const pointText = await page.evaluate((pointSelector) => {
          const points = Array.from(
            document.querySelectorAll(pointSelector),
          )[0];

          return points.innerHTML;
        }, pointSelector);

        const nameText = await page.evaluate((nameSelector) => {
          const names = Array.from(document.querySelectorAll(nameSelector));

          return names[0].innerHTML;
        }, nameSelector);

        if (pointText) {
          point = pointText;
        }

        if (nameText) {
          name = nameText;
        }

        return {
          success: true,
          point: point,
          name: name,
        };
      } catch (error) {
        this.logger.error({}, "取得失敗。仕様変更の可能性が有ります。");
        this.logger.error({}, error);
      }
    }

    return {
      success: false,
      point: "0",
      name: "取得失敗",
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
}
