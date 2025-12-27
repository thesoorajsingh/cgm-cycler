import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize lazily or checking env every time to allow mocking in tests
function getApiKey() {
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
}

export interface MealNutrition {
  name: string;
  calories: number;
  carbs: number; // grams
  protein: number; // grams
  fat: number; // grams
  confidence?: string; // high, medium, low
}

const SYSTEM_PROMPT = `
You are a nutritionist AI. Analyze the user's meal description and estimate the nutrition facts.
Return ONLY a valid JSON object with the following structure, no markdown formatting:
{
  "name": "Short concise name of the meal",
  "calories": 0,
  "carbs": 0,
  "protein": 0,
  "fat": 0,
  "confidence": "high" | "medium" | "low"
}
If the input is not a meal or cannot be estimated, return confidence "low" and 0 values.
`;

export async function analyzeMeal(description: string, attempt = 1): Promise<MealNutrition> {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn('Gemini API Key missing. Returning mock data.');
    return mockAnalyze(description);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent([SYSTEM_PROMPT, `Meal: ${description}`]);
    const response = await result.response;
    const text = response.text();

    // Clean up potential markdown code blocks
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const data = JSON.parse(jsonStr) as MealNutrition;
    return data;
  } catch (error) {
    console.error(`Gemini API Error (Attempt ${attempt}):`, error);

    // Exponential backoff
    if (attempt < 3) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return analyzeMeal(description, attempt + 1);
    }

    throw new Error('Failed to analyze meal after multiple attempts.');
  }
}

function mockAnalyze(description: string): MealNutrition {
  return {
    name: description.substring(0, 20) + (description.length > 20 ? '...' : ''),
    calories: 500,
    carbs: 50,
    protein: 20,
    fat: 15,
    confidence: 'medium'
  };
}
