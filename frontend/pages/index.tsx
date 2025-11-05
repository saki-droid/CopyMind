import Head from 'next/head';
import { useState } from 'react';
import { UploadPanel, RewritePayload } from '../components/UploadPanel';
import { ResultView, RewriteResult } from '../components/ResultView';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export default function HomePage() {
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState('');

  const runRewrite = async (payload: RewritePayload) => {
    setLoading(true);
    setError(null);
    setProgressMessage('正在调用 CopyMind Pipeline...');

    try {
      const response = await fetch(`${API_BASE}/api/rewrite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: '未知错误' }));
        throw new Error(data.error || 'Rewrite API 调用失败');
      }

      const data = (await response.json()) as RewriteResult;
      setResult(data);
      setProgressMessage('正在进行去重检测...');

      const similarityResponse = await fetch(`${API_BASE}/api/check_similarity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ original: payload.content, rewritten: data.body_markdown })
      });

      if (similarityResponse.ok) {
        const similarity = await similarityResponse.json();
        setResult({
          ...data,
          similarity_estimate: similarity.semantic,
          de_dup_suggestions: [
            ...(data.de_dup_suggestions || []),
            ...(similarity.pass
              ? []
              : [
                  '检测到文本相似度偏高，建议提升改写力度或调整案例。',
                  `字符重合率 ${(similarity.charOverlap * 100).toFixed(1)}% · 词汇Jaccard ${(similarity.jaccard * 100).toFixed(1)}% · 语义相似 ${(similarity.semantic * 100).toFixed(1)}%`
                ])
          ]
        });
      }

      setProgressMessage('');
    } catch (err) {
      const message = err instanceof Error ? err.message : '生成失败，请稍后再试。';
      setError(message);
      setProgressMessage('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>CopyMind — Rebuild Ideas, Not Sentences.</title>
        <meta
          name="description"
          content="CopyMind 让你上传公众号爆文，AI 自动重组结构、迁移 IP 风格，生成原创 Markdown 内容。"
        />
      </Head>
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-10 px-4 py-10 lg:px-8">
        <header className="space-y-4 text-center">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">AI Powered WeChat Remix</p>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">CopyMind — Rebuild Ideas, Not Sentences.</h1>
          <p className="mx-auto max-w-2xl text-base text-gray-400">
            上传 → 重构 → 发布。CopyMind 会抽取原文事实，重建 Hook / Pain / Insight / Action / Plan / Closing 结构，迁移你的深圳打工人写作风格，并输出 Markdown + 标题 + 配图建议。
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <UploadPanel onSubmit={runRewrite} loading={loading} />
          <div className="space-y-4">
            {progressMessage && (
              <div className="rounded-3xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">{progressMessage}</div>
            )}
            {error && <div className="rounded-3xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
            <ResultView result={result} />
          </div>
        </section>

        <footer className="border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
          <p>© {new Date().getFullYear()} CopyMind · Powered by GPT-5 Codex via OpenRouter · Made for 下班写作人。</p>
        </footer>
      </main>
    </>
  );
}
