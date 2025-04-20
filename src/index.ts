import { MCPHost } from "./host.js";
import { config } from "./config.js";

async function main() {
  const host = new MCPHost();
  try {
    await host.addServers(config);
    await host.run();
  } finally {
    await host.cleanup();
    process.exit(0);
  }
}

main();
