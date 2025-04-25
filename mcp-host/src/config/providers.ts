import dotenv from 'dotenv';
dotenv.config();

import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import OpenAI, { AzureClientOptions, AzureOpenAI } from 'openai';
import { logger } from '../helpers/logs.js';

// You will need to set these environment variables or edit the following values
const githubToken = process.env['GITHUB_TOKEN'] as string;
const openaiApiKey = process.env['OPENAI_API_KEY'] as string;
const azureOpenAiApiKey = process.env['AZURE_OPENAI_API_KEY'] as string;
const endpoint = process.env['AZURE_OPENAI_ENDPOINT'] as string;
const model = process.env['MODEL'] as string;
const log = logger('providers');

// This version uses the new OpenAI Responses API
const apiVersion = '2025-03-01-preview';

let client: AzureOpenAI | OpenAI | null = null;

if (githubToken) {
  // Initialize the OpenAI client with GitHub token
  log.info('Authentication method: GitHub token');

  client = new OpenAI({
    apiKey: githubToken,
    baseURL: 'https://models.github.ai/inference',
  });
} else if (openaiApiKey) {
  // Initialize the OpenAI client with API Key
  log.info('Authentication method: OpenAI API Key');

  client = new OpenAI({
    apiKey: openaiApiKey,
  });
} else if (endpoint) {
  const opts: AzureClientOptions = {
    endpoint,
    apiVersion,
    deployment: model,
  };

  if (azureOpenAiApiKey) {
    // Initialize the Azure OpenAI client with API Key
    log.info('Authentication method: Azure OpenAI API Key');
    opts.apiKey = azureOpenAiApiKey;
  } else {

    // Initialize the Azure OpenAI client with Entra ID (Azure AD) authentication (keyless)
    log.info('Authentication method: Azure OpenAI Entra ID (keyless)');
    const credential = new DefaultAzureCredential();
    const scope = 'https://cognitiveservices.azure.com/.default';
    opts.azureADTokenProvider = getBearerTokenProvider(credential, scope);
  }

  client = new AzureOpenAI(opts);
}

export { githubToken as isGitHubModels, client as llm, model };
