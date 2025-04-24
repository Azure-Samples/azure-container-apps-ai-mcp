export type MCPSEEServerConfig = {
  type: "sse" | "http";
  url: string;
};

export type MCPServerType = {
  [name: string]: MCPSEEServerConfig;
};

export type MCPConfig = {
  servers: MCPServerType;
};

export type ZodToolType = {
  name: string;
  description?: string;
  inputSchema: any;
  outputSchema?: any;
  execute?: (args: any) => Promise<any>;
};
