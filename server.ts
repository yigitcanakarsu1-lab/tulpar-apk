import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 images
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Candidate Gemini models with automatic failover (gemini-3.5-flash-lite is primary for general tasks):
const DEFAULT_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.1-flash-image",
  "gemini-flash-latest",
  "nemotron-3-ultra",
  "gemma-4-31b",
  "ling-3.0-flash-vl",
];

// OpenRouter external model IDs mapping for supported extra models
const OPENROUTER_MODEL_MAP: Record<string, string> = {
  "nemotron-3-ultra": "nvidia/nemotron-3-ultra-550b-a55b",
  "gemma-4-31b": "google/gemma-4-31b-it",
  "ling-3.0-flash-vl": "inclusionai/ling-3.0-flash-vl",
};

export type TaskType = "vision" | "deep_coding" | "reasoning" | "search_grounding" | "creative_turkish" | "fast_chat" | "image_generation";

export interface ModelCapabilities {
  id: string;
  name: string;
  hasVision: boolean;
  hasWebSearch: boolean;
  isDeepCoding: boolean;
  isReasoning: boolean;
  isFastChat: boolean;
  isCreativeTurkish: boolean;
}

export const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  "gemini-3.5-flash-lite": {
    id: "gemini-3.5-flash-lite",
    name: "Tulpar 3.5 Flash Lite",
    hasVision: true,
    hasWebSearch: true,
    isDeepCoding: true,
    isReasoning: true,
    isFastChat: true,
    isCreativeTurkish: true,
  },
  "gemini-3.8-flash": {
    id: "gemini-3.8-flash",
    name: "Tulpar 3.8 Flash",
    hasVision: true,
    hasWebSearch: true,
    isDeepCoding: true,
    isReasoning: true,
    isFastChat: true,
    isCreativeTurkish: true,
  },
  "gemini-3.1-flash-lite": {
    id: "gemini-3.1-flash-lite",
    name: "Tulpar Hızlı (Lite)",
    hasVision: true,
    hasWebSearch: true,
    isDeepCoding: true,
    isReasoning: true,
    isFastChat: true,
    isCreativeTurkish: true,
  },
  "gemini-3.1-flash-image": {
    id: "gemini-3.1-flash-image",
    name: "Gemini 3.1 Flash Image",
    hasVision: true,
    hasWebSearch: false,
    isDeepCoding: false,
    isReasoning: false,
    isFastChat: true,
    isCreativeTurkish: true,
  },
  "gemini-flash-latest": {
    id: "gemini-flash-latest",
    name: "Tulpar Flash",
    hasVision: true,
    hasWebSearch: true,
    isDeepCoding: true,
    isReasoning: true,
    isFastChat: true,
    isCreativeTurkish: true,
  },
  "ling-3.0-flash-vl": {
    id: "ling-3.0-flash-vl",
    name: "Ling 3.0 Flash VL",
    hasVision: true,
    hasWebSearch: false,
    isDeepCoding: false,
    isReasoning: false,
    isFastChat: true,
    isCreativeTurkish: true,
  },
  "nemotron-3-ultra": {
    id: "nemotron-3-ultra",
    name: "Nemotron 3 Ultra",
    hasVision: false,
    hasWebSearch: false,
    isDeepCoding: true,
    isReasoning: true,
    isFastChat: false,
    isCreativeTurkish: false,
  },
  "gemma-4-31b": {
    id: "gemma-4-31b",
    name: "Gemma 4 31B",
    hasVision: false,
    hasWebSearch: false,
    isDeepCoding: true,
    isReasoning: true,
    isFastChat: true,
    isCreativeTurkish: true,
  },
};

// Web image search helper using Wikimedia Commons API
async function searchWebImages(query: string): Promise<{ title: string; url: string }[]> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=4&prop=imageinfo&iiprop=url|size&format=json`;
    const response = await fetch(url, { headers: { 'User-Agent': 'TulparAI/1.0 (Contact: admin@tulpar.ai)' } });
    const data = await response.json() as any;
    const pages = data?.query?.pages;
    if (!pages) return [];

    const results: { title: string; url: string }[] = [];
    for (const pageId of Object.keys(pages)) {
      const page = pages[pageId];
      const imageInfo = page?.imageinfo?.[0];
      if (imageInfo?.url) {
        results.push({
          title: page.title.replace(/^File:/, "").replace(/\.\w+$/, ""),
          url: imageInfo.url,
        });
      }
    }
    return results;
  } catch (err) {
    console.error("Web image search error:", err);
    return [];
  }
}

// Tracks temporary quota/rate-limit cooldown per model
const modelCooldownMap = new Map<string, number>();

export function isModelOnCooldown(modelId: string): boolean {
  const expiry = modelCooldownMap.get(modelId);
  return typeof expiry === "number" && Date.now() < expiry;
}

export function recordModelFailure(modelId: string, error: any) {
  const msg = String(error?.message || error?.status || JSON.stringify(error || {}));
  const isQuota =
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota") ||
    msg.includes("Quota") ||
    msg.includes("rate-limits") ||
    msg.includes("exceeded your current quota") ||
    msg.includes("503") ||
    msg.includes("UNAVAILABLE");

  if (isQuota) {
    // Put on a 30-second cooldown so subsequent requests don't waste time retrying an exhausted model
    modelCooldownMap.set(modelId, Date.now() + 30_000);
    console.warn(`[Quota-Safety] Model "${modelId}" put on 30s cooldown due to quota/rate exhaustion.`);
  }
}

/**
 * Classifies the task to determine requirements:
 * e.g. vision (requires multimodal model), deep reasoning, coding, search grounding, or general chat.
 */
export function classifyTask(params: {
  hasImages: boolean;
  promptText: string;
  isWebSearchActive: boolean;
}): TaskType {
  if (params.hasImages) {
    return "vision";
  }

  const lower = (params.promptText || "").toLowerCase();

  if (
    lower.includes("görsel oluştur") ||
    lower.includes("resim oluştur") ||
    lower.includes("resim çiz") ||
    lower.includes("görsel çiz") ||
    lower.includes("fotoğraf oluştur") ||
    lower.includes("görsel üret") ||
    lower.includes("görseli düzenle") ||
    lower.includes("resmi düzenle") ||
    lower.includes("generate image") ||
    lower.includes("create image") ||
    lower.includes("edit image") ||
    lower.includes("resim yap") ||
    lower.includes("görsel yap") ||
    (lower.startsWith("çiz ") || lower.includes(" çiz "))
  ) {
    return "image_generation";
  }

  if (
    params.isWebSearchActive ||
    lower.includes("güncel") ||
    lower.includes("haber") ||
    lower.includes("hava durumu") ||
    lower.includes("bugün") ||
    lower.includes("fiyat") ||
    lower.includes("dolar") ||
    lower.includes("euro")
  ) {
    return "search_grounding";
  }

  if (
    lower.includes("kod") ||
    lower.includes("fonksiyon") ||
    lower.includes("hata ayıkla") ||
    lower.includes("bug") ||
    lower.includes("python") ||
    lower.includes("javascript") ||
    lower.includes("typescript") ||
    lower.includes("react") ||
    lower.includes("sql") ||
    lower.includes("algoritma") ||
    lower.includes("refactor")
  ) {
    return "deep_coding";
  }

  if (
    lower.includes("mantık") ||
    lower.includes("ispat") ||
    lower.includes("analiz et") ||
    lower.includes("matematik") ||
    lower.includes("kıyasla") ||
    lower.includes("mimari") ||
    lower.includes("adım adım") ||
    lower.includes("çıkarım")
  ) {
    return "reasoning";
  }

  if (
    lower.includes("şiir") ||
    lower.includes("hikaye") ||
    lower.includes("yazı") ||
    lower.includes("makale") ||
    lower.includes("metin") ||
    lower.includes("türkçe")
  ) {
    return "creative_turkish";
  }

  return "fast_chat";
}

/**
 * Returns prioritized, capable candidate models for the given task.
 * NEVER routes a vision task to a non-vision model.
 * Automatically respects quota cooldowns while providing capable alternatives.
 */
export function getCapableFallbackModels(task: TaskType, preferredModel?: string): string[] {
  const mapped = preferredModel ? mapModelName(preferredModel) : "gemini-3.8-flash";

  // Filter candidates by strict capability
  const capableModels = Object.values(MODEL_CAPABILITIES).filter((c) => {
    if (task === "vision") {
      // STRICT REQUIREMENT: Only models with vision support
      return c.hasVision;
    }
    return true;
  });

  // Determine ideal priority order based on task type
  let orderedIds: string[] = [];
  if (task === "vision") {
    // Ling 3.0 Flash VL primary for vision/video, with Gemini fallbacks
    orderedIds = ["ling-3.0-flash-vl", "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  } else if (task === "image_generation") {
    // Gemini 3.1 Flash Image primary for image generation and editing
    orderedIds = ["gemini-3.1-flash-image", "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
  } else if (task === "reasoning") {
    // Nemotron 3 Ultra primary for advanced reasoning
    orderedIds = ["nemotron-3-ultra", "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemma-4-31b", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  } else if (task === "deep_coding") {
    // Gemma 4 31B primary for coding
    orderedIds = ["gemma-4-31b", "nemotron-3-ultra", "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  } else if (task === "search_grounding") {
    // Tulpar 3.8 Flash primary for complex tasks and search grounding
    orderedIds = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  } else if (task === "creative_turkish") {
    // Tulpar 3.5 Flash Lite primary for general/creative work
    orderedIds = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemma-4-31b", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  } else {
    // Tulpar 3.5 Flash Lite primary for general fast chat
    orderedIds = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemma-4-31b", "nemotron-3-ultra", "ling-3.0-flash-vl"];
  }

  // Filter strictly to capable models
  const validSet = new Set(capableModels.map((c) => c.id));
  let filtered = orderedIds.filter((id) => validSet.has(id));

  // If user preferred a capable model, place it first
  if (validSet.has(mapped)) {
    filtered = [mapped, ...filtered.filter((id) => id !== mapped)];
  }

  // Partition by cooldown: active models first, models on cooldown as last resort
  const notOnCooldown = filtered.filter((id) => !isModelOnCooldown(id));
  const onCooldown = filtered.filter((id) => isModelOnCooldown(id));

  return [...notOnCooldown, ...onCooldown];
}

function isExternalSupportModel(model?: string): boolean {
  if (!model) return false;
  return (
    model === "nemotron-3-ultra" ||
    model === "gemma-4-31b" ||
    model === "ling-3.0-flash-vl" ||
    model.includes("nemotron") ||
    model.includes("gemma-4") ||
    model.includes("ling-3")
  );
}

function mapModelName(model?: string): string {
  if (!model) return "gemini-3.5-flash-lite";
  if (model === "nemotron-3-ultra" || model.includes("nemotron")) return "nemotron-3-ultra";
  if (model === "gemma-4-31b" || model.includes("gemma")) return "gemma-4-31b";
  if (model === "ling-3.0-flash-vl" || model.includes("ling")) return "ling-3.0-flash-vl";
  if (model === "gemini-3.1-flash-image" || model.includes("image")) return "gemini-3.1-flash-image";
  if (model === "gemini-3.8-flash") return "gemini-3.8-flash";
  if (model === "gemini-3.5-flash-lite" || model.includes("3.5")) return "gemini-3.5-flash-lite";
  if (model === "gemini-3.1-flash-lite") return "gemini-3.1-flash-lite";
  if (model === "gemini-flash-latest") return "gemini-flash-latest";
  if (model.includes("lite") && model.includes("3.1")) return "gemini-3.1-flash-lite";
  if (model.includes("lite") || model.includes("3.5")) return "gemini-3.5-flash-lite";
  if (model.includes("3.8") || model.includes("flash")) return "gemini-3.8-flash";
  return "gemini-3.5-flash-lite";
}

/**
 * Executes a request to external AI model providers (e.g. OpenRouter or custom endpoint)
 * If no external API key is provided or if an error/rate limit occurs,
 * it returns null so the system can gracefully fall back to Gemini without crashing.
 */
async function callExternalSupportModel(params: {
  modelId: string;
  messages: Array<{ role: string; content: string }>;
  systemInstruction?: string;
  temperature?: number;
}): Promise<string | null> {
  const apiKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.NVIDIA_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.TOGETHER_API_KEY;

  if (!apiKey) {
    return null;
  }

  const mappedModelId = OPENROUTER_MODEL_MAP[params.modelId] || params.modelId;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const formattedMessages: any[] = [];
    if (params.systemInstruction) {
      formattedMessages.push({
        role: "system",
        content: params.systemInstruction,
      });
    }

    for (const m of params.messages) {
      formattedMessages.push({
        role: m.role === "assistant" || m.role === "model" ? "assistant" : "user",
        content: m.content || "",
      });
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.APP_URL || "https://ai.studio",
        "X-Title": "Tulpar AI",
      },
      body: JSON.stringify({
        model: mappedModelId,
        messages: formattedMessages,
        temperature: typeof params.temperature === "number" ? params.temperature : 0.25,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`External model call failed (${res.status}): ${errText}`);
      return null;
    }

    const json: any = await res.json();
    const content = json.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim().length > 0 ? content : null;
  } catch (err: any) {
    console.warn(`External model provider error for ${params.modelId}:`, err?.message || err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extracts all HTTP/HTTPS and domain URLs from text.
 */
function extractUrls(text: string): string[] {
  if (!text) return [];
  const urls: string[] = [];

  // 1. Matches http:// and https:// URLs
  const explicitUrlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
  const explicitMatches = text.match(explicitUrlRegex) || [];
  urls.push(...explicitMatches);

  // 2. Matches www.domain.com...
  const wwwRegex = /(?:^|\s)(www\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`[\]]*)?)/gi;
  let match;
  while ((match = wwwRegex.exec(text)) !== null) {
    const raw = match[1].trim();
    if (raw) urls.push(`https://${raw}`);
  }

  // 3. Matches bare popular domain links like hurriyet.com.tr, wikipedia.org, etc.
  const bareDomainRegex = /(?:^|\s)((?:[a-zA-Z0-9-]+\.)+(?:com\.tr|org\.tr|edu\.tr|gov\.tr|net\.tr|com|org|net|io|co|me|dev|app)(?:\/[^\s<>"{}|\\^`[\]]*)?)/gi;
  while ((match = bareDomainRegex.exec(text)) !== null) {
    const domainStr = match[1].trim();
    if (domainStr && !domainStr.startsWith("http://") && !domainStr.startsWith("https://") && !urls.some(u => u.includes(domainStr))) {
      urls.push(`https://${domainStr}`);
    }
  }

  return [...new Set(urls)];
}

/**
 * Strips HTML tags, scripts and styles, returning clean text and title.
 */
function cleanHtml(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, " ") : "";

  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ");

  cleaned = cleaned.replace(/<\/(p|div|h[1-6]|li|tr|article|section|header|footer)>/gi, "\n");
  cleaned = cleaned.replace(/<br\s*[\/]?>/gi, "\n");
  cleaned = cleaned.replace(/<[^>]+>/g, " ");

  cleaned = cleaned
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&copy;/g, "©")
    .replace(/&trade;/g, "™");

  cleaned = cleaned
    .split("\n")
    .map((line) => line.trim().replace(/[ \t]+/g, " "))
    .filter((line) => line.length > 0)
    .join("\n");

  if (cleaned.length > 14000) {
    cleaned = cleaned.slice(0, 14000) + "\n...[Web sayfası içeriğinin devamı kesildi]";
  }

  return { title, text: cleaned };
}

/**
 * Live fetches a webpage server-side and extracts clean readable text.
 */
async function fetchWebpage(urlStr: string): Promise<{ url: string; title: string; text: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(urlStr, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`Fetch returned status ${res.status} for ${urlStr}`);
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    if (
      !contentType.includes("text") &&
      !contentType.includes("json") &&
      !contentType.includes("xml") &&
      !contentType.includes("html")
    ) {
      return null;
    }

    const raw = await res.text();
    const { title, text } = cleanHtml(raw);
    return {
      url: urlStr,
      title: title || new URL(urlStr).hostname,
      text,
    };
  } catch (e: any) {
    console.warn(`URL fetch failed for ${urlStr}:`, e?.message || e);
    return null;
  }
}

let googleSearchCooldownUntil = 0;

function isGoogleSearchToolUsable(): boolean {
  return Date.now() > googleSearchCooldownUntil;
}

function recordGoogleSearchToolFailure(error: any) {
  const msg = typeof error === "string" ? error : String(error?.message || error?.status || JSON.stringify(error || {}));
  if (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota") ||
    msg.includes("Quota") ||
    msg.includes("rate-limits") ||
    msg.includes("exceeded your current quota")
  ) {
    // Short cooldown (25 seconds) to prevent burst failures while restoring full internet access immediately
    googleSearchCooldownUntil = Date.now() + 25_000;
    console.warn("Google Search tool put on 25s cooldown. Will use web scraper & encyclopedic fallback.");
  }
}

/**
 * Fast encyclopedic fallback for search grounding when Google Search tool is quota-limited.
 */
async function fetchWikiSummary(
  query: string
): Promise<{ title: string; snippet: string; url: string } | null> {
  try {
    const cleanQuery = query
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 5)
      .join(" ");
    if (!cleanQuery || cleanQuery.length < 3) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const url = `https://tr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      cleanQuery
    )}&format=json&utf8=1&srlimit=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "TulparAI/1.0",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data: any = await res.json();
    const hit = data?.query?.search?.[0];
    if (!hit) return null;

    const rawSnippet = hit.snippet || "";
    const cleanSnippet = rawSnippet
      .replace(/<[^>]+>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, "&");

    return {
      title: hit.title,
      snippet: cleanSnippet,
      url: `https://tr.wikipedia.org/wiki/${encodeURIComponent(
        hit.title.replace(/ /g, "_")
      )}`,
    };
  } catch {
    return null;
  }
}

/**
 * Determines whether real-time web search / Google grounding should be activated.
 * STRICT POLICY:
 * 1. Do NOT perform web search for simple, mathematical, conceptual, static, or non-temporal queries.
 * 2. ONLY activate search when up-to-date information, verification/fact-checking,
 *    live financial/sports/weather data, or explicit internet research is requested.
 */
function shouldEnableWebSearch(prompt: string, forceWeb?: boolean): boolean {
  // If user explicitly disabled search, respect it
  if (forceWeb === false) return false;
  if (!prompt || typeof prompt !== "string") return false;

  const trimmed = prompt.trim();
  const lower = trimmed.toLowerCase();

  // 1. If text explicitly contains URLs, live web fetch / grounding is required
  if (extractUrls(trimmed).length > 0 || /https?:\/\/|www\./i.test(lower)) {
    return true;
  }

  // 2. Pure Math / Arithmetic / Calculations -> NEVER search web
  // e.g. "2+2", "15 * 4", "100 / 5", "25'in karekökü", "5 faktöriyel"
  const isPureArithmetic = /^[\d\s+\-*/^().,%=\\x÷]+$/.test(trimmed);
  if (isPureArithmetic) return false;

  const mathKeywords = [
    "kaç eder", "hesapla", "karekök", "faktöriyel", "türev", "integral",
    "üslü sayı", "denklem çöz", "hipotenüs", "üçgenin alanı", "ebob", "ekok",
    "yüzde hesapla", "toplama", "çıkarma", "çarpma", "bölme", "matematik problemi"
  ];
  if (mathKeywords.some((kw) => lower.includes(kw))) {
    const isFinancial = /dolar|euro|faiz|enflasyon|fiyat|zam|asgari|akaryakıt/.test(lower);
    if (!isFinancial) return false;
  }

  // 3. Casual Chit-Chat & Greetings -> NEVER search web
  const pureCasualGreetings = new Set([
    "merhaba", "selam", "selamlar", "günaydın", "iyi günler", "iyi akşamlar",
    "iyi geceler", "nasılsın", "naber", "nasılsınız", "teşekkürler", "sağ ol",
    "sağol", "eyvallah", "rica ederim", "ne yapıyorsun", "ne haber", "görüşürüz",
    "hoşça kal", "bay bay", "kendinden bahset", "yardım et", "adın ne", "kimsin", "sen kimsin"
  ]);
  if (pureCasualGreetings.has(lower) || lower.length < 3) {
    return false;
  }

  // 4. Creative Generation & Writing -> NEVER search web
  const creativeKeywords = [
    "şiir yaz", "bana bir şiir", "masal anlat", "hikaye yaz", "fıkra anlat",
    "fıkra söyle", "şaka yap", "bana bir şaka", "senaryo yaz", "şarkı sözü",
    "kompozisyon", "rol yap", "bana bir tekerleme", "hayali karakter"
  ];
  if (creativeKeywords.some((kw) => lower.includes(kw))) {
    return false;
  }

  // 5. Code Syntax & Core Programming Concepts (timeless) -> NEVER search web
  const timelessCodingKeywords = [
    "usestate", "useeffect", "for döngüsü", "while döngüsü", "array filter",
    "array map", "css flexbox", "css grid", "binary search", "bubble sort",
    "fonksiyon nasıl yazılır", "class nasıl tanımlanır", "regex nedir",
    "html buton", "sql join", "sql select", "git commit", "git push"
  ];
  if (timelessCodingKeywords.some((kw) => lower.includes(kw)) && !/güncel|2025|2026|2027|son sürüm|yeni çıkan/i.test(lower)) {
    return false;
  }

  // 6. Timeless Definitions & General Encyclopedic Knowledge -> NEVER search web
  const timelessDefinitions = [
    "fotosentez nedir", "mitokondri nedir", "hücre nedir", "atom nedir",
    "yerçekimi nedir", "su kaç derecede kaynar", "dünyanın çevresi",
    "türkiye'nin başkenti", "fransa'nın başkenti", "atatürk nerede doğdu",
    "cumhuriyet ne zaman ilan edildi", "istanbul ne zaman fethedildi",
    "kaç gezegen var", "ışık hızı", "periyodik tablo", "cümlenin ögeleri"
  ];
  if (timelessDefinitions.some((def) => lower.includes(def))) {
    return false;
  }

  // 7. Grammar, Linguistics & Translation -> NEVER search web
  const translationKeywords = [
    "türkçeye çevir", "ingilizceye çevir", "çeviri yap", "bu cümleyi düzelt",
    "yazım yanlışı", "imla hatası", "eş anlamlısı nedir", "zıt anlamlısı nedir",
    "kelime anlamı nedir", "sıfat nedir", "zamir nedir"
  ];
  if (translationKeywords.some((kw) => lower.includes(kw))) {
    return false;
  }

  // ==========================================
  // MUST SEARCH WEB (Accuracy & Grounding Required)
  // ==========================================

  // A. Explicit user request for internet research or sources
  const explicitSearchIntent = [
    "internette ara", "internetten bak", "araştır", "google", "webde ara",
    "web'de ara", "kaynak bul", "kaynakları göster", "kaynak belirt",
    "haberleri getir", "link ver", "web sitelerine bak", "internette araştır",
    "internetten araştır", "webden araştır", "internetten bul"
  ];
  if (explicitSearchIntent.some((kw) => lower.includes(kw))) {
    return true;
  }

  // B. Fact-Checking, Verification & Authenticity Check
  const verificationKeywords = [
    "doğru mu", "gerçek mi", "teyit et", "teyidi", "iddia ediliyor",
    "aslı var mı", "yalan mı", "çelişki var mı", "güvenilir mi", "sahte mi",
    "haber doğru mu", "iddiası doğru mu", "öldü mü", "yaşıyor mu",
    "tutuklandı mı", "istifa etti mi", "satıldı mı", "doğruluğu nedir"
  ];
  if (verificationKeywords.some((kw) => lower.includes(kw))) {
    return true;
  }

  // C. Current Events, Temporal Information & Real-Time Data
  const temporalKeywords = [
    "bugün", "dün", "yarın", "şu an", "bu hafta", "bu ay", "bu yıl",
    "güncel", "son dakika", "yeni", "en son", "gündem", "son durum",
    "ne zaman çıkacak", "çıktı mı", "vizyonda", "vizyondaki filmler",
    "son haberler", "gelişmeler", "son gelişme", "2025", "2026", "2027"
  ];
  if (temporalKeywords.some((kw) => lower.includes(kw))) {
    return true;
  }

  // D. Live Financial, Economic & Commodity Indicators
  const financialKeywords = [
    "hava durumu", "hava nasıl", "dolar", "euro", "altın fiyatı", "gram altın",
    "çeyrek altın", "döviz kuru", "borsa", "bist 100", "kripto", "bitcoin",
    "ethereum", "akaryakıt", "benzin", "mazot", "motorin", "lpg", "faiz oranı",
    "enflasyon", "asgari ücret", "memur maaşı", "fiyatı ne kadar", "fiyatı kaç tl",
    "kaç lira"
  ];
  if (financialKeywords.some((kw) => lower.includes(kw))) {
    return true;
  }

  // E. Live Sports, Standings & Match Scores
  const sportsKeywords = [
    "maç sonucu", "maç sonuçları", "puan durumu", "kim şampiyon oldu",
    "maçı kim kazandı", "canlı skor", "fikstür", "maçı ne zaman", "maç kaç kaç"
  ];
  if (sportsKeywords.some((kw) => lower.includes(kw))) {
    return true;
  }

  // F. Current Active Roles, Titles & Living Public Figures
  const publicFigureKeywords = [
    "şu anki başkanı", "şimdiki cumhurbaşkanı", "kim bakan",
    "belediye başkanı kim", "teknik direktörü kim", "en zengin insan",
    "kim kazandı", "seçim sonucu"
  ];
  if (publicFigureKeywords.some((kw) => lower.includes(kw))) {
    return true;
  }

  // Default: Do NOT search for general non-temporal queries
  return false;
}

/**
 * Injects dynamic, real-time calendar, date, day of week, temporal grounding,
 * accuracy-focused web research, multi-source verification, and source citation into Tulpar's system instructions.
 */
function getTulparSystemInstruction(customInstruction?: string): string {
  const now = new Date();

  // Full Turkish date: e.g. "17 Eylül 2026 Perşembe"
  const trDateStr = now.toLocaleDateString("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Istanbul",
  });

  const trTimeStr = now.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });

  const year = now.getFullYear();

  const temporalGrounding = `[ZAMAN BİLGİSİ]: Bugün ${trDateStr}, Saat: ${trTimeStr} (TSİ). Yıl: ${year}. Dünya ve Türkiye gündemine dair bilgilerin bu tarihe göre kesintisiz günceldir.`;

  const coreInstructions = `[TULPAR YAPAY ZEKA TEMEL KİMLİĞİ VE YANIT PRENSİBİ]:
- Adın Tulpar. Google altyapısıyla güçlendirilmiş, hızlı, güvenilir ve yetkin Türkçe yapay zekasın.
- EN TEMEL VE KESİN KURAL: Yanıtların KESİN, KISA, NET VE DOĞRU OLSUN YETER.
- Asla gereksiz girizgah ("Merhaba", "Tabii ki", "Memnuniyetle yardımcı olayım" vb.), laf kalabalığı, dolaylı ifadeler veya kapanış dolgu cümleleri ("Umarım yardımcı olabilmişimdir", "Başka bir sorunuz olursa..." vb.) KULLANMA.
- Sorunun cevabını doğrudan, en öz, en net, kesin ve doğru biçimde ver. Fazladan hiçbir kelime veya gereksiz uzatma olmasın.
- Kullanıcı özellikle "detaylı anlat", "uzun açıkla" veya "kapsamlı analiz et" demedikçe yanıtı daima kısa, net, kesin ve doğru tut.
- Bilgilerin doğruluğu esastır; net, doğru ve teyitli bilgi ver.`;

  const searchAndAccuracyRules = `[İNTERNET ARAŞTIRMASI, DOĞRULUK ODAKLI TEYİT VE KAYNAK KURALLARI]:
1. DOĞRULUK ODAKLI ARAŞTIRMA VE GÜVENİLİR KAYNAKLAR:
   - İnternet araştırmasında birinci öncelik mutlak doğruluk ve güvenilirliktir.
   - Bilgiyi resmi kurumlar, birincil veri sağlayıcıları, tanınmış haber ajansları ve saygın bilimsel/akademik kaynaklarla doğrula.
   - Şüpheli, taraflı, doğrulanmamış blog veya sosyal medya iddialarını kesin gerçek gibi sunma.

2. ÇELİŞKİLİ SONUÇLARI VE VERİ FARKLILIKLARINI BELİRTME:
   - Farklı kaynaklarda veya arama sonuçlarında çelişkili, farklılaşan ya da tartışmalı bilgiler yer alıyorsa; bu durumu gizleme veya tek bir tarafı seçip kestirip atma.
   - Çelişkiyi açık ve şeffaf şekilde belirt (Örnek: "Kaynaklar arasında veri farklılığı bulunmaktadır: [Kaynak A] X değerini belirtirken, [Kaynak B] Y bilgisini vermektedir.").

3. CEVAPTA KAYNAKLARI GÖSTERME:
   - İnternet araması veya canlı web verisiyle elde edilen bilgilerin hangi güvenilir kaynaklardan (kurum, resmi site, haber ajansı, saygın yayın veya bağlantı) alındığını yanıtının içinde veya sonunda açıkça göster (Örnek: "Kaynak: TCMB", "Kaynak: Resmi Gazete", "[Kaynak Adı](URL)").

4. BİLİNMEYEN BİLGİYİ KESİNMİŞ GİBİ SÖYLEMEME:
   - Teyit edilemeyen, henüz netleşmemiş veya güvenilir bir kaynakta bulunmayan bilgiyi asla kesinmiş gibi söyleme.
   - Bilgiye ulaşılamazsa veya belirsizse bunu doğrudan ve dürüstçe açıkla; asla uydurma yapma.

5. GEREKSİZ ARAMA YAPMAMA & ODAKLI SORGULAR:
   - Basit, matematiksel, kavramsal veya güncel bilgi gerektirmeyen sorularda arama yapma; mevcut kesin bilgini doğrudan aktar.
   - Arama yapıldığında sorguyu doğrudan kullanıcının sorusundaki çekirdek konudan oluştur ve ilgisiz sonuçları yanıta dahil etme.`;

  const voiceComprehensionRule = `[SESLİ KONUŞMA VE TRANSKRİPT İŞLEME KURALI]:
- Kullanıcı sesli konuşma transkripti gönderdiğinde; hızlı veya uzun cümlelerde dahi bağlamı eksiksiz koru.
- Konuşma dilindeki küçük fonetik veya transkripsiyon hatalarını anlamı bozmadan akıllıca düzelt.
- Kullanıcının niyetini asla değiştirme ve asla uydurma/halüsinasyon yapma.
- Uzun konuşmalardaki hiçbir detayı veya alt talebi kaybetmeden eksiksiz işle.`;

  if (customInstruction) {
    return `${temporalGrounding}\n\n${coreInstructions}\n\n${searchAndAccuracyRules}\n\n${voiceComprehensionRule}\n\n[ÖZEL TALİMAT]:\n${customInstruction}`;
  }

  return `${temporalGrounding}\n\n${coreInstructions}\n\n${searchAndAccuracyRules}\n\n${voiceComprehensionRule}`;
}

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY ortam değişkeni yapılandırılmamış.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function cleanErrorMessage(error: any): string {
  const msg = String(error?.message || error || "");
  if (
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("high demand") ||
    msg.includes("overloaded")
  ) {
    return "Google Gemini sunucuları şu anda yoğun talep görüyor. Sistem otomatik olarak diğer modelleri denedi, lütfen birkaç saniye sonra tekrar deneyin.";
  }
  if (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota") ||
    msg.includes("Quota") ||
    msg.includes("rate-limits") ||
    msg.includes("exceeded your current quota")
  ) {
    return "Gemini API istek kotasına veya geçici limitine ulaşıldı. Sistem otomatik olarak diğer modelleri denedi; lütfen birkaç saniye sonra tekrar deneyin.";
  }
  if (msg.includes("API key not valid") || msg.includes("API_KEY_INVALID")) {
    return "Geçersiz Gemini API anahtarı. Lütfen anahtarınızı kontrol edin.";
  }
  return error?.message || "Yapay zeka yanıtı üretilirken bir hata oluştu.";
}

// Resilient generateContent with task-based capable model routing, model fallbacks, and optional web search grounding
async function generateWithFallback(params: {
  contents: any;
  config?: any;
  preferredModel?: string;
  enableSearch?: boolean;
  deepThinking?: boolean;
  rawPrompt?: string;
  hasImages?: boolean;
}) {
  const mappedPreferred = mapModelName(params.preferredModel);
  const promptText = params.rawPrompt || "";
  const task = classifyTask({
    hasImages: Boolean(params.hasImages),
    promptText,
    isWebSearchActive: Boolean(params.enableSearch),
  });

  // Get prioritized list of models strictly certified for this task
  const capableModels = getCapableFallbackModels(task, mappedPreferred);

  // If user requested an external support model (Nemotron, Gemma 4, Ling 3.0) and it is capable for this task,
  // first try calling the external provider if configured.
  if (isExternalSupportModel(mappedPreferred) && capableModels.includes(mappedPreferred) && params.rawPrompt) {
    try {
      const extResult = await callExternalSupportModel({
        modelId: mappedPreferred,
        messages: [{ role: "user", content: params.rawPrompt }],
        systemInstruction: params.config?.systemInstruction,
        temperature: params.config?.temperature,
      });

      if (extResult) {
        return {
          response: { text: extResult },
          modelUsed: mappedPreferred,
          groundingMetadata: undefined,
        };
      }
    } catch (extErr) {
      console.warn(`External model attempt for ${mappedPreferred} failed, falling back to capable alternatives:`, extErr);
      recordModelFailure(mappedPreferred, extErr);
    }
  }

  const ai = getGenAI();
  // Filter out purely external models from direct Gemini SDK calls so it never crashes
  const geminiCompatibleModels = capableModels.filter((m) => !isExternalSupportModel(m));

  let lastError: any = null;

  for (const model of geminiCompatibleModels) {
    const searchAttempts = params.enableSearch && isGoogleSearchToolUsable() ? [true, false] : [false];

    for (const withSearch of searchAttempts) {
      if (withSearch && !isGoogleSearchToolUsable()) continue;

      try {
        const config: any = {
          ...params.config,
          ...(params.deepThinking
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } }
            : {}),
          ...(withSearch ? { tools: [{ googleSearch: {} }] } : {}),
        };

        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config,
        });

        // Extract grounding metadata if search was utilized
        const meta = response.candidates?.[0]?.groundingMetadata;
        const sources: { title: string; uri: string }[] = [];
        const queries: string[] = [];

        if (meta?.webSearchQueries) {
          queries.push(...meta.webSearchQueries);
        }
        if (meta?.groundingChunks) {
          for (const c of meta.groundingChunks) {
            if (c.web?.uri) {
              sources.push({
                title: c.web.title || new URL(c.web.uri).hostname,
                uri: c.web.uri,
              });
            }
          }
        }

        return {
          response,
          modelUsed: model,
          groundingMetadata:
            sources.length > 0 || queries.length > 0
              ? { sources, webSearchQueries: queries }
              : undefined,
        };
      } catch (err: any) {
        lastError = err;
        recordModelFailure(model, err);
        if (withSearch) recordGoogleSearchToolFailure(err);
      }
    }
  }

  // If task required vision and no capable model succeeded, return clear informative explanation without hallucination
  if (task === "vision") {
    const visionExhaustedMsg =
      "Görsel analiz yeteneğine sahip modellerin (Tulpar 3.8 Flash ve Ling 3.0 Flash VL) geçici kotası doldu veya servise ulaşılamıyor. Görevin doğruluğunu korumak için yeteneksiz modellere yönlendirilmedi ve uydurma yanıt verilmedi. Lütfen kısa süre sonra tekrar deneyin.";
    return {
      response: { text: visionExhaustedMsg },
      modelUsed: "guvenli-rota-bilgilendirme",
      groundingMetadata: undefined,
    };
  }

  throw lastError;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: "ok",
    hasApiKey: hasKey,
    models: DEFAULT_MODELS,
    appName: "Tulpar",
  });
});

// Endpoint to directly fetch and scrape any website on demand
app.post("/api/fetch-web", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL parametresi gereklidir." });
    }
    const data = await fetchWebpage(url);
    if (!data) {
      return res.status(404).json({ error: "Web sayfası içeriği alınamadı veya erişim engellendi." });
    }
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Sayfa getirilemedi." });
  }
});

// Generic text & multimodal generation endpoint
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, systemInstruction, image, images, temperature, model, webSearch } = req.body;

    const imageList: any[] = [];
    if (Array.isArray(images) && images.length > 0) {
      imageList.push(...images);
    } else if (image?.data && image?.mimeType) {
      imageList.push(image);
    }

    if (!prompt && imageList.length === 0) {
      return res.status(400).json({ error: "İstem veya en az bir görsel zorunludur." });
    }

    let effectivePrompt = prompt || "";

    // Check if user requested finding/searching web images to download (including "görsel ver", "resim ver")
    const isWebImageSearch = [
      "görsel bul", "resim bul", "fotoğraf bul", "internetten bul", "netten bul",
      "bul ve indir", "görsel ara", "resim ara", "fotoğraf ara",
      "görsel ver", "resim ver", "fotoğraf ver", "görsel göster", "resim göster"
    ].some((kw) => effectivePrompt.toLowerCase().includes(kw));

    if (isWebImageSearch && imageList.length === 0) {
      const cleanQuery = effectivePrompt
        .replace(/^(görsel bul|resim bul|fotoğraf bul|internetten bul|netten bul|bul ve indir|görsel ara|resim ara|fotoğraf ara|görsel ver|resim ver|fotoğraf ver|görsel göster|resim göster)\s*/i, "")
        .trim() || effectivePrompt;

      const webImages = await searchWebImages(cleanQuery);
      if (webImages.length > 0) {
        let responseText = `İstediğiniz **"${cleanQuery}"** konusuna uygun bulduğum görseller (üzerine tıklayıp veya sağ tıklayıp doğrudan indirebilirsiniz):\n\n`;
        webImages.forEach((img, idx) => {
          responseText += `### ${idx + 1}. ${img.title}\n`;
          responseText += `![${img.title}](${img.url})\n`;
          responseText += `📥 **[Görseli İndir / Tam Boyut](${img.url})**\n\n`;
        });
        return res.json({
          text: responseText,
          modelUsed: "tulpar-web-image-search",
        });
      }
    }

    // Check if user requested explicit AI image generation or image editing using Gemini 3.1 Flash Image
    const isImageGen = [
      "görsel üret", "resim çiz", "fotoğraf oluştur", "görsel oluştur",
      "resmini çiz", "çiz", "illüstrasyon yap", "görsel yap",
      "generate image", "draw a", "create an image", "resim yap", "logo tasarla",
      "afiş oluştur", "wallpaper yap", "resim çizdir"
    ].some((kw) => effectivePrompt.toLowerCase().includes(kw));

    const isImageEdit = imageList.length > 0 && [
      "düzenle", "değiştir", "ekle", "kaldır", "dönüştür", "boya", "edit", "modify", "change", "transform"
    ].some((kw) => effectivePrompt.toLowerCase().includes(kw));

    if (isImageGen || isImageEdit) {
      try {
        const aiClient = getGenAI();
        const cleanPrompt = effectivePrompt
          .replace(/^(görsel üret|resim çiz|fotoğraf oluştur|görsel oluştur|resmini çiz|görsel ver|resim ver|çiz|illüstrasyon yap|görsel yap|generate image|draw a|create an image|resim yap|logo tasarla|afiş oluştur|wallpaper yap|resim çizdir)\s*/i, "")
          .trim() || effectivePrompt;

        if (imageList.length > 0) {
          const parts: any[] = [];
          for (const img of imageList) {
            if (img?.data) {
              const base64Data = img.data.replace(/^data:[^;]+;base64,/, "");
              parts.push({
                inlineData: {
                  mimeType: img.mimeType || "image/jpeg",
                  data: base64Data,
                },
              });
            }
          }

          const smartEditingPrompt = `[AKILLI GÖRSEL DÜZENLEME KATMANI - SMART IMAGE EDITING LAYER]
Kullanıcı Talimatı: "${effectivePrompt}"
Görev: Yukarıda sağlanan referans görsel(ler)i analiz et. Kullanıcının belirttiği kompozisyon, ekleme, çıkarma, renk değişimi, arka plan veya nesne dönüştürme işlemlerini gerçekleştirirken orijinal kişi, yüz, kıyafet ve nesne kimliklerini (identity/features) mümkün olduğunca koru. Değişiklikleri kontrollü, yüksek kaliteli ve estetik yap.`;

          parts.push({ text: smartEditingPrompt });

          const editRes = await aiClient.models.generateContent({
            model: 'gemini-3.1-flash-image',
            contents: parts,
          });

          const responseText = editRes.text || "Akıllı Görsel Düzenleme Katmanı ile görseliniz işlendi.";
          
          let generatedImageMarkdown = "";
          const candidateParts = (editRes as any)?.candidates?.[0]?.content?.parts;
          if (Array.isArray(candidateParts)) {
            for (const p of candidateParts) {
              if (p?.inlineData?.data) {
                const mime = p.inlineData.mimeType || "image/jpeg";
                const b64 = p.inlineData.data;
                const dataUrl = `data:${mime};base64,${b64}`;
                generatedImageMarkdown += `\n\n![Düzenlenen Görsel](${dataUrl})`;
              }
            }
          }

          return res.json({
            text: responseText + generatedImageMarkdown,
            modelUsed: "gemini-3.1-flash-image",
          });
        } else {
          const imageRes = await aiClient.models.generateImages({
            model: 'gemini-3.1-flash-image',
            prompt: cleanPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1',
            },
          });
          const bytes = imageRes.generatedImages?.[0]?.image?.imageBytes;
          if (bytes) {
            const dataUrl = `data:image/jpeg;base64,${bytes}`;
            return res.json({
              text: `İstediğiniz görsel **"${cleanPrompt}"** için **Gemini 3.1 Flash Image** ile başarıyla oluşturuldu:\n\n![${cleanPrompt}](${dataUrl})`,
              modelUsed: "gemini-3.1-flash-image",
            });
          }
        }
      } catch (genErr: any) {
        console.warn("Image gen primary quota/error, falling back to robust visual engine:", genErr?.message);
        const cleanPrompt = effectivePrompt
          .replace(/^(görsel üret|resim çiz|fotoğraf oluştur|görsel oluştur|resmini çiz|görsel ver|resim ver|çiz|illüstrasyon yap|görsel yap|generate image|draw a|create an image|resim yap|logo tasarla|afiş oluştur|wallpaper yap|resim çizdir|resim göster|görsel göster)\s*/i, "")
          .trim() || effectivePrompt;

        const encodedPrompt = encodeURIComponent(cleanPrompt + ", high quality, detailed");
        const imageUrl = `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=42`;

        return res.json({
          text: `İstediğiniz görsel **"${cleanPrompt}"** başarıyla oluşturuldu:\n\n![${cleanPrompt}](${imageUrl})`,
          modelUsed: "tulpar-visual-engine-fallback",
        });
      }
    }

    let fetchedWebpage: { url: string; title: string; text: string } | null = null;

    // Check if prompt contains URL(s) to scrape live with full internet authority
    const detectedUrls = extractUrls(effectivePrompt);
    const fetchedWebpages: { url: string; title: string; text: string }[] = [];
    if (detectedUrls.length > 0) {
      const pageResults = await Promise.allSettled(
        detectedUrls.slice(0, 3).map((u) => fetchWebpage(u))
      );
      for (const res of pageResults) {
        if (res.status === "fulfilled" && res.value && res.value.text) {
          fetchedWebpages.push(res.value);
        }
      }
      if (fetchedWebpages.length > 0) {
        fetchedWebpage = fetchedWebpages[0];
        const webBlocks = fetchedWebpages
          .map(
            (p, idx) =>
              `[İNTERNETTEN CANLI ERİŞİLEN WEB SAYFASI #${idx + 1}]\nKaynak URL: ${p.url}\nBaşlık: ${p.title}\nİçerik:\n${p.text}`
          )
          .join("\n\n--------------------------------------------\n\n");
        effectivePrompt = `${webBlocks}\n\n--------------------------------------------\n[KULLANICI TALEBİ]:\n${effectivePrompt}`;
      }
    }

    const parts: any[] = [];

    for (const img of imageList) {
      if (img?.data && img?.mimeType) {
        const base64Data = img.data.replace(/^data:[^;]+;base64,/, "");
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: base64Data,
          },
        });
      }
    }

    if (effectivePrompt) {
      parts.push({
        text: effectivePrompt,
      });
    }

    const isWebSearchNeeded = shouldEnableWebSearch(prompt, webSearch);

    const { response, modelUsed, groundingMetadata } = await generateWithFallback({
      contents: { parts },
      preferredModel: model,
      rawPrompt: effectivePrompt,
      hasImages: imageList.length > 0,
      enableSearch: isWebSearchNeeded,
      config: {
        systemInstruction: getTulparSystemInstruction(systemInstruction),
        temperature: typeof temperature === "number" ? temperature : 0.25,
      },
    });

    const combinedGrounding: any = groundingMetadata || (fetchedWebpage ? {} : undefined);
    if (combinedGrounding && fetchedWebpage) {
      combinedGrounding.fetchedUrl = {
        url: fetchedWebpage.url,
        title: fetchedWebpage.title,
      };
    }

    return res.json({
      text: response.text || "",
      modelUsed,
      groundingMetadata: combinedGrounding,
    });
  } catch (error: any) {
    console.error("Generate error:", error?.message || "Generation failed");
    return res.status(500).json({
      error: cleanErrorMessage(error),
    });
  }
});

// Ultra-fast low-latency Voice Chat endpoint optimized for conversational voice interaction
app.post("/api/voice-chat", async (req, res) => {
  try {
    const { query, history, image, model } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Soru metni gereklidir." });
    }

    const parts: any[] = [];
    if (image?.data && image?.mimeType) {
      parts.push({
        inlineData: {
          data: image.data,
          mimeType: image.mimeType,
        },
      });
    }

    // Build concise history context (last 3 messages) so context is never lost
    let historyContext = "";
    if (Array.isArray(history) && history.length > 0) {
      const recent = history.slice(-4);
      historyContext = "\n[Önceki Konuşma Geçmişi]:\n" + recent.map(
        (m: any) => `${m.role === "user" ? "Kullanıcı" : "Tulpar"}: ${m.content}`
      ).join("\n");
    }

    const voicePrompt = `Kullanıcının Sesli Sorusu: "${query.trim()}"${historyContext}`;
    parts.push({ text: voicePrompt });

    const systemInstruction = `Senin adın Tulpar. Hızlı, yetkin ve berrak Türkçe sesli asistanısın.
ÖNEMLİ KURALLAR:
1. Kullanıcı mikrofonla sesli konuştuğu için kelimelerde küçük yazım/fonetik algılama hataları olabilir. Sözün bağlamından kullanıcının ne demek istediğini akıllıca anla ve doğrudan yanıtla.
2. EN TEMEL KURAL: Yanıtın kesin, kısa, net ve doğru olsun yeter. En fazla 1-2 kısa cümleyle yanıtla.
3. KESİNLİKLE markdown formatı (*, **, #, _, -, madde işaretleri) veya gereksiz giriş/kapanış dolgu kelimeleri KULLANMA.
4. Yanıtı hiçbir gecikme olmadan doğrudan ver.`;

    const { response, modelUsed } = await generateWithFallback({
      contents: { parts },
      preferredModel: "gemini-3.1-flash-lite",
      enableSearch: false,
      config: {
        systemInstruction,
        temperature: 0.25,
        maxOutputTokens: 120,
      },
    });

    let cleanText = (response.text || "Anladım, dinliyorum.")
      .replace(/[*#`_~]/g, "")
      .replace(/\[.*?\]\(.*?\)/g, "")
      .replace(/[\n\r]+/g, " ")
      .trim();

    return res.json({
      text: cleanText,
      modelUsed,
    });
  } catch (error: any) {
    console.error("Voice chat error:", error?.message || "Voice chat failed");
    return res.status(500).json({
      error: cleanErrorMessage(error),
    });
  }
});

// High-fidelity natural voice audio synthesis stream endpoint
app.get("/api/tts", async (req, res) => {
  try {
    const rawText = String(req.query.text || "").trim();
    if (!rawText) {
      return res.status(400).send("Text is required");
    }

    // Clean text of symbols and emojis
    const cleanText = rawText
      .replace(/[*#`_~]/g, "")
      .replace(/\[.*?\]\(.*?\)/g, "")
      .replace(/[^\p{L}\p{N}\s.,!?:;'-]/gu, "")
      .slice(0, 320);

    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=tr&client=tw-ob&q=${encodeURIComponent(cleanText)}`;

    const upstream = await fetch(ttsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send("Upstream TTS error");
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    const buffer = await upstream.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.error("TTS endpoint error:", err?.message || err);
    return res.status(500).send("TTS generation failed");
  }
});

// High-speed, unbuffered Streaming Chat endpoint with Server-Sent Events (SSE)
// Supports real-time internet search and website content inspection
app.post("/api/chat/stream", async (req, res) => {
  try {
    const { messages, systemInstruction, image, images, model, webSearch, deepThinking } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Mesaj listesi gereklidir." });
    }

    const imageList: any[] = [];
    if (Array.isArray(images) && images.length > 0) {
      imageList.push(...images);
    } else if (image?.data && image?.mimeType) {
      imageList.push(image);
    }

    // Identify last user message
    const lastIndex = messages.length - 1;
    const lastUserMsg = messages[lastIndex];
    const lastUserText = lastUserMsg?.role === "user" ? lastUserMsg.content || "" : "";

    // Check for URLs to scrape live
    const detectedUrls = extractUrls(lastUserText);
    const fetchedWebpages: { url: string; title: string; text: string }[] = [];
    if (detectedUrls.length > 0) {
      const pageResults = await Promise.allSettled(
        detectedUrls.slice(0, 3).map((u) => fetchWebpage(u))
      );
      for (const res of pageResults) {
        if (res.status === "fulfilled" && res.value && res.value.text) {
          fetchedWebpages.push(res.value);
        }
      }
    }

    const isWebSearchActive = shouldEnableWebSearch(lastUserText, webSearch) || fetchedWebpages.length > 0;

    let fallbackWikiInfo: { title: string; snippet: string; url: string } | null = null;
    if (isWebSearchActive && fetchedWebpages.length === 0 && !isGoogleSearchToolUsable()) {
      fallbackWikiInfo = await fetchWikiSummary(lastUserText);
    }

    const contents = messages.map(
      (msg: { role: string; content: string }, index: number) => {
        const isLast = index === lastIndex;
        const parts: any[] = [];

        if (isLast && msg.role === "user" && imageList.length > 0) {
          for (const img of imageList) {
            if (img?.data && img?.mimeType) {
              const base64Data = img.data.replace(/^data:[^;]+;base64,/, "");
              parts.push({
                inlineData: {
                  mimeType: img.mimeType,
                  data: base64Data,
                },
              });
            }
          }
        }

        let textContent = msg.content || "";
        if (isLast && msg.role === "user") {
          const contextBlocks: string[] = [];
          if (fetchedWebpages.length > 0) {
            const webContexts = fetchedWebpages
              .map(
                (p, idx) =>
                  `[İNTERNETTEN CANLI ERİŞİLEN WEB SAYFASI #${idx + 1}]\nKaynak URL: ${p.url}\nSayfa Başlığı: ${p.title}\nSayfa İçeriği:\n${p.text}`
              )
              .join("\n\n--------------------------------------------\n\n");
            contextBlocks.push(webContexts);
          }
          if (fallbackWikiInfo) {
            contextBlocks.push(
              `[GÜNCEL REFERANS BİLGİSİ - ${fallbackWikiInfo.title}]\n${fallbackWikiInfo.snippet}\nKaynak: ${fallbackWikiInfo.url}`
            );
          }
          if (contextBlocks.length > 0) {
            textContent = `${contextBlocks.join("\n\n--------------------------------------------\n\n")}\n\n--------------------------------------------\n[KULLANICI İSTEMİ]:\n${textContent}`;
          }
        }

        parts.push({ text: textContent });

        return {
          role: msg.role === "assistant" ? "model" : "user",
          parts,
        };
      }
    );

    const ai = getGenAI();
    const mappedPreferred = mapModelName(model);

    // Classify incoming user task to enforce capability requirements
    const task = classifyTask({
      hasImages: imageList.length > 0,
      promptText: lastUserText,
      isWebSearchActive,
    });

    // Get strictly capable prioritized models for this task
    const capableModels = getCapableFallbackModels(task, mappedPreferred);

    // If external support model is selected and certified for this task, attempt external provider first
    if (isExternalSupportModel(mappedPreferred) && capableModels.includes(mappedPreferred)) {
      try {
        const extResult = await callExternalSupportModel({
          modelId: mappedPreferred,
          messages,
          systemInstruction: getTulparSystemInstruction(systemInstruction),
          temperature: 0.25,
        });

        if (extResult) {
          // Stream the external result smoothly over SSE
          res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache, no-transform");
          res.setHeader("Connection", "keep-alive");
          res.setHeader("X-Accel-Buffering", "no");
          res.flushHeaders?.();

          res.write(`data: ${JSON.stringify({ modelUsed: mappedPreferred })}\n\n`);

          // Split into words/chunks for natural streaming feel
          const words = extResult.split(/(\s+)/);
          for (const word of words) {
            if (word) {
              res.write(`data: ${JSON.stringify({ text: word })}\n\n`);
            }
          }

          if (fetchedWebpages.length > 0) {
            res.write(
              `data: ${JSON.stringify({
                groundingMetadata: {
                  sources: [{ url: fetchedWebpages[0].url, title: fetchedWebpages[0].title }],
                  webSearchQueries: [],
                },
              })}\n\n`
            );
          }

          res.write("data: [DONE]\n\n");
          return res.end();
        }
      } catch (extErr) {
        console.warn(`External streaming attempt for ${mappedPreferred} failed, falling back to capable alternatives:`, extErr);
        recordModelFailure(mappedPreferred, extErr);
      }
    }

    // Prepare Gemini models to try (external models excluded from direct Gemini calls to avoid errors)
    const geminiCompatibleModels = capableModels.filter((m) => !isExternalSupportModel(m));
    const modelsToTry = geminiCompatibleModels;

    let activeIterator: any = null;
    let firstChunk: any = null;
    let successfulModel = "";
    let lastError: any = null;

    for (const modelToUse of modelsToTry) {
      // If web search is active and tool is usable, attempt with search tool first; if that errors or times out, fall back immediately without search
      const searchAttempts = isWebSearchActive && isGoogleSearchToolUsable() ? [true, false] : [false];
      let attemptSucceeded = false;

      for (const withSearch of searchAttempts) {
        if (withSearch && !isGoogleSearchToolUsable()) continue;

        try {
          const config: any = {
            systemInstruction: getTulparSystemInstruction(systemInstruction),
            temperature: 0.25,
            ...(deepThinking
              ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } }
              : {}),
          };
          if (withSearch) {
            config.tools = [{ googleSearch: {} }];
          }

          // Use strict abort timeout so unresponsive or hanging Google endpoints fail over immediately to the next candidate model
          const streamAbortController = new AbortController();
          const timeoutLimit = (withSearch || deepThinking) ? 7000 : 4500;
          const streamTimeoutId = setTimeout(() => streamAbortController.abort(), timeoutLimit);

          let responseStream: any;
          try {
            responseStream = await ai.models.generateContentStream({
              model: modelToUse,
              contents,
              config: {
                ...config,
                signal: streamAbortController.signal,
              },
            });
          } catch (initErr) {
            clearTimeout(streamTimeoutId);
            throw initErr;
          }

          const iterator = responseStream[Symbol.asyncIterator]();
          const firstPromise = iterator.next();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Model connection timeout")), timeoutLimit)
          );
          const first: any = await Promise.race([firstPromise, timeoutPromise]);
          clearTimeout(streamTimeoutId);

          activeIterator = iterator;
          firstChunk = first;
          successfulModel = modelToUse;
          attemptSucceeded = true;
          break;
        } catch (attemptErr: any) {
          lastError = attemptErr;
          recordModelFailure(modelToUse, attemptErr);
          if (withSearch) recordGoogleSearchToolFailure(attemptErr);
        }
      }

      if (attemptSucceeded) {
        break;
      }
    }

    // If all models failed to initiate a stream
    if (!activeIterator) {
      // If special capability (like vision) was required and no model could perform it, provide truthful notice
      if (task === "vision") {
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();
        res.write(`data: ${JSON.stringify({ modelUsed: "guvenli-rota-bilgilendirme" })}\n\n`);
        const explanation =
          "Görsel analiz yeteneğine sahip modellerin geçici kotası doldu veya servise ulaşılamıyor. Görevin doğruluğunu korumak adına yeteneksiz modellere yönlendirilmedi ve uydurma yanıt verilmedi. Lütfen kısa süre sonra görselinizi tekrar gönderin.";
        res.write(`data: ${JSON.stringify({ text: explanation })}\n\n`);
        res.write("data: [DONE]\n\n");
        return res.end();
      }

      const friendlyError = cleanErrorMessage(lastError);
      return res.status(500).json({ error: friendlyError });
    }

    // Model responded successfully! Send SSE headers
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Instruct reverse proxies not to buffer
    res.flushHeaders?.();

    // Send model metadata
    res.write(`data: ${JSON.stringify({ modelUsed: successfulModel })}\n\n`);

    const collectedQueries: string[] = [];
    const collectedSources: { title: string; uri: string }[] = [];

    // Seed sources with directly fetched webpage URLs and wiki summaries
    for (const page of fetchedWebpages) {
      if (!collectedSources.some((s) => s.uri === page.url)) {
        collectedSources.push({
          title: page.title || new URL(page.url).hostname,
          uri: page.url,
        });
      }
    }

    if (fallbackWikiInfo && !collectedSources.some((s) => s.uri === fallbackWikiInfo!.url)) {
      collectedSources.push({
        title: `Vikipedi: ${fallbackWikiInfo.title}`,
        uri: fallbackWikiInfo.url,
      });
      if (!collectedQueries.includes(fallbackWikiInfo.title)) {
        collectedQueries.push(fallbackWikiInfo.title);
      }
    }

    // Helper to collect grounding
    const processGrounding = (chunkVal: any) => {
      const meta = chunkVal?.candidates?.[0]?.groundingMetadata;
      if (meta) {
        if (meta.webSearchQueries && Array.isArray(meta.webSearchQueries)) {
          for (const q of meta.webSearchQueries) {
            if (q && !collectedQueries.includes(q)) collectedQueries.push(q);
          }
        }
        if (meta.groundingChunks && Array.isArray(meta.groundingChunks)) {
          for (const c of meta.groundingChunks) {
            if (c.web?.uri) {
              if (!collectedSources.some((s) => s.uri === c.web.uri)) {
                collectedSources.push({
                  title: c.web.title || new URL(c.web.uri).hostname,
                  uri: c.web.uri,
                });
              }
            }
          }
        }
      }
    };

    let accumulatedText = "";

    try {
      if (firstChunk?.value) {
        processGrounding(firstChunk.value);
        if (firstChunk.value.text) {
          accumulatedText += firstChunk.value.text;
          res.write(`data: ${JSON.stringify({ text: firstChunk.value.text })}\n\n`);
        }
      }

      while (true) {
        const { done, value } = await activeIterator.next();
        if (done) break;
        if (value) {
          processGrounding(value);
          if (value.text) {
            accumulatedText += value.text;
            res.write(`data: ${JSON.stringify({ text: value.text })}\n\n`);
          }
        }
      }
    } catch (chunkErr: any) {
      if (!accumulatedText) {
        res.write(`data: ${JSON.stringify({ error: cleanErrorMessage(chunkErr) })}\n\n`);
      }
    }

    // If task is image generation or model is gemini-3.1-flash-image, ensure a direct rendered visual image is included in the chat response
    if (task === "image_generation" || successfulModel === "gemini-3.1-flash-image" || lastUserText.toLowerCase().includes("çiz") || lastUserText.toLowerCase().includes("oluştur") || lastUserText.toLowerCase().includes("resim") || lastUserText.toLowerCase().includes("görsel")) {
      if (!accumulatedText.includes("![") && !accumulatedText.includes("<img")) {
        const imageGenUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(lastUserText)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
        const imageMarkdown = `\n\n### 🎨 Oluşturulan Görsel:\n\n![${lastUserText}](${imageGenUrl})\n\n`;
        accumulatedText += imageMarkdown;
        res.write(`data: ${JSON.stringify({ text: imageMarkdown })}\n\n`);
      }
    }

    // If grounding sources or fetched web pages exist, emit metadata event
    if (collectedSources.length > 0 || collectedQueries.length > 0 || fetchedWebpages.length > 0) {
      res.write(
        `data: ${JSON.stringify({
          groundingMetadata: {
            sources: collectedSources,
            webSearchQueries: collectedQueries,
            fetchedUrl: fetchedWebpages.length > 0
              ? { url: fetchedWebpages[0].url, title: fetchedWebpages[0].title }
              : undefined,
          },
        })}\n\n`
      );
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Chat stream error:", error?.message || "Stream failed");
    if (!res.headersSent) {
      return res.status(500).json({ error: cleanErrorMessage(error) });
    }
    res.end();
  }
});

// Start server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Server running on port ${PORT}`);
  });
}

startServer();
