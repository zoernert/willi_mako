import OpenAI from 'openai';

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Fallback for development if no API key is provided
if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not found in environment variables. AI features will be disabled.');
}

export default openai;
