import { formatWithOptions } from "node:util";

export function stdout() {
  let lastMessageLength = 0;
  return function write(value: any) {
    process.stdout.cursorTo(0);
    process.stdout.moveCursor(0, -Math.floor((lastMessageLength - 1) / process.stdout.columns));
    lastMessageLength = formatWithOptions({ colors: false, breakLength: Infinity }, value).length;
    process.stdout.write(formatWithOptions({ colors: true, breakLength: Infinity }, value));
  };
}