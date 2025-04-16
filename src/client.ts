import { AzureCliCredential, DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport";
import dotenv from "dotenv";
import { AzureOpenAI, OpenAI } from "openai";
import { z } from "zod"; // Import zod for schema validation
import { openAiToolAdapter } from "./helpers/openai-tool-adapter";
dotenv.config();

// You will need to set these environment variables or edit the following values
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const endpoint =
  process.env["AZURE_OPENAI_ENDPOINT"] as string;
const apiVersion = "2025-01-01-preview";
const deployment = "gpt-4o";
let client: AzureOpenAI | OpenAI | null = null;

if (OPENAI_API_KEY && endpoint) {
  throw new Error(
    "You cannot set both OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT. Please use one or the other."
  );
}

if (OPENAI_API_KEY && !endpoint) {
  console.log("Using OpenAI API Key");
  // Initialize the OpenAI client with API Key
  client = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });
}
else if (!OPENAI_API_KEY && endpoint) {
  // Initialize the AzureOpenAI client with Entra ID (Azure AD) authentication (keyless)
  console.log("Using Azure OpenAI Keyless authentication");
  
  // Initialize the DefaultAzureCredential
  const credential = new DefaultAzureCredential();
  const scope = "https://cognitiveservices.azure.com/.default";
  const azureADTokenProvider = getBearerTokenProvider(credential, scope);
  client = new AzureOpenAI({
    endpoint,
    azureADTokenProvider,
    apiVersion,
    deployment,
  });
}

class MCPClient {
  private mcp: Client;
  private openai: AzureOpenAI | OpenAI;
  private tools: Array<any> = [];
  private transport: Transport | null = null;

  constructor() {
    if (!client) {
      throw new Error("OpenAI client is not initialized");
    }
    this.openai = client;
    this.mcp = new Client({ name: "azure-mcp-client", version: "1.0.0" });
  }

  async connectToServer(serverUrl: string) {
    try {
      this.transport = new SSEClientTransport(new URL(serverUrl));
      await this.mcp.connect(this.transport);

      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => {
        return openAiToolAdapter({
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        });
      });
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async processQuery(query: string) {
    const messages: any[] = [
      {
        role: "user",
        content: query
      },
    ];

    console.log("Tools: ", JSON.stringify(this.tools, null, 2));

    let response = await this.openai.chat.completions.create({
      model: deployment,
      max_tokens: 800,
      messages,
      tools: this.tools,
    });

    const finalText: string[] = [];
    const toolResults: any[] = [];

    console.log(
      "Response from OpenAI: ",
      JSON.stringify(response.choices, null, 2)
    );
    response.choices.map(async (choice) => {
      const message = choice.message;
      if (message.tool_calls) {
        toolResults.push(
          await this.callTools(message.tool_calls, toolResults, finalText)
        );
      } else {
        finalText.push(message.content || "xx");
      }
    });

    response = await this.openai.chat.completions.create({
      model: deployment,
      max_tokens: 800,
      messages,
    });

    finalText.push(response.choices[0].message.content || "??");

    return finalText.join("\n");
  }
  async callTools(
    tool_calls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
    toolResults: any[],
    finalText: string[]
  ) {
    for (const tool_call of tool_calls) {
      const toolName = tool_call.function.name;
      const args = tool_call.function.arguments;

      console.log(`Calling tool ${toolName} with args ${JSON.stringify(args)}`);

      const toolResult = await this.mcp.callTool({
        name: toolName,
        arguments: JSON.parse(args),
      });
      toolResults.push({
        name: toolName,
        result: toolResult,
      });
      finalText.push(
        `[Calling tool ${toolName} with args ${JSON.stringify(args)}]`
      );
    }
  }
  async cleanup() {
    await this.mcp.close();
  }
}

const mcpClient = new MCPClient();
await mcpClient.connectToServer("http://localhost:4321/sse");
console.log("Connected to MCP server");

const query = "What is the sum of 2 and 3?";
const result = await mcpClient.processQuery(query);
console.log("Final result: ", result);

await mcpClient.cleanup();
