import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Challenge, AnalysisResult, Difficulty, Topic, ContentLength, AIConfig, AIProvider } from "../types";

const AI_CONFIG_KEY = 'echoback_ai_config';

/**
 * 解析逗号分割的 API Key 字符串
 */
function parseApiKeys(keyString?: string): string[] {
  if (!keyString) return [];
  return keyString
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0);
}

/**
 * 从多个 key 中随机选择一个
 */
function getRandomKey(keys: string[]): string | null {
  if (keys.length === 0) return null;
  return keys[Math.floor(Math.random() * keys.length)];
}

/**
 * 规范化 BaseURL，去除尾部斜杠
 */
function normalizeBaseUrl(url?: string): string {
  if (!url) return 'https://api.openai.com/v1';
  return url.replace(/\/+$/, '');
}

/**
 * AI 配置管理
 */
export const aiConfigManager = {
  getConfig(): AIConfig | null {
    const stored = localStorage.getItem(AI_CONFIG_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  saveConfig(config: AIConfig): void {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
  },

  hasValidConfig(): boolean {
    const config = this.getConfig();
    if (!config) return false;

    if (config.provider === AIProvider.GEMINI) {
      const keys = parseApiKeys(config.geminiApiKey);
      return keys.length > 0;
    } else if (config.provider === AIProvider.OPENAI) {
      const keys = parseApiKeys(config.openaiApiKey);
      return keys.length > 0;
    }
    return false;
  }
};

/**
 * Gemini API Schema 定义
 */
const challengeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    english: { type: Type.STRING, description: "The original authentic English text." },
    chinese: { type: Type.STRING, description: "The natural Chinese translation." },
    context: { type: Type.STRING, description: "Brief context setting (e.g., 'Job interview', 'Casual dinner')." },
  },
  required: ["english", "chinese", "context"],
};

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER, description: "Score from 0 to 100 based on meaning and naturalness." },
    feedback: { type: Type.STRING, description: "General summary of the performance." },
    gaps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["vocabulary", "grammar", "tone", "structure"] },
          userSegment: { type: Type.STRING, description: "The specific part the user wrote (or 'N/A' if missing)." },
          nativeSegment: { type: Type.STRING, description: "The corresponding part in the original." },
          explanation: { type: Type.STRING, description: "Why the native version is preferred or different." },
        },
        required: ["type", "userSegment", "nativeSegment", "explanation"],
      },
    },
    betterAlternative: { type: Type.STRING, description: "An optional polished version of the user's sentence if it was very different, otherwise null." },
  },
  required: ["score", "feedback", "gaps"],
};

/**
 * 使用 Gemini API 生成挑战
 */
async function generateChallengeWithGemini(
  config: AIConfig,
  difficulty: Difficulty,
  topic: Topic,
  length: ContentLength
): Promise<Challenge> {
  const keys = parseApiKeys(config.geminiApiKey);
  const apiKey = getRandomKey(keys);
  if (!apiKey) {
    throw new Error("No valid Gemini API key available");
  }
  const ai = new GoogleGenAI({ apiKey });
  const isParagraph = length === ContentLength.PARAGRAPH;

  const systemInstruction = `You are an expert English language curator.
  Your goal is to provide a single, high-quality, authentic English text suitable for the 'Back-translation' learning method.

  Rules:
  1. The English must be natural, idiomatic, and grammatically perfect.
  2. The Chinese translation must be accurate but natural Chinese (not translationese).
  3. The content must strictly follow the requested topic and difficulty.
  4. If 'Paragraph' is requested, keep it concise (2-3 connected sentences).
  `;

  const prompt = `Generate a practice ${isParagraph ? 'short paragraph (2-3 sentences)' : 'single sentence'} for a student at the '${difficulty}' level.
  Topic: ${topic}.
  Ensure it contains interesting collocations or grammatical structures worth learning.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: challengeSchema,
      temperature: 0.85,
    },
  });

  if (!response.text) {
    throw new Error("Empty response from Gemini AI");
  }

  return JSON.parse(response.text) as Challenge;
}

/**
 * 使用 OpenAI API 生成挑战
 */
async function generateChallengeWithOpenAI(
  config: AIConfig,
  difficulty: Difficulty,
  topic: Topic,
  length: ContentLength
): Promise<Challenge> {
  const keys = parseApiKeys(config.openaiApiKey);
  const apiKey = getRandomKey(keys);
  if (!apiKey) {
    throw new Error("No valid OpenAI API key available");
  }
  const baseUrl = normalizeBaseUrl(config.openaiBaseUrl);
  const model = config.openaiModel || 'gpt-4o-mini';
  const isParagraph = length === ContentLength.PARAGRAPH;

  const systemPrompt = `You are an expert English language curator.
  Your goal is to provide a single, high-quality, authentic English text suitable for the 'Back-translation' learning method.

  Rules:
  1. The English must be natural, idiomatic, and grammatically perfect.
  2. The Chinese translation must be accurate but natural Chinese (not translationese).
  3. The content must strictly follow the requested topic and difficulty.
  4. If 'Paragraph' is requested, keep it concise (2-3 connected sentences).

  Return a JSON object with:
  - english: string (the original English text)
  - chinese: string (natural Chinese translation)
  - context: string (brief context, e.g., "Job interview", "Casual dinner")`;

  const userPrompt = `Generate a practice ${isParagraph ? 'short paragraph (2-3 sentences)' : 'single sentence'} for a student at the '${difficulty}' level.
  Topic: ${topic}.
  Ensure it contains interesting collocations or grammatical structures worth learning.`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.85
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  return JSON.parse(content) as Challenge;
}

/**
 * 使用 Gemini API 分析翻译
 */
async function analyzeTranslationWithGemini(
  config: AIConfig,
  original: string,
  userTranslation: string,
  context: string
): Promise<AnalysisResult> {
  const keys = parseApiKeys(config.geminiApiKey);
  const apiKey = getRandomKey(keys);
  if (!apiKey) {
    throw new Error("No valid Gemini API key available");
  }
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are a strict but helpful language coach specializing in the 'Back-translation' method.
  Compare the Student's translation with the Native Original.
  Focus on:
  1. Nuance and Collocation (e.g., 'stick with it' vs 'keep doing').
  2. Tone and Register.
  3. Grammar accuracy.

  Be encouraging but point out the "Gap" — why the native version is better or how they differ.`;

  const prompt = `Context: ${context}
  Native Original: "${original}"
  Student Translation: "${userTranslation}"

  Analyze the differences. Return JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
      temperature: 0.4,
    },
  });

  if (!response.text) {
    throw new Error("Empty analysis response from Gemini");
  }

  return JSON.parse(response.text) as AnalysisResult;
}

/**
 * 使用 OpenAI API 分析翻译
 */
async function analyzeTranslationWithOpenAI(
  config: AIConfig,
  original: string,
  userTranslation: string,
  context: string
): Promise<AnalysisResult> {
  const keys = parseApiKeys(config.openaiApiKey);
  const apiKey = getRandomKey(keys);
  if (!apiKey) {
    throw new Error("No valid OpenAI API key available");
  }
  const baseUrl = normalizeBaseUrl(config.openaiBaseUrl);
  const model = config.openaiModel || 'gpt-4o-mini';

  const systemPrompt = `You are a strict but helpful language coach specializing in the 'Back-translation' method.
  Compare the Student's translation with the Native Original.
  Focus on:
  1. Nuance and Collocation (e.g., 'stick with it' vs 'keep doing').
  2. Tone and Register.
  3. Grammar accuracy.

  Be encouraging but point out the "Gap" — why the native version is better or how they differ.

  Return a JSON object with:
  - score: number (0-100, based on meaning and naturalness)
  - feedback: string (general summary of performance)
  - gaps: array of objects with:
    - type: "vocabulary" | "grammar" | "tone" | "structure"
    - userSegment: string (what the user wrote, or "N/A" if missing)
    - nativeSegment: string (corresponding part in original)
    - explanation: string (why native version is preferred)
  - betterAlternative: string or null (polished version if needed)`;

  const userPrompt = `Context: ${context}
  Native Original: "${original}"
  Student Translation: "${userTranslation}"

  Analyze the differences.`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Empty analysis response from OpenAI");
  }

  return JSON.parse(content) as AnalysisResult;
}

/**
 * 统一的生成挑战接口
 */
export const generateChallenge = async (
  difficulty: Difficulty,
  topic: Topic,
  length: ContentLength
): Promise<Challenge> => {
  const config = aiConfigManager.getConfig();

  if (!config || !aiConfigManager.hasValidConfig()) {
    throw new Error("Please configure AI settings first");
  }

  try {
    if (config.provider === AIProvider.GEMINI) {
      return await generateChallengeWithGemini(config, difficulty, topic, length);
    } else {
      return await generateChallengeWithOpenAI(config, difficulty, topic, length);
    }
  } catch (error) {
    console.error("Failed to generate challenge:", error);
    // Fallback 示例
    return {
      english: "If you stick with it, your efforts will pay off in the long run.",
      chinese: "如果你坚持练习,你的努力最终会得到回报。",
      context: "Advice on perseverance (Fallback)",
    };
  }
};

/**
 * 统一的分析翻译接口
 */
export const analyzeTranslation = async (
  original: string,
  userTranslation: string,
  context: string
): Promise<AnalysisResult> => {
  const config = aiConfigManager.getConfig();

  if (!config || !aiConfigManager.hasValidConfig()) {
    throw new Error("Please configure AI settings first");
  }

  if (config.provider === AIProvider.GEMINI) {
    return await analyzeTranslationWithGemini(config, original, userTranslation, context);
  } else {
    return await analyzeTranslationWithOpenAI(config, original, userTranslation, context);
  }
};
