import puppeteer from "puppeteer";
import pino from "pino";
import { createLogger } from "./createLogger";
import Yaml from "yaml";
import * as Enogu from "enogu";
import fs from "node:fs";
import { loggerMessage } from "./loggerMessage";
import { inputManager } from "./inputManager";
import { StandRakutenRouter } from "./routers/StandRakutenRouter";
import { config } from "./types";

const config: config = Yaml.parse(
  fs.readFileSync("config.yaml", "utf8").toString(),
);

const logger = createLogger(
  pino({
    level: "trace",
    transport: {
      target: "pino/file",
      options: {
        destination: config.logs.outputPath,
        mkdir: true,
      },
    },
  }),
);

const loggerMessages = new loggerMessage(Enogu);

loggerMessages.welcome();
loggerMessages.blank();

logger.info({}, "起動中...");
loggerMessages.blank();

async function main(): Promise<void> {
  loggerMessages.showOptions();
  loggerMessages.blank();

  const optionSelect = await new inputManager("Option: ").waitInput();
  loggerMessages.blank();

  switch (optionSelect.trim().substring(0, 1)) {
    case "1":
      const standRakutenRouter = new StandRakutenRouter(
        logger,
        Enogu,
        loggerMessages,
        config,
      );

      await standRakutenRouter.start();

      break;
    case "2":
      logger.info({}, "Comoboファイル ポイントチェック");
      loggerMessages.blank();
      break;
    case "3":
      logger.info({}, "終了します");
      loggerMessages.blank();
      process.exit(0);
    default:
      logger.warn(
        {},
        "入力値が正しくありません。 (1/2/3) を入力してください",
      );
      loggerMessages.blank();
      return await main();
  }
}

main();
