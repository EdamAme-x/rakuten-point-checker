import pino from 'pino';

export function createLogger(pinoInstance: pino.Logger) {
    const createTimestamp = () => `\x1b[90m[${new Date().toLocaleTimeString()}]\x1b[0m`;

    return new Proxy({
        info: (obj: any, ...args: any[]) => {
            pinoInstance.info(obj, ...args);
            return console.info(`${createTimestamp()} \x1b[32m[INFO]\x1b[0m`, ...args);
        },
        warn: (obj: any, ...args: any[]) => {
            pinoInstance.warn(obj, ...args);
            return console.warn(`${createTimestamp()} \x1b[33m[WARN]\x1b[0m`, ...args);
        },
        error: (obj: any, ...args: any[]) => {
            pinoInstance.error(obj, ...args);
            return console.error(`${createTimestamp()} \x1b[31m[ERROR]\x1b[0m`, ...args);
        },
        createTimestamp
    }, {
        get(target, name) {
            if (typeof target[name] === 'function') {
                return target[name].bind(target);
            }
            return target[name];
        }
    })
}