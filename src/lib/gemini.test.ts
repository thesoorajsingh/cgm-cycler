import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use a simple mock module replacement pattern
const generateContentMock = vi.fn();

// This factory needs to be hoisted and self-contained
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      constructor(apiKey: string) {}
      getGenerativeModel() {
        return {
          generateContent: generateContentMock
        };
      }
    }
  };
});

import { analyzeMeal } from './gemini';

describe('Gemini Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, NEXT_PUBLIC_GEMINI_API_KEY: 'test-key' };

    // Default success mock
    generateContentMock.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          name: "Test Food",
          calories: 100,
          carbs: 10,
          protein: 5,
          fat: 2,
          confidence: "high"
        })
      }
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should parse valid JSON response from Gemini', async () => {
    const mockData = {
      name: "Apple",
      calories: 95,
      carbs: 25,
      protein: 0.5,
      fat: 0.3,
      confidence: "high"
    };

    generateContentMock.mockResolvedValue({
      response: {
        text: () => JSON.stringify(mockData)
      }
    });

    const result = await analyzeMeal('An apple');
    expect(result).toEqual(mockData);
  });

  it('should retry on failure', async () => {
    generateContentMock
      .mockRejectedValueOnce(new Error('Network error 1'))
      .mockRejectedValueOnce(new Error('Network error 2'))
      .mockResolvedValue({
        response: {
          text: () => JSON.stringify({ name: 'Success', calories: 100, carbs: 0, protein: 0, fat: 0 })
        }
      });

    const result = await analyzeMeal('Test', 1);
    expect(result.name).toBe('Success');
    expect(generateContentMock).toHaveBeenCalledTimes(3);
  }, 10000);

  it('should use mock if api key missing', async () => {
    process.env.NEXT_PUBLIC_GEMINI_API_KEY = '';
    const result = await analyzeMeal('Test Meal');
    expect(result.confidence).toBe('medium');
    expect(generateContentMock).not.toHaveBeenCalled();
  });
});
