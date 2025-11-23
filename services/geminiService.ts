import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Challenge, AnalysisResult, Difficulty, Topic, ContentLength } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = "gemini-2.5-flash";

/**
 * Generates a new translation challenge based on selected difficulty/topic.
 */
export const generateChallenge = async (
  difficulty: Difficulty,
  topic: Topic,
  length: ContentLength
): Promise<Challenge> => {
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

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      english: { type: Type.STRING, description: "The original authentic English text." },
      chinese: { type: Type.STRING, description: "The natural Chinese translation." },
      context: { type: Type.STRING, description: "Brief context setting (e.g., 'Job interview', 'Casual dinner')." },
    },
    required: ["english", "chinese", "context"],
  };

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.85, 
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as Challenge;
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Failed to generate challenge:", error);
    // Fallback in case of API error to allow UI testing
    return {
      english: "If you stick with it, your efforts will pay off in the long run.",
      chinese: "如果你坚持练习，你的努力最终会得到回报。",
      context: "Advice on perseverance (Fallback)",
    };
  }
};

/**
 * Analyzes the user's back-translation against the original.
 */
export const analyzeTranslation = async (
  original: string,
  userTranslation: string,
  context: string
): Promise<AnalysisResult> => {
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

  const responseSchema: Schema = {
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

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.4, // Lower temperature for analytical tasks
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    throw new Error("Empty analysis response");
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};
