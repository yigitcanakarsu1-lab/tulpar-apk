import React, { useState, useRef } from "react";
import {
  UploadCloud,
  Image as ImageIcon,
  Sparkles,
  Search,
  FileText,
  Palette,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";

const PRESET_ACTIONS = [
  {
    id: "describe",
    label: "Detaylı Açıkla",
    icon: Search,
    prompt:
      "Bu görselde ne görüyorsun? Özneleri, renkleri, kompozisyonu, arka planı ve tüm detayları zengin bir Türkçe ile açıkla.",
  },
  {
    id: "ocr",
    label: "Metinleri Çıkar (OCR)",
    icon: FileText,
    prompt:
      "Görselin içerisindeki tüm metinleri, başlıkları, sayıları ve verileri tespit et ve okunabilir, yapılandırılmış bir formatta dök.",
  },
  {
    id: "design",
    label: "Tasarım & Estetik Analizi",
    icon: Palette,
    prompt:
      "Bu görselin tasarımını, görsel hiyerarşisini, renk uyumunu ve tipografisini bir uzman gözüyle değerlendir; güçlü yanlarını ve gelişim alanlarını belirt.",
  },
  {
    id: "troubleshoot",
    label: "Hata / Problem Tespiti",
    icon: AlertCircle,
    prompt:
      "Görseldeki potansiyel hataları, teknik aksaklıkları, görsel uyumsuzlukları veya çözülmesi gereken problemleri tespit et ve çözüm önerileri sun.",
  },
];

export const VisionTab: React.FC = () => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/png");
  const [fileName, setFileName] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [resultText, setResultText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Lütfen geçerli bir görsel dosyası seçin (PNG, JPEG, WebP vb.).");
      return;
    }
    setErrorMsg("");
    setFileName(file.name);
    setMimeType(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleAnalyze = async (promptToUse?: string) => {
    const prompt = (promptToUse || customPrompt).trim();
    if (!imagePreview) {
      setErrorMsg("Lütfen önce bir görsel yükleyin.");
      return;
    }
    if (!prompt) {
      setErrorMsg("Lütfen bir analiz sorusu yazın veya hazır işlemlerden birini seçin.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setResultText("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          image: {
            data: imagePreview,
            mimeType,
          },
          systemInstruction:
            "Sen uzman bir yapay zeka bilgisayarla görme ve görsel analiz uzmanısın. Yanıtlarını zengin, detaylı ve net Markdown formatında sun.",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Görsel analizi yapılamadı.");
      }

      setResultText(data.text || "Görsel analiz edildi ancak metin üretilemedi.");
    } catch (err: any) {
      setErrorMsg(err.message || "Görsel işlenirken bir hata meydana geldi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResult = () => {
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setImagePreview(null);
    setFileName("");
    setResultText("");
    setCustomPrompt("");
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Görsel & Belge Analiz Laboratuvarı
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Tulpar görme yeteneğiyle fotoğrafları, ekran görüntülerini, diyagramları veya belgeleri anında analiz edin.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <p>{errorMsg}</p>
          <button
            onClick={() => setErrorMsg("")}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Kapat
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left column: Upload & Actions */}
        <div className="space-y-4 lg:col-span-5">
          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`relative flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
              imagePreview
                ? "border-indigo-300 bg-indigo-50/20"
                : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/80"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            {imagePreview ? (
              <div className="flex flex-col items-center space-y-3 w-full">
                <img
                  src={imagePreview}
                  alt="Yüklenen görsel"
                  className="max-h-56 w-auto rounded-xl object-contain shadow-xs border border-slate-200"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600 truncate max-w-xs">
                    {fileName || "Görsel yüklendi"}
                  </span>
                  <button
                    onClick={handleReset}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    Kaldır
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Görsel seçin
                  </button>{" "}
                  <span className="text-slate-500">veya buraya sürükleyip bırakın</span>
                </div>
                <p className="text-xs text-slate-400">
                  PNG, JPG, WEBP, GIF desteklenir (Maks. 20MB)
                </p>
              </div>
            )}
          </div>

          {/* Quick preset buttons */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Hazır Analiz İşlemleri
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    id={`preset-${action.id}`}
                    onClick={() => {
                      setCustomPrompt(action.prompt);
                      handleAnalyze(action.prompt);
                    }}
                    disabled={!imagePreview || isLoading}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-left text-xs font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-900 disabled:opacity-40 disabled:pointer-events-none transition-all"
                  >
                    <Icon className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Question Form */}
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Özel Soru Sor
            </label>
            <textarea
              id="vision-custom-prompt"
              rows={3}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Örn: Bu görseldeki mimari tarz nedir? Tabloda yer alan toplam tutarı hesapla..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              id="vision-submit-btn"
              onClick={() => handleAnalyze()}
              disabled={!imagePreview || !customPrompt.trim() || isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Görsel İnceleniyor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Yapay Zekaya Analiz Ettir</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right column: Results View */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-slate-900">Analiz Sonucu</h2>
            </div>
            {resultText && (
              <button
                onClick={handleCopyResult}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Kopyalandı</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Sonucu Kopyala</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-[360px]">
            {isLoading ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center space-y-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    Tulpar Görseli İnceliyor
                  </p>
                  <p className="text-xs text-slate-500">
                    Pikseller, renkler ve içerik analiz ediliyor...
                  </p>
                </div>
              </div>
            ) : resultText ? (
              <div className="pr-1">
                <MarkdownRenderer content={resultText} />
              </div>
            ) : (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center space-y-2 text-center text-slate-400">
                <ImageIcon className="h-10 w-10 stroke-[1.5]" />
                <p className="text-sm font-medium text-slate-600">
                  Henüz bir analiz yapılmadı
                </p>
                <p className="text-xs max-w-sm">
                  Soldaki alana bir görsel yükleyin ve bir analiz seçeneğine tıklayın.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
