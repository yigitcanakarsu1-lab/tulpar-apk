import React, { useState } from "react";
import Markdown from "react-markdown";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-3 leading-relaxed text-slate-800 text-sm sm:text-base font-normal">
      <Markdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-4 mb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mt-3 mb-1.5 border-b border-slate-200 pb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 mt-2.5 mb-1">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-2 leading-relaxed text-slate-700">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-2 space-y-1 text-slate-700">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-2 space-y-1 text-slate-700">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-slate-600 my-2 bg-indigo-50/40 py-1.5 rounded-r-md">
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            const isInline = !match && !codeString.includes("\n");

            if (isInline) {
              return (
                <code
                  className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs sm:text-sm text-indigo-700 font-semibold border border-slate-200"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const codeIdx = Math.floor(Math.random() * 100000);
            return (
              <div className="relative my-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-slate-100 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-1.5 text-xs text-slate-400">
                  <span className="font-mono uppercase tracking-wider text-[11px] text-slate-300">
                    {match ? match[1] : "kod"}
                  </span>
                  <button
                    onClick={() => handleCopy(codeString, codeIdx)}
                    className="flex items-center gap-1.5 rounded px-2 py-1 transition-colors hover:bg-slate-800 hover:text-white"
                    title="Kodu Kopyala"
                  >
                    {copiedIndex === codeIdx ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Kopyalandı</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Kopyala</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="overflow-x-auto p-4 font-mono text-xs sm:text-sm leading-normal">
                  <code>{children}</code>
                </div>
              </div>
            );
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};
