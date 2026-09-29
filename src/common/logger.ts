import pino, { stdTimeFunctions } from 'pino';

const pinoConfig: any = {
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
  enabled: true,
  timestamp: stdTimeFunctions.isoTime,
  browser: {
    asObject: true,
  },
};

const logger = pino(pinoConfig);

export default logger;
