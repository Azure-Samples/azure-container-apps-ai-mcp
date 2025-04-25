import EventEmitter from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './helpers/logs.js';

const log = logger('host');

export class MCPClient extends EventEmitter {
  private client: Client;
  private transport: StreamableHTTPClientTransport;

  constructor(serverName: string, serverUrl: string, accessToken?: string) {
    super();
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

    this.transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
      requestInit: {
        headers: {
          ...headers,
        },
      },
    });

    this.client.setNotificationHandler(
      ToolListChangedNotificationSchema,
      () => {
        log.info('Emitting toolListChanged event');
        this.emit('toolListChanged');
      }
    );
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
