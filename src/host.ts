import { createInterface } from "node:readline/promises";
import type { OpenAI, AzureOpenAI } from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/index.js";
import { MCPClient, MCPConfig, MCPSEEServerConfig } from "./client.js";
import { think } from "./helpers/console-think.js";
import { client, model } from "./helpers/providers.js";

export class MCPHost {
  private mcpClients: MCPClient[] = [];
  private tools: ChatCompletionTool[] = [];
  private toolsMap: { [name: string]: MCPClient } = {};
  private servers: { serverName: string; server: MCPSEEServerConfig }[] =
    [] as any;

  private llm: AzureOpenAI | OpenAI | null = null;
  private model: string = model;

  constructor() {
    if (!client) {
      throw new Error("The LLM provider client is not initialized");
    }
    this.llm = client;
  }

  async addServers(config: MCPConfig) {
    try {
      for (const serverName in config.servers) {
        const mcp = new MCPClient(serverName);
        const server = config.servers[serverName];
        await mcp.connectToServer(server);
        this.mcpClients.push(mcp);
        this.servers.push({ serverName, server });

        const tools: any[] = await mcp.getTools();
        this.tools = [...this.tools, ...tools];

        this.toolsMap = {
          ...this.toolsMap,
          ...tools.reduce((acc, tool) => {
            acc[tool.function.name] = mcp;
            return acc;
          }, {} as any),
        };
      }
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async cleanup() {
    for (const mcp of this.mcpClients) {
      await mcp.cleanup();
    }
  }

  async query(query: string, stdout: any) {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are a helpful assistant that can use tools to answer questions. You have access to the following tools: ${this.tools
          .map((tool) => tool.function.name)
          .join(", ")}.`,
      },
      {
        role: "user",
        content: query,
      },
    ];

    let stream = await this.llm!.chat.completions.create({
      model: this.model,
      max_tokens: 800,
      messages,
      tools: this.tools,
      parallel_tool_calls: false,
    });

    stdout.write("Agent:\n");

    for await (const chunk of stream.choices) {
      const tools = chunk?.message.tool_calls;
      const content = chunk?.message.content;
      if (content) {
        stdout.write(content);
      }

      if (tools) {
        messages.push(chunk?.message);

        for await (const tool of tools) {

          const toolName: string = tool.function.name;
          const toolArgs: string = tool.function.arguments;
          think(
            `Using tool "${toolName}" with args ${JSON.stringify(toolArgs)}`
          );

          const mcpClient = this.toolsMap[toolName];
          if (!mcpClient) {
            think(`Tool "${toolName}" not found. Skipping...`);
            return;
          }
          
          const result = await mcpClient.callTool(toolName, toolArgs);
          if (result.isError) {
            think(`Tool "${toolName}" failed: ${result.error}`);
            return;
          }

          const toolOutput = (result.content as any)[0].text;
          think(`Tool ${toolName} result: ${toolOutput}`);

          messages.push({
            role: "tool",
            tool_call_id: tool.id,
            content: toolOutput.toString(),
          });
        }
        
        const chat = await this.llm!.chat.completions.create({
          model: this.model,
          max_tokens: 800,
          messages,
          tools: this.tools,
        });
        think(chat.choices[0].message.content);
    
        stdout.write("\n");
        stdout.write("Agent:\n");
        for await (const chunk of chat.choices) {
          const message = chunk?.message.content;
          if (message) {
            stdout.write(message);
          }
        }
      }
    }

    stdout.write("\n");
  }

  async run() {
    process.stdin.setEncoding("utf8");
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log("\nMCP Host Started!");
      console.log("Connected to the following servers:");
      this.servers.forEach(({ serverName, server }) => {
        console.log(`* ${serverName}: ${server.url}`);
      });
      console.log("Available tools:");
      this.tools.forEach((tool) => {
        console.log(`- ${tool.function.name}: ${tool.function.description}`);
      });

      while (true) {
        const message = await rl.question("\nQuery: ");
        await this.query(message, rl);
      }
    } catch (err) {
      console.error({ err });
    } finally {
      rl.close();
    }
  }
}
