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
    const message = `${timestamp} ${formattedMessage}`;
    dbg(message);
  }

  return {
    info(message: string, ...args: any[]) {
      log(chalk.blue(`${message}`), ...args);
    },
    success(message: string, ...args: any[]) {
      log(chalk.green(`${message}`), ...args);
    },
    warn(message: string, ...args: any[]) {
      log(chalk.yellow(`${message}`), ...args);
    },
    error(message: string, ...args: any[]) {
      log(chalk.red(`${message}`), ...args);
    },
    user(message?: string) {
      return chalk.magenta(`${message ?? '>>>'} `);
    },
    agent(message: string) {
      return chalk.blue(`Agent: ${message}`) + '\n';
    },
    thinking(message = 'Agent is thinking...') {
      const delay = 100;
      const chars = ['⠙', '⠘', '⠰', '⠴', '⠤', '⠦', '⠆', '⠃', '⠋', '⠉'];
      let x = 0;
      const timer = setInterval(function () {
        process.stdout.write(chalk.blue('\r' + chars[x++] + ' ' + message));
        x = x % chars.length;
      }, delay);

      return function () {
        clearInterval(timer);
        process.stdout.write('\r' + ' '.repeat(30) + '\r');
      };
    },
  };
};