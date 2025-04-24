import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import EventEmitter from 'node:events';
import { logger } from './helpers/logs';

const log = logger('host');

export class MCPClient extends EventEmitter {
  private client: Client;
  private transport: StreamableHTTPClientTransport;

  constructor(serverName: string, serverUrl: string, apikey?: string) {
    super();
    this.client = new Client({
      name: 'mcp-client-' + serverName,
      version: '1.0.0',
    });

    let headers = {};

    if (apikey) {
      headers = {
        Authorization: 'Bearer ' + apikey,
      };
    }

    log.info('Connecting to MCP server %s at %s', serverName, serverUrl);

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
    log.info('Connecting transport to server...');
    await this.client.connect(this.transport);
    log.info('Connected to server');
  }

  async getAvailableTools() {
    const result = await this.client.listTools();
    return result.tools;
  }

  async callTool(name: string, toolArgs: string) {
    log.info('Calling tool %s with args %s', name, toolArgs);

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
