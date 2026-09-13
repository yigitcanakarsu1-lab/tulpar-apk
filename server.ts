import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 images
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Candidate Gemini models:
// gemini-3.8-flash is the newest, most capable free-tier text & multimodal model.
const DEFAULT_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
];

function mapModelName(model?: string): string {
  if (!model) return "gemini-3.8-flash";
  if (model.includes("3.8")) return "gemini-3.8-flash";
  if (model.includes("3.6")) return "gemini-3.6-flash";
  if (model.includes("3.5")) return "gemini-3.5-flash-lite";
  if (model.includes("2.5-flash-lite")) return "gemini-3.5-flash-lite";
  if (model.includes("2.5-flash")) return "gemini-3.6-flash";
  return model;
}

/**
 * Injects dynamic, real-time calendar, date, day of week and temporal grounding
 * into Tulpar's system instructions.
 */
function getTulparSystemInstruction(customInstruction?: string): string {
  const now = new Date();

  // Full Turkish date: e.g. "12 Eylül 2026 Cumartesi"
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
  const month = now.toLocaleDateString("tr-TR", {
    month: "long",
    timeZone: "Europe/Istanbul",
  });
  const day = now.getDate();
  const weekday = now.toLocaleDateString("tr-TR", {
    weekday: "long",
    timeZone: "Europe/Istanbul",
  });

  const temporalGrounding = `[GÜNCEL TAKVİM VE ZAMAN BİLGİSİ]:
- Bugünün Tam Tarihi: ${trDateStr}
- Yıl: ${year}
- Ay: ${month}
- Gün: ${day} (${weekday})
- Saat (Türkiye / TSİ): ${trTimeStr}
- Takvimin, günümüz dünya olayları, tarih bilgin ve zaman algın bu tarihe göre kesintisiz olarak günceldir. Kullanıcı sana gün, ay, yıl, takvim, bugünün tarihi, haftanın günü veya zamanla ilgili herhangi bir soru sorduğunda bu gerçek zamanlı bilgiyi temel alarak net, kesin ve kendinden emin yanıt ver. Kesinlikle eski veya geçmiş bir tarihte olduğunu düşünme.`;

  const baseInstruction = `Senin adın Tulpar. Google'ın en yeni, son teknoloji, tamamen ücretsiz ve en güçlü yapay zeka mimarisi üzerine kurulu Türkçe asistanısın.
Kullanıcı kim olduğunu veya adını sorduğunda adının Tulpar olduğunu belirt.
Her zaman kibar, samimi, yüksek zekalı, analitik, yardımsever ve üretkensin.
Kodlama, matematik, yaratıcı yazarlık, görsel analizi, planlama, takvim yönetimi ve günlük konularda en üstün yeteneklere sahipsin.
Kullanıcının sorularını net, akıcı ve güzel biçimlendirilmiş Markdown formatında cevapla.`;

  if (customInstruction) {
    return `${temporalGrounding}\n\n${baseInstruction}\n\n[GÖREV TALİMATI]:\n${customInstruction}`;
  }

  return `${temporalGrounding}\n\n${baseInstruction}`;
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
  if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand")) {
    return "Yapay zeka servisi şu anda yoğun talep görüyor. Sistem otomatik olarak yanıt oluşturmaya çalışıyor, lütfen gerekirse tekrar deneyin.";
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
    return "İstek kotasına ulaşıldı. Lütfen kısa bir süre sonra tekrar deneyin.";
  }
  if (msg.includes("API key not valid") || msg.includes("API_KEY_INVALID")) {
    return "Geçersiz Gemini API anahtarı. Lütfen anahtarınızı kontrol edin.";
  }
  return error?.message || "Yapay zeka yanıtı üretilirken bir hata oluştu.";
}

// Resilient generateContent with model fallbacks & 0 thinking delay
async function generateWithFallback(params: {
  contents: any;
  config?: any;
  preferredModel?: string;
}) {
  const ai = getGenAI();
  const mappedPreferred = mapModelName(params.preferredModel);
  const modelsToTry = [
    mappedPreferred,
    ...DEFAULT_MODELS.filter((m) => m !== mappedPreferred),
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const mergedConfig = {
        thinkingConfig: {
          thinkingBudget: 0,
        },
        ...params.config,
      };

      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: mergedConfig,
      });
      return { response, modelUsed: model };
    } catch (err: any) {
      console.warn(`Model ${model} hatası:`, err?.message || err);
      lastError = err;
      const msg = String(err?.message || "");
      if (
        msg.includes("503") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("high demand") ||
        msg.includes("429") ||
        msg.includes("404")
      ) {
        continue;
      }
      break;
    }
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

// Generic text & multimodal generation endpoint
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, systemInstruction, image, temperature, model } = req.body;

    if (!prompt && !image) {
      return res.status(400).json({ error: "İstem veya görsel zorunludur." });
    }

    const parts: any[] = [];

    if (image?.data && image?.mimeType) {
      const base64Data = image.data.replace(/^data:[^;]+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: base64Data,
        },
      });
    }

    if (prompt) {
      parts.push({
        text: prompt,
      });
    }

    const { response, modelUsed } = await generateWithFallback({
      contents: { parts },
      preferredModel: model,
      config: {
        systemInstruction: getTulparSystemInstruction(systemInstruction),
        temperature: typeof temperature === "number" ? temperature : 0.7,
      },
    });

    return res.json({ text: response.text || "", modelUsed });
  } catch (error: any) {
    console.error("Generate error:", error);
    return res.status(500).json({
      error: cleanErrorMessage(error),
    });
  }
});

// High-speed, unbuffered Streaming Chat endpoint with Server-Sent Events (SSE)
app.post("/api/chat/stream", async (req, res) => {
  try {
    const { messages, systemInstruction, image, model } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Mesaj listesi gereklidir." });
    }

    const contents = messages.map(
      (msg: { role: string; content: string }, index: number) => {
        const isLast = index === messages.length - 1;
        const parts: any[] = [];

        if (isLast && msg.role === "user" && image?.data && image?.mimeType) {
          const base64Data = image.data.replace(/^data:[^;]+;base64,/, "");
          parts.push({
            inlineData: {
              mimeType: image.mimeType,
              data: base64Data,
            },
          });
        }

        parts.push({ text: msg.content || "" });

        return {
          role: msg.role === "assistant" ? "model" : "user",
          parts,
        };
      }
    );

    const ai = getGenAI();
    const mappedPreferred = mapModelName(model);
    const modelsToTry = [
      mappedPreferred,
      ...DEFAULT_MODELS.filter((m) => m !== mappedPreferred),
    ];

    let streamStarted = false;
    let lastError: any = null;

    for (const modelToUse of modelsToTry) {
      try {
        const responseStream = await ai.models.generateContentStream({
          model: modelToUse,
          contents,
          config: {
            systemInstruction: getTulparSystemInstruction(systemInstruction),
            thinkingConfig: {
              thinkingBudget: 0, // Minimizes delay by not spending time thinking
            },
          },
        });

        const iterator = responseStream[Symbol.asyncIterator]();
        const first = await iterator.next();

        // Model responded successfully! Send SSE headers immediately
        if (!res.headersSent) {
          res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache, no-transform");
          res.setHeader("Connection", "keep-alive");
          res.setHeader("X-Accel-Buffering", "no"); // Instruct reverse proxies not to buffer
          res.flushHeaders?.();
          streamStarted = true;
        }

        // Send model metadata
        res.write(`data: ${JSON.stringify({ modelUsed: modelToUse })}\n\n`);

        if (first.value?.text) {
          res.write(`data: ${JSON.stringify({ text: first.value.text })}\n\n`);
        }

        while (true) {
          const { done, value } = await iterator.next();
          if (done) break;
          if (value?.text) {
            res.write(`data: ${JSON.stringify({ text: value.text })}\n\n`);
          }
        }

        res.write("data: [DONE]\n\n");
        res.end();
        return; // Successfully finished streaming
      } catch (err: any) {
        console.warn(`Model ${modelToUse} stream hatası:`, err?.message || err);
        lastError = err;

        // If error occurred after headers were sent (mid-stream failure)
        if (streamStarted) {
          res.write(`data: ${JSON.stringify({ error: cleanErrorMessage(err) })}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
          return;
        }
        // Otherwise, loop to the next candidate model seamlessly!
      }
    }

    // If all candidate models failed before streaming could start
    const friendlyError = cleanErrorMessage(lastError);
    if (!res.headersSent) {
      return res.status(500).json({ error: friendlyError });
    }
    res.write(`data: ${JSON.stringify({ error: friendlyError })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Fatal chat stream error:", error);
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
