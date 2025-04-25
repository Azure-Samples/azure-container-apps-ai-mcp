import OpenAI, { AzureOpenAI } from 'openai';
import type { ChatCompletionTool } from 'openai/resources/index.js';
import { ChatCompletionMessageParam } from 'openai/resources/index.js';
import {
  FunctionTool,
  ResponseItem,
  ResponseOutputText,
} from 'openai/resources/responses/responses.js';
import type { MCPClient as MCPClientHTTP } from './client-http.js';
import type { MCPClient as MCPClientSSE } from './client-sse.js';
import { isGitHubModels, llm, model } from './config/providers.js';
import { ZodToolType as ZodTool } from './config/types.js';
import { logger } from './helpers/logs.js';

const log = logger('agent');

export class TodoAgent {
  private llm: AzureOpenAI | OpenAI | null = null;
  private model: string = model;
  private toolsByClient: { [name: string]: MCPClientHTTP | MCPClientSSE } = {};

  private mcpTools: Array<ZodTool> = [];
  constructor() {
    if (!llm) {
      throw new Error('LLM provider is not initialized');
    }
    this.llm = llm;
  }

  getTools() {
    return this.mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
    }));
  }

  appendTools(mcp: MCPClientHTTP | MCPClientSSE, mcpTools: ZodTool[]) {
    this.mcpTools = [...this.mcpTools, ...mcpTools];
    this.toolsByClient = {
      ...this.toolsByClient,
      ...this.mcpTools.reduce((acc, tool) => {
        acc[tool.name] = mcp;
        return acc;
      }, {} as any),
    };
  }

  async *query(query: string) {
    if (!!isGitHubModels) {
      yield* this.queryChatCompletion(query);
    } else {
      yield* this.queryResponseAPI(query);
    }
  }

  private async *queryChatCompletion(query: string) {
    log.warn(`Processing user query using the Chat Completion API`);

    log.info(`User query: ${query}`);
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'developer',
        content: `You are a helpful assistant that can use tools to answer questions. Never use markdown, reply with plain text only. 
          You have access to the following tools: ${this.mcpTools
            .map((tool) => `${tool.name}: ${tool.description}`)
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
      tools: this.mcpTools.map(TodoAgent.mcpToolToOpenAiToolChatCompletion),
      parallel_tool_calls: false,
    });

    stopAnimation();

    for await (const chunk of response.choices) {
      const tools = chunk?.message.tool_calls;
      const content = chunk?.message.content;
      if (content) {
        yield log.agent(content);
      }

      if (tools) {
        messages.push(chunk?.message);

        for await (const tool of tools) {
          const toolName: string = tool.function.name;
          const toolArgs: string = tool.function.arguments;
          log.info(`Using tool '${toolName}' with arguments: ${toolArgs}`);

          const mcpClient = this.toolsByClient[toolName];
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
          tools: this.mcpTools.map(TodoAgent.mcpToolToOpenAiToolChatCompletion),
        });

        for await (const chunk of chat.choices) {
          const message = chunk?.message.content;
          if (message) {
            yield log.agent(message);
          }
        }
      }
    }

    yield '\n';
    log.info('Query completed.');
  }

  private async *queryResponseAPI(query: string) {
    log.warn(`Processing user query using the Responses API`);

    log.info(`User query: ${query}`);

    const messages: ResponseItem[] = [];

    const stopAnimation = log.thinking();

    let response = await this.llm!.responses.create({
      model: this.model,
      instructions: `You are a helpful assistant that can use tools to answer questions. Never use markdown, reply with plain text only. 
          You have access to the following tools: ${this.mcpTools
            .map((tool) => `${tool.name}: ${tool.description}`)
            .join(', ')}.`,
      input: query,
      tools: this.mcpTools.map(TodoAgent.mcpToolToOpenAiToolResponses),
      parallel_tool_calls: false,
    });

    stopAnimation();

    for (const chunk of response.output) {
      if (chunk.type === 'message') {
        yield log.agent((chunk.content[0] as ResponseOutputText).text);
      }

      if (chunk.type === 'function_call') {
        messages.push(chunk as ResponseItem);
        const toolName: string = chunk.name;
        const toolArgs: string = chunk.arguments;
        log.info(`Using tool '${toolName}' with arguments: ${toolArgs}`);

        const mcpClient = this.toolsByClient[toolName];
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
      }

      const chat = await this.llm!.responses.create({
        model: this.model,
        input: messages,
        previous_response_id: response.id,
        tools: this.mcpTools.map(TodoAgent.mcpToolToOpenAiToolResponses),
      });

      for await (const chunk of chat.output) {
        if (chunk.type === 'message') {
          yield log.agent((chunk.content[0] as ResponseOutputText).text);
        }
      }
    }

    yield '\n';
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
        ...TodoAgent.zodSchemaToParametersSchema(tool.inputSchema),
      },
    };
  }
}
