import React, { useState } from "react";
import {
  Code2,
  Bug,
  BookOpen,
  Zap,
  RefreshCw,
  Copy,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import { CODE_ACTIONS, LANGUAGES } from "../data/constants";
import { MarkdownRenderer } from "./MarkdownRenderer";

const CODE_EXAMPLES = [
  {
    title: "TypeScript Debounce Hook",
    action: "Kod Yaz / Geliştir",
    lang: "TypeScript",
    prompt: "React için performanslı, temiz tip tanımlamalı bir useDebounce hook'u yaz.",
  },
  {
    title: "Python Veri Filtreleme",
    action: "Kod Yaz / Geliştir",
    lang: "Python",
    prompt: "Bir liste içindeki sözlükleri belirli bir anahtara göre filtreleyip sıralayan fonksiyon yaz.",
  },
  {
    title: "SQL Karmaşık Join",
    action: "Kod Yaz / Geliştir",
    lang: "SQL",
    prompt: "Müşteriler, Siparişler ve Ürünler tablolarını birleştirip son 30 günde en çok harcayan 5 müşteriyi getiren sorgu.",
  },
];

export const CodeTab: React.FC = () => {
  const [selectedAction, setSelectedAction] = useState(CODE_ACTIONS[0].label);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState("");

  const [resultCode, setResultCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRun = async (customPrompt?: string, customCode?: string) => {
    const promptToRun = customPrompt !== undefined ? customPrompt : prompt;
    const codeToRun = customCode !== undefined ? customCode : code;

    if (!promptToRun.trim() && !codeToRun.trim()) {
      setErrorMsg("Lütfen bir açıklama veya incelenecek kod parçası girin.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/tools/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: selectedAction,
          language: selectedLanguage,
          prompt: promptToRun,
          code: codeToRun,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kod işlemi gerçekleştirilemedi.");
      }

      setResultCode(data.text || "");
    } catch (err: any) {
      setErrorMsg(err.message || "Kod çalıştırılırken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(resultCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadExample = (ex: (typeof CODE_EXAMPLES)[0]) => {
    setSelectedAction(ex.action);
    setSelectedLanguage(ex.lang);
    setPrompt(ex.prompt);
    setCode("");
    handleRun(ex.prompt, "");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Kod Analizörü & Yazılım Laboratuvarı
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Algoritmalar yazın, hataları ayıklayın, karmaşık kodları açıklatın ve modern yazılım çözümleri üretin.
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

      {/* Quick Example Pills */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Örnek Görevler:</span>
        {CODE_EXAMPLES.map((ex, i) => (
          <button
            key={i}
            id={`code-example-${i}`}
            onClick={() => loadExample(ex)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-900 transition-all shadow-2xs"
          >
            {ex.title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Inputs */}
        <div className="space-y-4 lg:col-span-5">
          {/* Action selection */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              İşlem Türü
            </label>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {CODE_ACTIONS.map((act) => {
                const isSelected = selectedAction === act.label;
                return (
                  <button
                    key={act.id}
                    id={`code-action-${act.id}`}
                    onClick={() => setSelectedAction(act.label)}
                    className={`rounded-xl p-2.5 text-left text-xs font-semibold transition-all ${
                      isSelected
                        ? "border border-indigo-200 bg-indigo-50 text-indigo-900 shadow-xs"
                        : "border border-slate-100 bg-slate-50/60 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <div>{act.label}</div>
                    <div className="text-[10px] font-normal text-slate-500 line-clamp-1">
                      {act.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language & Input Details */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Programlama Dili / Teknoloji
              </label>
              <select
                id="code-lang"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs sm:text-sm text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                İstek veya Soru Açıklaması
              </label>
              <textarea
                id="code-prompt"
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Örn: Verilen bir dizideki tekrarlayan elemanları bulan ve O(n) sürede çalışan bir fonksiyon yaz..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs sm:text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Mevcut Kod (Opsiyonel / Hata ayıklama veya refactor için)
              </label>
              <textarea
                id="code-body"
                rows={5}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="İncelenmesini istediğiniz kodu buraya yapıştırın..."
                className="w-full font-mono rounded-xl border border-slate-200 bg-slate-950 p-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              id="code-submit-btn"
              onClick={() => handleRun()}
              disabled={(!prompt.trim() && !code.trim()) || isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Kod Analiz Ediliyor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>İşlemi Başlat</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Output */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-slate-900">Yapay Zeka Çıktısı</h2>
            </div>
            {resultCode && (
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
                    <span>Sonucu Kopyala</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-[420px]">
            {isLoading ? (
              <div className="flex h-full min-h-[340px] flex-col items-center justify-center space-y-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="font-medium text-slate-800">
                  Kod mimarisi inceleniyor ve üretiliyor...
                </p>
                <p className="text-xs text-slate-500">
                  Best practices ve güvenlik kontrolleri uygulanıyor.
                </p>
              </div>
            ) : resultCode ? (
              <div className="pr-1">
                <MarkdownRenderer content={resultCode} />
              </div>
            ) : (
              <div className="flex h-full min-h-[340px] flex-col items-center justify-center space-y-2 text-center text-slate-400">
                <Code2 className="h-10 w-10 stroke-[1.5]" />
                <p className="text-sm font-medium text-slate-600">
                  Henüz kod üretilmedi
                </p>
                <p className="text-xs max-w-sm">
                  Soldaki menüden istediğiniz işlem türünü ve dili seçerek kod yazdırabilir veya mevcut kodunuzu analiz ettirebilirsiniz.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
