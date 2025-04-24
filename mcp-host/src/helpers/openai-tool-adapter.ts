import { ChatCompletionTool } from "openai/resources/chat";
import { FunctionTool } from "openai/resources/responses/responses";

function zodSchemaToParametersSchema(zodSchema: any): {
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
    type: "object",
    properties,
    required,
    additionalProperties,
  };
}

export function mcpToolToOpenAiToolChatCompletion(tool: {
  name: string;
  description?: string;
  inputSchema: any;
}): ChatCompletionTool {
  return {
    type: "function",
    function: {
      strict: true,
      name: tool.name,
      description: tool.description,
      parameters: {
        ...zodSchemaToParametersSchema(tool.inputSchema),
      },
    },
  };
}

export function mcpToolToOpenAiToolResponses(tool: {
  name: string;
  description?: string;
  inputSchema: any;
}): FunctionTool {
  return {
    type: "function",
    strict: true,
    name: tool.name,
    description: tool.description,
    parameters: {
      parameters: {
        ...zodSchemaToParametersSchema(tool.inputSchema),
      },
    },
  };
}