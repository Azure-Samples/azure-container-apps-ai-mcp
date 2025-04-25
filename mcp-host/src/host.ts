import { createInterface } from 'node:readline/promises';
import { TodoAgent } from './agent.js';
import { MCPClient as MCPClientHTTP } from './client-http.js';
import { MCPClient as MCPClientSSE } from './client-sse.js';
import { MCPConfig, MCPSEEServerConfig, ZodToolType } from './config/types.js';
import { logger } from './helpers/logs.js';

const log = logger('host');

export class MCPHost {
  private mcpClients: Array<MCPClientHTTP | MCPClientSSE> = [];
  private servers: { serverName: string; server: MCPSEEServerConfig }[] =
    [] as any;

  private agent: TodoAgent = new TodoAgent();
  private config: MCPConfig | undefined;
  private abortController: AbortController = new AbortController();

  constructor(config?: MCPConfig) {
    this.config = config;

    process.stdin.setEncoding('utf8');
    process.on('SIGINT', () => {
      this.abortController.abort();
    });
  }

  async connect() {
    try {
      for (const serverName in this.config?.servers) {
        const server = this.config?.servers[serverName];
        let mcp: MCPClientHTTP | MCPClientSSE;

        if (server.type === 'http') {
          log.info(`Connecting to HTTP server ${serverName} at ${server.url}`);
          mcp = new MCPClientHTTP(serverName, server.url);
        } else if (server.type === 'sse') {
          log.info(`Connecting to SSE server ${serverName} at ${server.url}`);
          mcp = new MCPClientSSE(serverName, server.url);
        } else {
          throw new Error(`Unsupported server type: ${server.type}`);
        }

        await mcp.connect();
        this.mcpClients.push(mcp);
        this.servers.push({ serverName, server });

        const mcpTools: ZodToolType[] = (await mcp.getAvailableTools()) || [];
        this.agent.appendTools(mcp, mcpTools);
      }
      log.success('Connected to all MCP servers and loaded tools.');
    } catch (err: any) {
      log.error(
        'Failed to connect to MCP server:',
        err?.cause?.code || err?.message || err
      );
    }
  }

  getAvailableTools() {
    return this.agent.getTools();
  }

  async close() {
    for (const mcp of this.mcpClients) {
      await mcp.close();
    }
    log.info('Closed all MCP client connections.');
  }

  async run() {
    const signal = this.abortController.signal;
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      log.success('MCP Host Started!');
      log.info('Connected to the following servers:', this.servers);
      log.info(
        'Available tools:',
        this.agent.getTools().map((tool) => tool.name)
      );

      while (true) {
        const message = await rl.question(log.user(), { signal });
        for await (const response of this.agent.query(message)) {
          rl.write(log.agent(response));
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        log.info('Process aborted. Exiting...');
      } else {
        log.error('Error:', err?.cause?.code || err?.message || err);
      }
    } finally {
      rl.close();
      await this.close();
      log.info('MCP Host closed.');
      process.exit(0);
    }
  }
}
