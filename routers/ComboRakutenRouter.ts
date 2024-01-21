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
    this.logger.info({}, "Combo楽天垢 ポイントチェック");
    this.logger.info({}, "Crtl + C で終了");
    this.loggerMessages.blank();

    this.loggerMessages.showComboOptions();
    this.loggerMessages.blank();

    const option = (await new inputManager("Option: ").waitInput()).trim();

    if (option !== "1" && option !== "2") {
      return;
    }

    let comboFilePath = "";
    let resultFilePath = "";

    if (option === "1") {
      comboFilePath = (
        await new inputManager(
          "Comboファイルのパスを入力してください: ",
        ).waitInput()
      ).trim();

      resultFilePath = await new inputManager(
        "結果の出力パスを入力してください: ",
      ).waitInput();
    } else {
      comboFilePath = (
        await new inputManager(
          "Comboファイルのパスを入力してください: ",
        ).waitInput()
      ).trim();

      const fileName = comboFilePath.substring(
        comboFilePath.lastIndexOf("/") + 1,
      );
      const filePathWithoutFileName = comboFilePath.substring(
        0,
        comboFilePath.lastIndexOf("/"),
      );

      resultFilePath = `${filePathWithoutFileName}/${fileName}_result_${Date.now()}.txt`;
    }

    this.loggerMessages.blank();

    if (/^\S+$/.test(resultFilePath)) {
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

    if (/^\S+$/.test(comboFilePath) && fs.existsSync(comboFilePath)) {
      const content = fs
        .readFileSync(comboFilePath, { encoding: "utf-8" })
        .split("\n");
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

      this.logger.info({}, `${content.length}件のComboを解析中・・・`);

      for (let i = 0, len = content.length; i < len; i++) {
        const splitLine = content[i]
          .replace("://", "_split_web_")
          .trim()
          .replace(/\s/g, ":")
          .split(":");
        const url = splitLine[0];
        if (!url.includes("rakuten") || splitLine.length < 3) {
          this.logger.warn({}, "形式が違うComboがスキップされました。");
          continue;
        }

        splitLine.shift();
        const username = splitLine[0].trim();
        splitLine.shift();
        const password = splitLine.join(":").trim();
        comboResult.push({
          username,
          password,
        });
      }

      let alreadyChecked: string[] = [];

      for (let i = 0, len = comboResult.length; i < len; i++) {
        if (alreadyChecked.includes(comboResult[i].username)) {
          this.logger.info(
            {},
            `(${i + 1}/${len}) ${comboResult[i].username} は既に解析済みの為スキップされました。`,
          );
          continue;
        }

        this.logger.info(
          {},
          `(${i + 1}/${len}) ${comboResult[i].username}:${comboResult[i].password} の解析中・・・`,
        );

        const result = await new StandRakutenRouter(
          this.logger,
          this.enogu,
          this.loggerMessages,
          this.config,
        ).check(comboResult[i].username, comboResult[i].password);

        alreadyChecked.push(comboResult[i].username);

        try {
          JSON.parse(result.message);

          if (!result.success) {
            continue;
          }
        } catch (_e) {
          continue;
        }

        this.logger.info(
          {},
          `(${i + 1}/${len}) ${comboResult[i].username}:${comboResult[i].password} の解析完了`,
        );

        fs.appendFileSync(
          resultFilePath,
          `${comboResult[i].username ?? "unknown"}:${comboResult[i].password ?? "unknown"}:${JSON.parse(result.message).point}:${JSON.parse(
            result.message,
          )
            .some.map((some) => `${some.value}`)
            .join(":")}`.replace(/\n/gm, "") + "\n",
        );

        await wait(this.config.values.waitTime / 3);
      }
    } else {
      this.logger.error({}, "正しいファイルパスを入力してください");
      return;
    }
  }
}
