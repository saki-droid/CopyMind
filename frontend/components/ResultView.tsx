import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowDownTrayIcon, ClipboardDocumentCheckIcon, SparklesIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';
import { marked } from 'marked';

export interface RewriteResult {
  titles: string[];
  outline: string[];
  body_markdown: string;
  facts_used: string[];
  image_suggestions: string[];
  similarity_estimate?: number;
  de_dup_suggestions?: string[];
  metadata?: Record<string, unknown>;
}

export interface ResultViewProps {
  result: RewriteResult | null;
}

export function ResultView({ result }: ResultViewProps) {
  const [copied, setCopied] = useState(false);

  const bodyMarkdown = result?.body_markdown ?? '';

  const handleCopy = async () => {
    if (!bodyMarkdown) return;
    await navigator.clipboard.writeText(bodyMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportMarkdown = () => {
    if (!bodyMarkdown) return;
    const blob = new Blob([bodyMarkdown], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `copymind-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportDocx = async () => {
    if (!bodyMarkdown) return;
    const html = marked.parse(bodyMarkdown);
    const htmlDocx = await import('html-docx-js/dist/html-docx');
    const blob = htmlDocx.asBlob(`<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>${html}</body></html>`);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `copymind-${Date.now()}.docx`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const stats = useMemo(() => {
    if (!bodyMarkdown) return null;
    const wordCount = bodyMarkdown.replace(/[#*>\-`]/g, '').split(/\s+/).filter(Boolean).length;
    return {
      wordCount,
      similarity: result?.similarity_estimate ?? null
    };
  }, [bodyMarkdown, result?.similarity_estimate]);

  if (!result) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-800 bg-gray-900/50 p-10 text-center text-gray-500">
        <SparklesIcon className="mx-auto h-12 w-12 text-primary" />
        <p className="mt-4 text-lg font-semibold text-gray-200">生成结果会显示在这里</p>
        <p className="text-sm text-gray-500">上传原文并点击“生成 CopyMind 爆文”开启仿写流程。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-800 bg-gray-900/70 p-6 shadow-inner">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">生成结果</h2>
            {stats && (
              <p className="text-sm text-gray-400">约 {stats.wordCount} 字 · 估算相似度 {stats.similarity !== null ? `${Math.round((stats.similarity ?? 0) * 100)}%` : 'N/A'}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopy}
              className={classNames('flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition', {
                'border-primary/50 text-primary hover:bg-primary/10': !copied,
                'border-emerald-500/60 bg-emerald-500/20 text-emerald-300': copied
              })}
            >
              <ClipboardDocumentCheckIcon className="h-4 w-4" />
              {copied ? '已复制' : '复制 Markdown'}
            </button>
            <button
              onClick={handleExportMarkdown}
              className="flex items-center gap-2 rounded-xl border border-primary/40 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
            >
              <ArrowDownTrayIcon className="h-4 w-4" /> 导出 Markdown
            </button>
            <button
              onClick={() => void handleExportDocx()}
              className="flex items-center gap-2 rounded-xl border border-primary/40 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
            >
              <ArrowDownTrayIcon className="h-4 w-4" /> 导出 Docx
            </button>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,0.6fr]">
          <article className="prose prose-invert max-w-none">
            <ReactMarkdown>{bodyMarkdown}</ReactMarkdown>
          </article>
          <aside className="space-y-6 rounded-2xl bg-gray-950/60 p-5">
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">标题候选</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-200">
                {result.titles?.map((title) => (
                  <li key={title} className="rounded-lg bg-gray-900/80 px-3 py-2">{title}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">大纲</h3>
              <ol className="mt-3 space-y-2 text-sm text-gray-300 list-decimal list-inside">
                {result.outline?.map((item, index) => (
                  <li key={`${index}-${item.substring(0, 10)}`}>{item}</li>
                ))}
              </ol>
            </section>
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">图片建议</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                {result.image_suggestions?.map((item) => (
                  <li key={item} className="rounded-lg bg-gray-900/80 px-3 py-2">{item}</li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </section>

      {(result.facts_used?.length || result.de_dup_suggestions?.length) && (
        <section className="rounded-3xl border border-gray-800 bg-gray-900/60 p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {result.facts_used?.length ? (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">保留事实</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-300 list-disc list-inside">
                  {result.facts_used.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.de_dup_suggestions?.length ? (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">去重建议</h3>
                <ul className="mt-3 space-y-2 text-sm text-amber-300 list-disc list-inside">
                  {result.de_dup_suggestions.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
