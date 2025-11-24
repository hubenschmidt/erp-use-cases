interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: unknown;
}

let configured = false;

export const configureLogging = (): void => {
  if (configured) return;
  configured = true;

  // Override console methods for structured JSON output
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  const formatLog = (level: string, args: unknown[]): string => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '),
    };

    // If first arg is already a JSON object, merge it
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      return JSON.stringify({ ...entry, ...args[0] });
    }

    return JSON.stringify(entry);
  };

  console.log = (...args: unknown[]) => {
    originalLog(formatLog('info', args));
  };

  console.error = (...args: unknown[]) => {
    originalError(formatLog('error', args));
  };

  console.warn = (...args: unknown[]) => {
    originalWarn(formatLog('warn', args));
  };

  console.info = (...args: unknown[]) => {
    originalInfo(formatLog('info', args));
  };
};

export const createLogger = (name: string) => ({
  info: (message: string, data?: unknown) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      logger: name,
      level: 'info',
      message,
      ...(data ? { data } : {}),
    }));
  },
  error: (message: string, data?: unknown) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      logger: name,
      level: 'error',
      message,
      ...(data ? { data } : {}),
    }));
  },
  warn: (message: string, data?: unknown) => {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      logger: name,
      level: 'warn',
      message,
      ...(data ? { data } : {}),
    }));
  },
});
