type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogContext {
  [key: string]: unknown;
}

function serializeContext(context: LogContext | undefined): string {
  if (!context) return '';
  const keys = Object.keys(context);
  if (keys.length === 0) return '';
  return ` ${JSON.stringify(context)}`;
}

function write(level: LogLevel, route: string, message: string, context?: LogContext): void {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] [${route}] ${message}${serializeContext(context)}\n`;

  if (level === 'ERROR') {
    process.stderr.write(line);
    return;
  }
  process.stdout.write(line);
}

export interface Logger {
  error(route: string, message: string, context?: LogContext): void;
  info(route: string, message: string, context?: LogContext): void;
  warn(route: string, message: string, context?: LogContext): void;
}

export const logger: Logger = {
  info(route: string, message: string, context?: LogContext): void {
    write('INFO', route, message, context);
  },
  warn(route: string, message: string, context?: LogContext): void {
    write('WARN', route, message, context);
  },
  error(route: string, message: string, context?: LogContext): void {
    write('ERROR', route, message, context);
  }
};

