import { z } from "zod";

export function openAiToolAdapter(tool: {
  name: string;
  description?: string;
  input_schema: any;
}) {
  // Create a zod schema based on the input_schema
  const schema = z.object(tool.input_schema);

  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        properties: tool.input_schema.properties,
        required: tool.input_schema.required,
      },
    },
  };
}
