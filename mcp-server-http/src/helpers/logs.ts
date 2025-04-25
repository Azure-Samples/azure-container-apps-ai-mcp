import chalk from 'chalk';
import debug from 'debug';

debug.enable('mcp:*');

export const logger = (namespace: string) => {
  const dbg = debug('mcp:' + namespace);
  const log = (...args: any[]) => {
    // add timestamp to the log
    const timestamp = new Date().toISOString();
    const formattedArgs = args.map((arg) => {
      if (typeof arg === 'object') {
        return JSON.stringify(arg, null, 2);
      }
      return arg;
    });
    const formattedMessage = formattedArgs.join(' ');
    const message = `${chalk.gray(timestamp)} ${formattedMessage}`;
    dbg(message);
  };

  return {
    info(message: string, ...args: any[]) {
      log(chalk.gray(`${message}`), ...args);
    },
    success(message: string, ...args: any[]) {
      log(chalk.gray(`${message}`), ...args);
    },
    warn(message: string, ...args: any[]) {
      log(chalk.gray(`${message}`), ...args);
    },
    error(message: string, ...args: any[]) {
      log(chalk.gray(`${message}`), ...args);
    },
  };
};
