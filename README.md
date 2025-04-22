# OpenAI MCP Getting Started Example

This project showcases how to use the MCP protocol with OpenAI. It provides a simple example to interact with OpenAI's API seamlessly via an MCP server, host and clients.

## MCP server supported features and capabilities

This sample provides an MCP server implementation that supports the following features:

| Feature        | Completed |
| -------------- | --------- |
| SSE            | ✅        |
| HTTP Streaming |           |
| AuthN/Z        |           |
| Tools          | ✅        |
| Resources      |           |
| Prompts        |           |
| Sampling       |           |


## Getting Started

To get started with this project, follow the steps below:

### Prerequisites

- Node.js and npm (version 22 or higher)
- An OpenAI compatible endpoint:
  - An OpenAI API key
  - Or, a GitHub token, if you want to use the GitHub models: https://gh.io/models
  - Or, if you are using Azure OpenAI, you need to have an [Azure OpenAI resource](https://learn.microsoft.com/azure/ai-services/openai/chatgpt-quickstart?tabs=keyless%2Ctypescript-keyless%2Cpython-new%2Ccommand-line&pivots=programming-language-javascript) and the corresponding endpoint.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/manekinekko/openai-mcp-example.git
   cd openai-mcp-example
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

### Configuration

This sample supports the follwowing providers:

- Azure OpenAI,
- OpenAI,
- GitHub Models.

#### Azure OpenAI

In order to use Keyless authentication, using Azure Managed Identity, you need to provide the `AZURE_OPENAI_ENDPOINT` environment variable in the `.env` file:

```env
AZURE_OPENAI_ENDPOINT="https://<ai-foundry-openai-project>.openai.azure.com"
MODEL="gpt-4.1"

# Optional: If you want to use the API key authentication.
#AZURE_OPENAI_API_KEY=your_azure_openai_api_key
```

And make sure to using the [Azure CLI](https://learn.microsoft.com/cli/azure/) to log in to your Azure account and follow the instructions to selection your subscription:

```bash
az login
```

#### OpenAI

To use the OpenAI API, you need to set your `OPENAI_API_KEY` key in the `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key
MODEL="gpt-4.1"
```

#### GitHub Models

To use the GitHub models, you need to set your `GITHUB_TOKEN` and `GITHUB_MODEL` in the `.env` file:

```env
GITHUB_TOKEN=your_github_token
GITHUB_MODEL="openai/gpt-4.1"
```

### Usage

1. Run the MCP server:

   ```bash
   npm run server
   ```

2. Run the MCP host in a separate terminal:
   ```bash
   npm run host
   ```

You should see a response like the following:

```text
Authentication method: Azure OpenAI Entra ID (keyless)

MCP Host Started!
Connected to the following servers:
* math-server: http://localhost:4321/sse
Available tools:
- calculate_sum: Calculate the sum of two numbers
- calculate_product: Calculate the product of two numbers
- calculate_difference: Calculate the difference of two numbers
- calculate_division: Calculate the division of two numbers

Query: what is 40+2?
Agent:
[Thinking] Using tool "calculate_sum" with args "{\"a\":40,\"b\":2}"
[Thinking] Tool calculate_sum result: The sum of 40 and 2 is 42.
[Thinking] The result of 40 + 2 is 42.

Agent:
The result of 40 + 2 is 42.

Query:
```

## Debugging and inspection

You can use the `DEBUG` environment variable to enable verbose logging for the OpenAI SDK:

```bash
DEBUG=true npm run host
```

In order to inspect the MCP servers, run the following command in a separate terminal, and follow the instructions:

```bash
npm run inspect
```


## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
