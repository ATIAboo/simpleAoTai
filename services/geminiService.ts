import { GoogleGenAI } from "@google/genai";
import { PlayerStats } from "../types";

// Helper to get Gemini instance
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateNarrative = async (
  locationName: string,
  biome: string,
  weather: string,
  stats: PlayerStats
): Promise<string> => {
  try {
    const ai = getAI();
    
    // We want a short, atmospheric RPG description.
    const prompt = `
      You are the narrator of a pixel-art survival horror/adventure RPG set on the "Ao Tai Line" (鳌太线), a dangerous hiking route in China known for its harsh weather and "Stone Seas".
      
      Context:
      - Location: ${locationName}
      - Terrain: ${biome}
      - Current Weather: ${weather}
      - Player Status: Health ${stats.health}%, Warmth ${stats.warmth}%, Energy ${stats.energy}%.

      Task:
      Generate a single, short sentence (max 20 words) describing the current atmosphere or a minor event. 
      Focus on the sensation of cold, wind, isolation, or the beauty of nature.
      If stats are low, emphasize the danger.
      
      Output ONLY the sentence in Simplified Chinese (简体中文). No JSON, no markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || "风在山谷中呼啸...";
  } catch (error) {
    console.error("Gemini narrative generation failed:", error);
    return "你顶着风雪继续前行。";
  }
};

export const generateEncounter = async (
  biome: string
): Promise<{ text: string; effect: 'NONE' | 'DAMAGE' | 'ITEM' }> => {
  try {
    const ai = getAI();
    const prompt = `
      The player is hiking the Ao Tai Line in the ${biome}. 
      Generate a random encounter or observation.
      
      Return a JSON object with:
      - text: A short description (max 15 words) in Simplified Chinese (简体中文).
      - effect: One of "NONE", "DAMAGE" (minor injury), "ITEM" (found supplies).
      
      Example: {"text": "你踩到了松动的石头。", "effect": "DAMAGE"}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const jsonText = response.text?.trim();
    if (!jsonText) throw new Error("Empty response");
    
    return JSON.parse(jsonText);
  } catch (error) {
    return { text: "四周一片寂静。", effect: "NONE" };
  }
};