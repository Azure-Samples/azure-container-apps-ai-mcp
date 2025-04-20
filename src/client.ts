import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import dotenv from "dotenv";
dotenv.config();

import type { Transport } from "@modelcontextprotocol/sdk/shared/transport";
import { mcpToolToOpenAiToolChatCompletion } from "./helpers/openai-tool-adapter.js";
import type { ChatCompletionTool } from "openai/resources/index.js";

export type MCPSEEServerConfig = {
  type: "sse";
  url: string;
};

export type MCPServerType = {
  [name: string]: MCPSEEServerConfig;
};

export type MCPConfig = {
  servers: MCPServerType;
};

export class MCPClient {
  private mcp: Client;
  private tools: Array<any> = [];
  private transport: Transport | null = null;

  constructor(serverName: string) {
    this.mcp = new Client({
      name: `mcp-client-${serverName}`,
      version: "1.0.0",
    });
  }
  async connectToServer(serverConfig: MCPSEEServerConfig) {
    try {
      if (serverConfig.type && serverConfig.type === "sse") {
        this.transport = new SSEClientTransport(new URL(serverConfig.url));
        await this.mcp.connect(this.transport);
      } else {
        throw new Error(
          "Invalid server configuration. Expected a 'SSEClientTransport' configuration."
        );
      }
    } catch (err) {
      console.log("Failed to connect to MCP server: ", err);
      throw err;
    }
  }

  async getTools(): Promise<ChatCompletionTool[]> {
    const { tools } = await this.mcp.listTools();
    this.tools = tools.map((tool) => {
      const { name, description, inputSchema } = tool;
      return mcpToolToOpenAiToolChatCompletion({
        name,
        description,
        inputSchema,
      });
    });
    return this.tools as ChatCompletionTool[];
  }

  async callTool(name: string, args?: string) {
    const opts: { name: string; arguments?: { [key: string]: string } } = {
      name,
    };

    if (args) {
      opts.arguments = JSON.parse(args);
    }

    return await this.mcp.callTool(opts);
  }
  async cleanup() {
    await this.mcp.close();
  }
}
