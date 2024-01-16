import puppeteer from "puppeteer";
import pino from "pino";
import { createLogger } from "./createLogger";
import { Parser as yamlParser } from "yaml/dist/parse/parser";
import fs from "node:fs";

const configGenerator = new yamlParser().parse(fs.readFileSync("./config.yaml").toString());

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
