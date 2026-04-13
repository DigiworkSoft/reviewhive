/**
 * Multi-Provider AI Abstraction Layer
 *
 * All configured providers are available. System tries them in order.
 * If one fails, automatically switches to the next available provider.
 *
 * Configure via env variables:
 *   AI_PROVIDERS  → comma-separated list, e.g. "gemini,openai" (order = preference)
 *   GEMINI_API_KEY → enables Gemini
 *   OPENAI_API_KEY → enables OpenAI
 *   AI_MODEL       → override model name (optional, per-provider defaults used)
 *
 * Add more providers by adding a generate function + registering in PROVIDERS map.
 */

export interface AIOptions {
  temperature?: number;
  systemMessage?: string;
}

type ProviderFn = (prompt: string, options?: AIOptions) => Promise<string>;

const PROVIDERS: Record<string, { fn: ProviderFn; isAvailable: () => boolean }> = {
  gemini: { fn: generateWithGemini, isAvailable: () => !!process.env.GEMINI_API_KEY },
  openai: { fn: generateWithOpenAI, isAvailable: () => !!process.env.OPENAI_API_KEY },
};

function getProviderOrder(): string[] {
  const configured = process.env.AI_PROVIDERS;
  if (configured) {
    return configured.split(',').map(p => p.trim().toLowerCase());
  }
  return Object.keys(PROVIDERS);
}

export async function generateText(prompt: string, options?: AIOptions): Promise<string> {
  const order = getProviderOrder();
  const available = order.filter(p => PROVIDERS[p]?.isAvailable());

  if (available.length === 0) {
    throw new Error('No AI providers configured. Set GEMINI_API_KEY or OPENAI_API_KEY.');
  }

  for (let i = 0; i < available.length; i++) {
    try {
      return await PROVIDERS[available[i]].fn(prompt, options);
    } catch (error) {
      const isLast = i === available.length - 1;
      if (isLast) throw error;
      console.warn(`AI provider "${available[i]}" failed, trying "${available[i + 1]}"...`);
    }
  }

  throw new Error('All AI providers failed.');
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
