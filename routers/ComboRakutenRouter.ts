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

    const comboFilePath = (
      await new inputManager(
        "Comboファイルのパスを入力してください: ",
      ).waitInput()
    ).trim();

    const resultFilePath = (
      await new inputManager("結果の出力パスを入力してください: ").waitInput()
    ).trim();
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
        const splitLine = content[i].replace("://", "_split_web_").split(":");
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
      for (let i = 0, len = comboResult.length; i < len; i++) {
        this.logger.info(
          {},
          `(${i + 1}/${len}) ${comboResult[i].username}:${comboResult[i].password} の解析中・・・`,
        );
        // new StandRakutenRouter(
        //   this.logger,
        //   this.enogu,
        //   this.loggerMessages,
        //   this.config,
        // )
        //   .check(comboResult[i].username, comboResult[i].password)
        //   .then((result) => {
        //     if (!JSON.parse(result.message).success) {
        //       return;
        //     }

        //     this.logger.info(
        //       {},
        //       `(${i + 1}/${len}) ${comboResult[i].username}:${comboResult[i].password} の解析完了`,
        //     );
        //     this.logger.info(
        //       {},
        //       `(${i + 1}/${len}) ${comboResult[i].username}:${comboResult[i].password} ポイント: ${JSON.parse(result.message).point}`,
        //     );

        //     fs.appendFileSync(
        //       resultFilePath,
        //       `${comboResult[i].username ?? "unknown"}:${comboResult[i].password ?? "unknown"}:${JSON.parse(result.message).point}`.replace(
        //         /\n/gm,
        //         "",
        //       ) + "\n",
        //     );
          // });

        const result = await new StandRakutenRouter(
          this.logger,
          this.enogu,
          this.loggerMessages,
          this.config,
        ).check(comboResult[i].username, comboResult[i].password);

        if (!JSON.parse(result.message).success) {
          return;
        }

        this.logger.info(
          {},
          `(${i + 1}/${len}) ${comboResult[i].username}:${comboResult[i].password} の解析完了`,
        )

        fs.appendFileSync(
          resultFilePath,
          `${comboResult[i].username ?? "unknown"}:${comboResult[i].password ?? "unknown"}:${JSON.parse(result.message).point}:${JSON.parse(result.message).some.map((some) => `${some.value}`).join(":")}`.replace(
            /\n/gm,
            "",
          )
        )
      }

    } else {
      this.logger.error({}, "正しいファイルパスを入力してください");
      return;
    }
  }
}
