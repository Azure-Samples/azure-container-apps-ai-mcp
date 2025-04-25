import chalk from 'chalk';
import debug from 'debug';

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
    dbg(chalk.dim.yellow(message));
  };

  return {
    info(message: string, ...args: any[]) {
      log(chalk.dim.yellow(`${message}`), ...args);
    },
    success(message: string, ...args: any[]) {
      log(chalk.dim.yellow(`${message}`), ...args);
    },
    warn(message: string, ...args: any[]) {
      log(chalk.dim.yellow(`${message}`), ...args);
    },
    error(message: string, ...args: any[]) {
      log(chalk.dim.yellow(`${message}`), ...args);
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
        process.stdout.write(' '+ '\r' + ' '.repeat(30) + '\r');
      };
    },
  };
};
