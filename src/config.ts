import { MCPConfig } from "./client";

export const config: MCPConfig = {
  "servers": {
    "math-server": {
      "type": "sse",
      "url": "http://localhost:4321/sse"
    }
  }
}