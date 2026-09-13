import React, { useState } from "react";
import {
  FileText,
  CheckCircle,
  Lightbulb,
  Languages,
  Sparkles,
  Copy,
  Check,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";

type QuickToolId = "summarize" | "grammar" | "brainstorm" | "translate";

interface QuickTool {
  id: QuickToolId;
  title: string;
  desc: string;
  icon: any;
  placeholder: string;
  buttonLabel: string;
  systemPrompt: string;
}

const QUICK_TOOLS: QuickTool[] = [
  {
    id: "summarize",
    title: "Akıllı Özetleyici",
    desc: "Uzun metinleri, raporları ve makaleleri 3 ana madde ve tek cümlelik özetle sunar.",
    icon: FileText,
    placeholder: "Özetlenmesini istediğiniz makale, metin veya haberi buraya yapıştırın...",
    buttonLabel: "Metni Özetle",
    systemPrompt:
      "Sen uzman bir özetleme asistanısın. Verilen metni: 1) Tek Cümlelik Öz, 2) 3 Maddede Ana Çıkarımlar, 3) Önemli Terimler/Tarihler şeklinde net ve akıcı Türkçe ile özetle.",
  },
  {
    id: "grammar",
    title: "Dilbilgisi & Üslup Düzeltici",
    desc: "Yazım yanlışlarını, noktalama hatalarını giderir ve anlatımı akıcılaştırır.",
    icon: CheckCircle,
    placeholder: "Kontrol edilmesini istediğiniz taslak metni buraya yazın...",
    buttonLabel: "Metni Düzelt & İyileştir",
    systemPrompt:
      "Sen uzman bir Türk dili ve anlatım editörüsün. Kullanıcının metnini düzelt: 1) İyileştirilmiş ve kusursuz metni ver, 2) Yapılan düzeltmeleri ve nedenlerini kısaca listele.",
  },
  {
    id: "brainstorm",
    title: "Beyin Fırtınası & Fikir Üretici",
    desc: "Projeleriniz, girişimleriniz veya içerikleriniz için yaratıcı fikirler üretir.",
    icon: Lightbulb,
    placeholder: "Hangi konuda fikir arıyorsunuz? (Örn: Çevre dostu mobil uygulama fikirleri)",
    buttonLabel: "Yaratıcı Fikirler Üret",
    systemPrompt:
      "Sen yaratıcı bir inovasyon danışmanısın. Kullanıcının konusu hakkında 5 benzersiz, uygulanabilir ve heyecan verici fikir üret. Her birinin temel avantajını ve başlangıç adımını belirt.",
  },
  {
    id: "translate",
    title: "Bağlamsal Akıllı Çevirmen",
    desc: "Deyimler ve kültürel bağlamı koruyarak profesyonel çeviri yapar.",
    icon: Languages,
    placeholder: "Çevrilmesini istediğiniz metni ve hedef dili belirtin (Örn: İngilizce'ye çevir: ...)",
    buttonLabel: "Profesyonel Çevir",
    systemPrompt:
      "Sen uzman bir mütercim tercümansın. Verilen metni hedef dile en doğal, bağlamına uygun ve akıcı şekilde çevir. Gerekirse kullanılan önemli deyim veya terimleri açıkla.",
  },
];

export const QuickToolsTab: React.FC = () => {
  const [activeToolId, setActiveToolId] = useState<QuickToolId>("summarize");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const currentTool =
    QUICK_TOOLS.find((t) => t.id === activeToolId) || QUICK_TOOLS[0];

  const handleExecute = async () => {
    if (!inputText.trim()) {
      setErrorMsg("Lütfen işlenecek metni girin.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: inputText,
          systemInstruction: currentTool.systemPrompt,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "İşlem tamamlanamadı.");
      }

      setOutputText(data.text || "");
    } catch (err: any) {
      setErrorMsg(err.message || "Hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Hızlı Yapay Zeka Araçları
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Günlük çalışma akışınızı hızlandıracak tek tıkla çalışan akıllı asistan araçları.
        </p>
      </div>

      {/* Tool selector cards */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isSelected = activeToolId === tool.id;
          return (
            <button
              key={tool.id}
              id={`quick-tool-${tool.id}`}
              onClick={() => {
                setActiveToolId(tool.id);
                setOutputText("");
                setErrorMsg("");
              }}
              className={`flex flex-col items-start rounded-2xl p-4 text-left transition-all ${
                isSelected
                  ? "border border-indigo-200 bg-indigo-50/70 text-indigo-900 shadow-xs ring-1 ring-indigo-200"
                  : "border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 text-slate-800"
              }`}
            >
              <div
                className={`mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl ${
                  isSelected
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-sm">{tool.title}</h3>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                {tool.desc}
              </p>
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 flex justify-between">
          <p>{errorMsg}</p>
          <button onClick={() => setErrorMsg("")} className="font-semibold underline">
            Kapat
          </button>
        </div>
      )}

      {/* Two-panel workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Input */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Girdi Metni
            </span>
            <span className="text-xs text-slate-400">
              {inputText.length} karakter
            </span>
          </div>

          <textarea
            id="quick-input"
            rows={10}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={currentTool.placeholder}
            className="flex-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />

          <div className="mt-3 flex items-center gap-2">
            <button
              id="quick-submit-btn"
              onClick={handleExecute}
              disabled={!inputText.trim() || isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>İşleniyor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>{currentTool.buttonLabel}</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                setInputText("");
                setOutputText("");
              }}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Temizle
            </button>
          </div>
        </div>

        {/* Right: Output */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-slate-900">
                {currentTool.title} Sonucu
              </h2>
            </div>
            {outputText && (
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
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-[340px]">
            {isLoading ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center space-y-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="font-medium text-slate-800">
                  {currentTool.title} çalıştırılıyor...
                </p>
                <p className="text-xs text-slate-500">
                  Tulpar metni analiz ediyor.
                </p>
              </div>
            ) : outputText ? (
              <div className="pr-1">
                <MarkdownRenderer content={outputText} />
              </div>
            ) : (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center space-y-2 text-center text-slate-400">
                <ArrowRight className="h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">
                  Sonuç burada görüntülenecektir
                </p>
                <p className="text-xs max-w-sm">
                  Soldaki alana metninizi yazıp &quot;{currentTool.buttonLabel}&quot; butonuna basın.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
