import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';
const envLogLevel = process.env.LOG_LEVEL?.toLowerCase();
const defaultLevel: pino.Level = isDev ? 'debug' : 'info';
const logLevel: pino.Level = (
  ['fatal', 'error', 'warn', 'info', 'debug', 'trace'].includes(envLogLevel || '')
    ? envLogLevel
    : defaultLevel
) as pino.Level;

function createLogger(): pino.Logger {
  if (isDev) {
    // Development mode: Pretty printing with colors to terminal
    return pino({
      level: logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  // Production or other configurations:
  // Structured JSON format, routing info/warn/debug to stdout and error/fatal to stderr
  const streams: pino.StreamEntry[] = [
    {
      level: logLevel,
      stream: process.stdout,
    },
    {
      level: 'error',
      stream: process.stderr,
    },
  ];

  return pino(
    {
      level: logLevel,
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.multistream(streams, { dedupe: true })
  );
}

export const logger = createLogger();
export default logger;

