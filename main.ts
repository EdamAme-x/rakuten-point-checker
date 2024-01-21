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
import { ComboRakutenRouter } from "./routers/ComboRakutenRouter";

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

  const withProxy =
    (
      await new inputManager(
        "Do you want to use the Proxy? (y/N): ",
      ).waitInput()
    ).toUpperCase() === "Y";
  loggerMessages.blank();

  const proxyContent: string[] = [];

  if (withProxy) {
    logger.info({}, "Proxyを使用します");
    loggerMessages.blank();

    const proxyPlace = (
      await new inputManager(
        "ProxyFileのパスを入力してください: ",
      ).waitInput()
    ).trim();

    if (!fs.existsSync(proxyPlace)) {
      logger.error({}, "ProxyFileのパスが正しくありません");
      loggerMessages.blank();
      return await main();
    } else {
      const content = fs
        .readFileSync(proxyPlace, "utf8")
        .toString()
        .split("\n");

      for (let i = 0, len = content.length; i < len; i++) {
        try {
          new URL(content[i]);
          proxyContent.push(content[i]);
        } catch (_e) {
          logger.warn({}, "形式の違うProxyをスキップしました。");
        }
      }
    }
  }

  if (proxyContent.length < 1 && withProxy) {
    logger.error({}, "ProxyFileが空です。");
    loggerMessages.blank();
    return await main();
  }

  switch (optionSelect.trim().substring(0, 1)) {
    case "1":
      const standRakutenRouter = new StandRakutenRouter(
        logger,
        Enogu,
        loggerMessages,
        config,
      );

      await standRakutenRouter.start(withProxy, proxyContent);

      break;
    case "2":
      const comboRakutenRouter = new ComboRakutenRouter(
        logger,
        Enogu,
        loggerMessages,
        config,
      );

      await comboRakutenRouter.start(withProxy, proxyContent);
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

  const yOrN = await new inputManager("続行しますか? (y/N): ").waitInput();

  if (yOrN.toUpperCase() === "N") {
    process.exit(0);
  }

  return await main();
}

main();
