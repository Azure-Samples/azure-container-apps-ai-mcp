import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport';
import { logger } from './helpers/logs.js';

const log = logger('host');

export class MCPClient {
  private client: Client;
  private tools: Array<any> = [];
  private transport: Transport;

  constructor(serverName: string, serverUrl: string, accessToken?: string) {
    this.client = new Client({
      name: 'mcp-client-' + serverName,
      version: '1.0.0',
    });

    let headers = {};

    if (accessToken) {
      headers = {
        Authorization: 'Bearer ' + accessToken,
      };
    }

    this.transport = new SSEClientTransport(new URL(serverUrl), {
      requestInit: {
        headers: {
          ...headers,
        },
      },
    });
  }
  async connect() {
    await this.client.connect(this.transport);
    log.success('Connected to server');
  }

  async getAvailableTools() {
    const result = await this.client.listTools();
    return result.tools;
  }

  async callTool(name: string, toolArgs: string) {
    log.info(`Calling tool ${name} with arguments:`, toolArgs);

    return await this.client.callTool({
      name,
      arguments: JSON.parse(toolArgs),
    });
  }

  async close() {
    log.info('Closing transport...');
    await this.transport.close();
  }
}
