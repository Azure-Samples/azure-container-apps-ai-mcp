process.env.DEBUG = 'mcp:*';

import dotenv from 'dotenv';
dotenv.config();

import { MCPConfig } from './config/types.js';
import { MCPHost } from './host.js';
import chalk from 'chalk';

const config: MCPConfig = {
  servers: {
    'mcp-todo-http': {
      type: 'http',
      url: process.env.MCP_SERVER_HTTP_URL ?? 'http://localhost:3000/mcp',
    },
    'mcp-todo-sse': {
      type: 'sse',
      url: process.env.MCP_SERVER_SSE_URL ?? 'http://localhost:3001/sse',
    },
  },
};
const host = new MCPHost(config);

try {
  await host.connect();
  console.log('Welcome to the Model Context Protocol (MCP) Host!');
  console.log(
    'This is a host that connects to MCP servers (using Streamable HTTP).'
  );
  console.log('Available tools from MCP servers:');
  host.getAvailableTools().forEach((tool) => {
    console.log(chalk.green(`- ${tool.name}`));
  });
  await host.run();
} finally {
  await host.close();
  process.exit(0);
}
