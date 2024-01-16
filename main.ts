import puppeteer from "puppeteer";
import pino from "pino";
import { createLogger } from "./createLogger";
import Yaml from "yaml";
import fs from "node:fs";

const config: {
    logs: {
        outputPath: string;
    };
} = Yaml.parse(fs.readFileSync("config.yaml", "utf8").toString());

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
