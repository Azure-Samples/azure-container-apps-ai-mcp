# OpenAI MCP Getting Started Example

This project showcases how to use the MCP protocol with OpenAI. It provides a simple example to interact with OpenAI's API seamlessly via an MCP server, host and clients.

## MCP server supported features and capabilities

This sample provides an MCP server implementation that supports the following features:

| Feature             | Completed |
| ------------------- | --------- |
| SSE                 | ✅        |
| HTTP Streaming      | ✅        |
| AuthN (token based) | ✅        |
| Tools               | ✅        |
| Resources           |           |
| Prompts             |           |
| Sampling            |           |

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
git clone https://github.com/manekinekko/azure-openai-mcp-example.git
cd azure-openai-mcp-example
```

3. cd into all folder and install the dependencies:

```bash
npm i --prefix mcp-host 
npm i --prefix mcp-server-http 
npm i --prefix mcp-server-sse 
```

### Configuration

This sample supports the follwowing LLM providers:

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

1. First, run the MCP servers, in separate terminals:

```bash
npm start --prefix mcp-server-http
npm start --prefix mcp-server-sse
```

NOTE: you don't need to run both servers, you can choose one of them.

1. Run the MCP host in a separate terminal:
```bash
npm start --prefix mcp-host
```

You should be able to use the MCP host to interat with the LLM agent. Try asking question about adding or listing items in a shopping list. The host will then try to fetch and call tools from the MCP servers.

## Debugging and inspection

You can use the `DEBUG` environment variable to enable verbose logging for the OpenAI SDK:

```bash
DEBUG=mcp:* npm start
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
