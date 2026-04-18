import "server-only";

import OpenAI from "openai";

export const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const openaiModel = process.env.OPENAI_MODEL || "gpt-5.4-mini";

export const indiaWebSearchTool = {
  type: "web_search" as const,
  search_context_size: "high" as const,
  user_location: {
    type: "approximate" as const,
    country: "IN",
    timezone: "Asia/Kolkata",
  },
};
