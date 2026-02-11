import OpenAI from "openai";

const apiKey = process.env.XAI_API_KEY;

export const xai = apiKey
  ? new OpenAI({
      apiKey,
      baseURL: "https://api.x.ai/v1",
    })
  : null;
