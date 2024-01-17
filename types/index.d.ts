import * as Enogu from "enogu";

export type LoggerLike = {
  info: (obj: any, ...args: any[]) => void;
  warn: (obj: any, ...args: any[]) => void;
  error: (obj: any, ...args: any[]) => void;
  createTimestamp: () => string;
};

export type EnoguLike = typeof Enogu;

export type RouterResult = {
  success: boolean;
  message: string;
};

export type PointAndNameResult = {
  success: boolean;
  point: string;
  name: string;
};

export type config = {
  logs: {
    outputPath: string;
  };
  values: {
    waitTime: number;
    entryPoint: string;
    interval: number;
  };
};
