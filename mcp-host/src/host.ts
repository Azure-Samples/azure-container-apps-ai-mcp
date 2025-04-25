import { createInterface } from 'node:readline/promises';
import type { AzureOpenAI, OpenAI } from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/index.js';
import { MCPClient as MCPClientHTTP } from './client-http.js';
import { MCPClient as MCPClientSSE } from './client-see.js';
import { llm, model } from './config/providers.js';
import { MCPConfig, MCPSEEServerConfig, ZodToolType } from './config/types.js';
import { mcpToolToOpenAiToolChatCompletion } from './helpers/openai-tool-adapter.js';
import { logger } from './helpers/logs.js';

const log = logger('host');

export class MCPHost {
  private mcpClients: Array<MCPClientHTTP | MCPClientSSE> = [];
  private openAiTools: ChatCompletionTool[] = [];
  private toolsMap: { [name: string]: MCPClientHTTP | MCPClientSSE } = {};
  private servers: { serverName: string; server: MCPSEEServerConfig }[] =
    [] as any;

  private llm: AzureOpenAI | OpenAI | null = null;
  private model: string = model;
  private config: MCPConfig | undefined;
  abortController: AbortController = new AbortController();

  constructor(config?: MCPConfig) {
    if (!llm) {
      throw new Error('The LLM provider client is not initialized');
    }
    this.llm = llm;
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
        }
        else if (server.type === 'sse') {
          log.info(`Connecting to SSE server ${serverName} at ${server.url}`);
          mcp = new MCPClientSSE(serverName, server.url);
        } else {
          throw new Error(`Unsupported server type: ${server.type}`);
        }

        await mcp.connect();
        this.mcpClients.push(mcp);
        this.servers.push({ serverName, server });

        const mcpTools: ZodToolType[] = (await mcp.getAvailableTools()) || [];
        this.openAiTools = [
          ...this.openAiTools,
          ...mcpTools.map(mcpToolToOpenAiToolChatCompletion),
        ];

        this.toolsMap = {
          ...this.toolsMap,
          ...this.openAiTools.reduce((acc, tool) => {
            acc[tool.function.name] = mcp;
            return acc;
          }, {} as any),
        };
      }
      log.success('Connected to all MCP servers and loaded tools.');
    } catch (err: any) {
      log.error('Failed to connect to MCP server:', err?.cause?.code || err?.message || err);
    }
  }

  getAvailableTools() {
    return this.openAiTools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
    }));
  }

  async close() {
    for (const mcp of this.mcpClients) {
      await mcp.close();
    }
    log.info('Closed all MCP client connections.');
  }

  async query(query: string, stdout: any) {
    log.info(`Received query: ${query}`);
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'developer',
        content: `You are a helpful assistant that can use tools to answer questions. Never use markdown, reply with plain text only. 
          You have access to the following tools: ${this.openAiTools
            .map((tool) => tool.function.name)
            .join(', ')}.`,
      },
      {
        role: 'user',
        content: query,
      },
    ];

    const stopAnimation = log.thinking();

    let response = await this.llm!.chat.completions.create({
      model: this.model,
      max_tokens: 800,
      messages,
      tools: this.openAiTools,
      parallel_tool_calls: false,
    });

    stopAnimation();

    for await (const chunk of response.choices) {
      const tools = chunk?.message.tool_calls;
      const content = chunk?.message.content;
      if (content) {
        stdout.write(log.agent(content));
      }

      if (tools) {
        messages.push(chunk?.message);

        for await (const tool of tools) {
          const toolName: string = tool.function.name;
          const toolArgs: string = tool.function.arguments;
          log.info(`Using tool '${toolName}' with arguments: ${toolArgs}`);

          const mcpClient = this.toolsMap[toolName];
          if (!mcpClient) {
            log.warn(`Tool '${toolName}' not found. Skipping...`);
            return;
          }

          const result = await mcpClient.callTool(toolName, toolArgs);
          if (result.isError) {
            log.error(`Tool '${toolName}' failed: ${result.error}`);
            return;
          }

          const toolOutput = (result.content as any)[0].text;
          log.success(`Tool '${toolName}' result: ${toolOutput}`);

          messages.push({
            role: 'tool',
            tool_call_id: tool.id,
            content: toolOutput.toString(),
          });
        }

        const chat = await this.llm!.chat.completions.create({
          model: this.model,
          max_tokens: 800,
          messages,
          tools: this.openAiTools,
        });

        for await (const chunk of chat.choices) {
          const message = chunk?.message.content;
          if (message) {
            stdout.write(log.agent(message));
          }
        }
      }
    }

    stdout.write('\n');
    log.info('Query completed.');
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
        this.openAiTools.map((tool) => tool.function.name)
      );

      while (true) {
        const message = await rl.question(log.user(), { signal });
        await this.query(message, rl);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        log.info('Process aborted. Exiting...');
      }
      else {
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
