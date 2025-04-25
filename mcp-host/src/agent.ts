import type { Interface } from 'node:readline/promises';
import OpenAI, { AzureOpenAI } from 'openai';
import type { ChatCompletionTool } from 'openai/resources/index.js';
import { ChatCompletionMessageParam } from 'openai/resources/index.js';
import type { MCPClient as MCPClientHTTP } from './client-http.js';
import type { MCPClient as MCPClientSSE } from './client-sse.js';
import { llm, model } from './config/providers.js';
import { logger } from './helpers/logs.js';
import { FunctionTool } from 'openai/resources/responses/responses.js';

const log = logger('agent');

export class TodoAgent {
  private llm: AzureOpenAI | OpenAI | null = null;
  private model: string = model;
  private toolsMap: { [name: string]: MCPClientHTTP | MCPClientSSE } = {};

  private openAiTools: ChatCompletionTool[] = [];
  constructor() {
    if (!llm) {
      throw new Error('LLM provider is not initialized');
    }
    this.llm = llm;
  }

  addTools(mcp: MCPClientHTTP | MCPClientSSE, tools: any[]) {
    this.openAiTools = [...this.openAiTools, ...tools];
    this.toolsMap = {
      ...this.toolsMap,
      ...this.openAiTools.reduce((acc, tool) => {
        acc[tool.function.name] = mcp;
        return acc;
      }, {} as any),
    };
  }

  async query(query: string, stdout: Interface) {
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

  static zodSchemaToParametersSchema(zodSchema: any): {
    type: string;
    properties: Record<string, any>;
    required: string[];
    additionalProperties: boolean;
  } {
    const properties: Record<string, any> = zodSchema.properties || {};
    const required: string[] = zodSchema.required || [];
    const additionalProperties: boolean =
      zodSchema.additionalProperties !== undefined
        ? zodSchema.additionalProperties
        : false;

    return {
      type: 'object',
      properties,
      required,
      additionalProperties,
    };
  }

  static mcpToolToOpenAiToolChatCompletion(tool: {
    name: string;
    description?: string;
    inputSchema: any;
  }): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        strict: true,
        name: tool.name,
        description: tool.description,
        parameters: {
          ...TodoAgent.zodSchemaToParametersSchema(tool.inputSchema),
        },
      },
    };
  }

  static mcpToolToOpenAiToolResponses(tool: {
    name: string;
    description?: string;
    inputSchema: any;
  }): FunctionTool {
    return {
      type: 'function',
      strict: true,
      name: tool.name,
      description: tool.description,
      parameters: {
        parameters: {
          ...TodoAgent.zodSchemaToParametersSchema(tool.inputSchema),
        },
      },
    };
  }
}
