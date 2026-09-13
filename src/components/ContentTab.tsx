import React, { useState } from "react";
import {
  PenTool,
  Sparkles,
  BookOpen,
  Mail,
  Linkedin,
  Share2,
  ShoppingBag,
  Newspaper,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  FileText,
  Sliders,
} from "lucide-react";
import { TONE_OPTIONS } from "../data/constants";
import { MarkdownRenderer } from "./MarkdownRenderer";

const TEMPLATES = [
  { id: "Blog / Makale", name: "Blog & Makale", icon: BookOpen, desc: "SEO uyumlu, başlıklı blog yazıları" },
  { id: "LinkedIn Gönderisi", name: "LinkedIn", icon: Linkedin, desc: "Etkileşim alan profesyonel gönderiler" },
  { id: "İş & Satış E-Postası", name: "İş E-Postası", icon: Mail, desc: "Resmi, nezaketli ve etkileyici e-postalar" },
  { id: "Instagram & Sosyal Medya", name: "Sosyal Medya", icon: Share2, desc: "Kısa başlıklar, emojiler ve hashtag'ler" },
  { id: "Ürün Tanıtım Metni", name: "Ürün Tanıtımı", icon: ShoppingBag, desc: "Özellikleri faydaya dönüştüren metinler" },
  { id: "Basın Bülteni", name: "Basın Bülteni", icon: Newspaper, desc: "Medya ve haber duyuruları" },
];

export const ContentTab: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState(TONE_OPTIONS[0]);
  const [audience, setAudience] = useState("Genel Kitle");
  const [length, setLength] = useState("Orta (300-500 kelime)");
  const [additionalInfo, setAdditionalInfo] = useState("");

  const [generatedText, setGeneratedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setErrorMsg("Lütfen içerik için bir konu veya ana fikir girin.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/tools/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedTemplate,
          topic,
          tone,
          audience,
          length,
          additionalInfo,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "İçerik üretilirken hata oluştu.");
      }

      setGeneratedText(data.text || "");
    } catch (err: any) {
      setErrorMsg(err.message || "Bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = generatedText ? generatedText.trim().split(/\s+/).length : 0;
  const charCount = generatedText.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Akıllı İçerik & Metin Stüdyosu
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          İstediğiniz tonda ve formatta profesyonel bloglar, e-postalar, sosyal medya içerikleri ve tanıtım metinleri üretin.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 flex justify-between">
          <p>{errorMsg}</p>
          <button onClick={() => setErrorMsg("")} className="font-semibold underline">
            Kapat
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Settings Form (Left) */}
        <div className="space-y-4 lg:col-span-5">
          {/* Template selection */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              İçerik Türü Seçin
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TEMPLATES.map((tpl) => {
                const Icon = tpl.icon;
                const isSelected = selectedTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    id={`content-tpl-${tpl.id}`}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-center transition-all ${
                      isSelected
                        ? "border border-indigo-200 bg-indigo-50/80 text-indigo-900 shadow-xs"
                        : "border border-slate-100 bg-slate-50/60 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <Icon className={`h-4 w-4 mb-1 ${isSelected ? "text-indigo-600" : "text-slate-500"}`} />
                    <span className="text-xs font-semibold">{tpl.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Konu / Başlık veya Ana Fikir *
              </label>
              <textarea
                id="content-topic"
                rows={3}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Örn: Yapay zekanın sağlık sektöründeki 5 büyük devrimi ve geleceği..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Anlatım Tonu
                </label>
                <select
                  id="content-tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs sm:text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                >
                  {TONE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Uzunluk
                </label>
                <select
                  id="content-length"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs sm:text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                >
                  <option value="Kısa & Öz (100-200 kelime)">Kısa & Öz (100-200 kelime)</option>
                  <option value="Orta (300-500 kelime)">Orta (300-500 kelime)</option>
                  <option value="Kapsamlı & Detaylı (600+ kelime)">Kapsamlı & Detaylı (600+ kelime)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Hedef Kitle
                </label>
                <input
                  id="content-audience"
                  type="text"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="Örn: Genç profesyoneller, Yöneticiler"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs sm:text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Ekstra İpuçları / Notlar
                </label>
                <input
                  id="content-extra"
                  type="text"
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Örn: 3 madde içersin, harekete geçirici mesaj ekle"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs sm:text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <button
              id="content-generate-btn"
              onClick={handleGenerate}
              disabled={!topic.trim() || isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>İçerik Yazılıyor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>İçeriği Oluştur</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Panel (Right) */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-slate-900">Üretilen İçerik</h2>
            </div>
            {generatedText && (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-flex text-xs text-slate-500">
                  {wordCount} kelime • {charCount} karakter
                </span>
                <button
                  onClick={handleCopy}
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
                      <span>Kopyala</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-[380px]">
            {isLoading ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center space-y-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="font-medium text-slate-800">
                  İçeriğiniz tasarlanıyor ve yazılıyor...
                </p>
                <p className="text-xs text-slate-500">
                  Seçtiğiniz ton ve kurallara göre kelimeler seçiliyor.
                </p>
              </div>
            ) : generatedText ? (
              <div className="pr-1">
                <MarkdownRenderer content={generatedText} />
              </div>
            ) : (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center space-y-2 text-center text-slate-400">
                <PenTool className="h-10 w-10 stroke-[1.5]" />
                <p className="text-sm font-medium text-slate-600">
                  Henüz içerik üretilmedi
                </p>
                <p className="text-xs max-w-sm">
                  Soldaki formdan bir şablon seçip konunuzu girerek anında profesyonel içerik oluşturabilirsiniz.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
