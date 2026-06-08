import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_API_KEY = process.env.GEMINI_API_KEY || "";

export interface LLMResponse {
  text: string;
}

export async function generateContent(
  prompt: string,
  systemInstruction?: string,
  userKey?: string
): Promise<LLMResponse> {
  const apiKey = userKey || DEFAULT_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Gemini API Key. Please configure GEMINI_API_KEY or supply a user BYOK key.");
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Using gemini-1.5-flash for speedy reasoning & tool loops
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return { text: responseText };
  } catch (error) {
    console.error("LLM Gateway generation error:", error);
    throw error;
  }
}
