import chalk, { ChalkInstance } from 'chalk';
import debug from 'debug';

export const logger = (namespace: string) => {
  const dbg = debug('mcp:' + namespace);
  const log = (colorize: ChalkInstance, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    const formattedArgs = [timestamp, ...args].map((arg) => {
      if (typeof arg === 'object') {
        return JSON.stringify(arg, null, 2);
      }
      return arg;
    });
    dbg(colorize(formattedArgs.join(' ')));
  };

  return {
    info(...args: any[]) {
      log(chalk.cyan, ...args);
    },
    success(...args: any[]) {
      log(chalk.green, ...args);
    },
    warn(...args: any[]) {
      log(chalk.yellow, ...args);
    },
    error(...args: any[]) {
      log(chalk.red, ...args);
    },
    user() {
      return chalk.bold.magenta(`\n User:`) + ' ';
    },
    agent(message: string) {
      return (
        chalk.bold.blue.green(`Agent:`) + ' ' + chalk.bold.blue.green(message)
      );
    },
    thinking(message = 'Agent is thinking...') {
      const delay = 100;
      const chars = ['⠙', '⠘', '⠰', '⠴', '⠤', '⠦', '⠆', '⠃', '⠋', '⠉'];
      let x = 0;
      const timer = setInterval(function () {
        process.stdout.write(
          chalk.bold.green(message + '\r' + chars[x++] + ' ')
        );
        x = x % chars.length;
      }, delay);

      return function () {
        clearInterval(timer);
        process.stdout.write(' ' + '\r' + ' '.repeat(30) + '\r');
      };
    },
  };
};
