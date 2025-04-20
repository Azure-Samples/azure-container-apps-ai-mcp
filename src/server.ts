import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import dotenv from "dotenv";
import express from "express";
import { z } from "zod";
dotenv.config();

const app = express();

const server = new McpServer(
  {
    name: "mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);
let transport: SSEServerTransport | null = null;

app.get("/sse", (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  server.connect(transport);
});

app.post("/messages", (req, res) => {
  if (transport) {
    transport.handlePostMessage(req, res);
  }
});

server.tool(
  "calculate_sum",
  "Calculate the sum of two numbers",
  {
    a: z.number(),
    b: z.number(),
  },
  async (args) => {
    console.log("Received request to calculate sum:", { args });
    return await Promise.resolve({
      content: [
        {
          type: "text",
          text: `The sum of ${args.a} and ${args.b} is ${args.a + args.b}.`,
        },
      ],
    });
  }
);

server.tool(
  "calculate_product",
  "Calculate the product of two numbers",
  {
    a: z.number(),
    b: z.number(),
  },
  async (args) => {
    console.log("Received request to calculate product:", { args });
    return await Promise.resolve({
      content: [
        {
          type: "text",
          text: `The product of ${args.a} and ${args.b} is ${args.a * args.b}.`,
        },
      ],
    });
  }
);

server.tool(
  "calculate_difference",
  "Calculate the difference of two numbers",
  {
    a: z.number(),
    b: z.number(),
  },
  async (args) => {
    console.log("Received request to calculate difference:", { args });
    return await Promise.resolve({
      content: [
        {
          type: "text",
          text: `The difference of ${args.a} and ${args.b} is ${
            args.a - args.b
          }.`,
        },
      ],
    });
  }
);

server.tool(
  "calculate_division",
  "Calculate the division of two numbers",
  {
    a: z.number(),
    b: z.number(),
  },
  async (args) => {
    console.log("Received request to calculate division:", { args });
    if (args.b === 0) {
      return await Promise.resolve({
        content: [
          {
            type: "text",
            text: `Division by zero is not allowed.`,
          },
        ],
      });
    }
    return await Promise.resolve({
      content: [
        {
          type: "text",
          text: `The division of ${args.a} by ${args.b} is ${args.a / args.b}.`,
        },
      ],
    });
  }
);

app.listen(4321, () => {
  console.log("Server started and listening for requests...");
  console.log("You can connect to it using the SSEClientTransport.");
  console.log(
    "For example: new SSEClientTransport(new URL('http://localhost:4321/sse'))"
  );
});
