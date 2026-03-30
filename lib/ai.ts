/**
 * Provider-Agnostic AI Abstraction Layer
 *
 * Supported providers (set via AI_PROVIDER env variable):
 *   - "gemini"  → uses GEMINI_API_KEY + AI_MODEL (e.g. gemini-2.5-flash)
 *   - "openai"  → uses OPENAI_API_KEY + AI_MODEL (e.g. gpt-4o-mini)
 *
 * To switch providers, ONLY change .env.local / Vercel env variables.
 * Zero code changes required!
 */

export interface AIOptions {
  temperature?: number;
  systemMessage?: string;
}

export async function generateText(prompt: string, options?: AIOptions): Promise<string> {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

  if (provider === 'openai') {
    return generateWithOpenAI(prompt, options);
  }

  // Default: Gemini
  return generateWithGemini(prompt, options);
}

// ── Gemini ─────────────────────────────────────────────────────────────────
async function generateWithGemini(prompt: string, options?: AIOptions): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');

  const model = process.env.AI_MODEL || 'gemini-2.5-flash';
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({
    model,
    generationConfig: { temperature: options?.temperature ?? 1.0 },
  });

  const result = await geminiModel.generateContent(prompt);
  const text = (await result.response).text().trim();
  return text.replace(/^\"|\"$/g, '').replace(/```json|```/g, '').trim();
}

// ── OpenAI ─────────────────────────────────────────────────────────────────
async function generateWithOpenAI(prompt: string, options?: AIOptions): Promise<string> {
  const OpenAI = (await import('openai')).default;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set.');

  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const openai = new OpenAI({ apiKey });

  const messages: { role: 'system' | 'user'; content: string }[] = [];
  if (options?.systemMessage) {
    messages.push({ role: 'system', content: options.systemMessage });
  }
  messages.push({ role: 'user', content: prompt });

  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature: options?.temperature ?? 0.85,
    max_tokens: 500,
  });

  return completion.choices[0]?.message?.content?.trim() ?? '';
}
