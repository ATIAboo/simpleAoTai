import { PlayerStats } from "../types";

// Configuration for SiliconFlow / DeepSeek
const API_KEY = process.env.API_KEY || ''; 
const API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const MODEL_NAME = 'deepseek-ai/DeepSeek-V3';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Helper to call DeepSeek API
const callDeepSeekAI = async (messages: ChatMessage[]): Promise<string> => {
  if (!API_KEY) {
    console.warn("API Key is missing.");
    throw new Error("API Key is missing");
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: messages,
        temperature: 0.7,
        max_tokens: 200,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API Error:', errorText);
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('AI Service Error:', error);
    throw error;
  }
};

export const generateNarrative = async (
  locationName: string,
  biome: string,
  weather: string,
  stats: PlayerStats
): Promise<string> => {
  const systemPrompt = `
    You are the narrator of a pixel-art survival horror/adventure RPG set on the "Ao Tai Line" (鳌太线), a dangerous hiking route in China.
    
    Task:
    Output ONLY a single, short sentence (max 20 words) in Simplified Chinese (简体中文).
    Focus on the sensation of cold, wind, isolation, or the beauty of nature.
    If stats are low, emphasize the danger.
  `;
  
  const userPrompt = `
    Context:
    - Location: ${locationName}
    - Terrain: ${biome}
    - Weather: ${weather}
    - Player Status: Health ${stats.health}%, Warmth ${stats.warmth}%, Energy ${stats.energy}%.
  `;

  try {
    const content = await callDeepSeekAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);
    return content.trim() || "风在山谷中呼啸...";
  } catch (error) {
    return "你顶着风雪继续前行。";
  }
};

export const generateEncounter = async (
  biome: string
): Promise<{ text: string; effect: 'NONE' | 'DAMAGE' | 'ITEM' }> => {
  const systemPrompt = `
    You are a game master for a survival RPG.
    Generate a random encounter.
    
    Output Requirement:
    Return STRICT JSON format only. No markdown formatting (do not use \`\`\`json).
    
    JSON Structure:
    { 
      "text": "A short description (max 15 words) in Simplified Chinese (简体中文)", 
      "effect": "NONE" or "DAMAGE" (minor injury) or "ITEM" (found supplies) 
    }
  `;

  const userPrompt = `The player is hiking in the ${biome}.`;

  try {
    const content = await callDeepSeekAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    // Clean up potential markdown code blocks if the model adds them despite instructions
    const cleanContent = content.replace(/```json\n?|```/g, '').trim();
    const result = JSON.parse(cleanContent);
    
    // Validate fields roughly
    if (!result.text || !result.effect) throw new Error("Invalid JSON structure");
    
    return result;
  } catch (error) {
    console.warn("Failed to parse encounter:", error);
    return { text: "四周一片寂静。", effect: "NONE" };
  }
};