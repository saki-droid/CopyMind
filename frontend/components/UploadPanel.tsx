import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowUpTrayIcon, LinkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

export type RewritePayload = {
  title: string;
  content: string;
  facts: string[];
  blacklist: string[];
  targetWordCount: number;
  toneStrength: number;
  emojiDensity: number;
  rewriteMode: 'conservative' | 'balanced' | 'aggressive';
  style: string;
};

export interface UploadPanelProps {
  onSubmit: (payload: RewritePayload) => Promise<void>;
  loading: boolean;
}

interface FormValues {
  title: string;
  content: string;
  url: string;
  facts: string;
  blacklist: string;
  targetWordCount: number;
  toneStrength: number;
  emojiDensity: number;
  rewriteMode: 'conservative' | 'balanced' | 'aggressive';
  style: string;
}

const DEFAULT_STYLE = '深圳打工人，下班写作，语气真实、接地气、少鸡汤多方法、略带自嘲。';

export function UploadPanel({ onSubmit, loading }: UploadPanelProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      content: '',
      url: '',
      facts: '',
      blacklist: '',
      targetWordCount: 2000,
      toneStrength: 0.6,
      emojiDensity: 0.3,
      rewriteMode: 'balanced',
      style: DEFAULT_STYLE
    }
  });

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setSuccessMessage(null);

    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const mammoth = await import('mammoth/mammoth.browser');
        const { value } = await mammoth.extractRawText({ arrayBuffer });
        setValue('content', value.trim());
        setSuccessMessage(`成功导入 Docx 文本，共 ${value.length} 字符。`);
      } catch (error) {
        console.error('Docx parse failed', error);
        setUploadError('无法解析 .docx 文件，请改用复制粘贴或纯文本。');
      }
      return;
    }

    if (file.type.startsWith('text/')) {
      const text = await file.text();
      setValue('content', text.trim());
      setSuccessMessage(`成功导入文本，共 ${text.length} 字符。`);
      return;
    }

    setUploadError('目前仅支持 .docx 与纯文本文件。');
  };

  const handleFetchUrl = async () => {
    setUploadError(null);
    setSuccessMessage(null);
    const url = watch('url');
    if (!url) {
      setUploadError('请输入要抓取的文章链接。');
      return;
    }
    try {
      const response = await axios.get('/api/proxy?url=' + encodeURIComponent(url));
      if (response.data?.content) {
        setValue('title', response.data.title || '');
        setValue('content', response.data.content || '');
        setSuccessMessage('已从链接抓取文章内容。');
      } else {
        setUploadError('未能从链接获取文章内容，请手动粘贴。');
      }
    } catch (error) {
      console.error('URL fetch failed', error);
      setUploadError('抓取失败，请确认链接有效，或稍后重试。');
    }
  };

  const submitHandler = handleSubmit(async (values) => {
    const payload: RewritePayload = {
      title: values.title || '未命名文章',
      content: values.content,
      facts: values.facts
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      blacklist: values.blacklist
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      targetWordCount: Number(values.targetWordCount) || 2000,
      toneStrength: Number(values.toneStrength),
      emojiDensity: Number(values.emojiDensity),
      rewriteMode: values.rewriteMode,
      style: values.style || DEFAULT_STYLE
    };

    if (!payload.content) {
      setUploadError('请先粘贴原文或上传文件。');
      return;
    }

    await onSubmit(payload);
  });

  return (
    <form onSubmit={submitHandler} className="bg-gray-900 rounded-3xl border border-gray-800 p-6 shadow-xl space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-white">上传原文</h2>
        <p className="text-gray-400 text-sm">支持粘贴原文、上传 .docx、或通过链接抓取。系统会自动抽取事实与结构用于重写。</p>
      </header>

      <div className="grid gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-200">原文标题</span>
          <input
            type="text"
            className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100 focus:border-primary focus:outline-none"
            placeholder="输入原文标题"
            {...register('title')}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-200">原文内容</span>
          <textarea
            className="h-48 rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 focus:border-primary focus:outline-none"
            placeholder="直接粘贴原文..."
            {...register('content')}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-200 flex items-center gap-2"><ArrowUpTrayIcon className="h-4 w-4" /> 上传文件</span>
          <input
            type="file"
            accept=".txt,.md,.docx"
            className="text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/20 file:px-3 file:py-2 file:text-primary hover:file:bg-primary/30"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFileUpload(file);
              }
            }}
          />
        </label>

        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-sm font-medium text-gray-200 flex items-center gap-2"><LinkIcon className="h-4 w-4" /> URL 抓取</span>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://mp.weixin.qq.com/..."
              className="flex-1 rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 focus:border-primary focus:outline-none"
              {...register('url')}
            />
            <button
              type="button"
              onClick={() => void handleFetchUrl()}
              className="rounded-xl border border-primary/40 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
            >
              抓取
            </button>
          </div>
        </label>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
            <DocumentTextIcon className="h-4 w-4" /> 内容约束
          </h3>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-200">保留事实（每行一条）</span>
            <textarea
              className="h-24 rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 focus:border-primary focus:outline-none"
              placeholder="列出需要保留的关键信息"
              {...register('facts')}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-200">禁止词（每行一条）</span>
            <textarea
              className="h-24 rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 focus:border-primary focus:outline-none"
              placeholder="需要避开的词/品牌/事件"
              {...register('blacklist')}
            />
          </label>
        </div>

        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400">风格参数</h3>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-200">目标字数</span>
            <input
              type="number"
              min={500}
              max={5000}
              step={100}
              className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 focus:border-primary focus:outline-none"
              {...register('targetWordCount', { valueAsNumber: true })}
            />
            {errors.targetWordCount && <p className="text-xs text-red-400">请输入合理的目标字数。</p>}
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-200">语气强度：{Math.round(watch('toneStrength') * 100)}%</span>
            <input type="range" min={0} max={1} step={0.1} {...register('toneStrength')} />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-200">表情密度：{Math.round(watch('emojiDensity') * 100)}%</span>
            <input type="range" min={0} max={1} step={0.1} {...register('emojiDensity')} />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-200">改写力度</span>
            <select
              className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 focus:border-primary focus:outline-none"
              {...register('rewriteMode')}
            >
              <option value="conservative">保守改写</option>
              <option value="balanced">标准改写</option>
              <option value="aggressive">激进重写</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-200">自定义 IP 风格说明</span>
            <textarea
              className="h-28 rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 focus:border-primary focus:outline-none"
              placeholder="描述你的写作人设、语气、口头禅等"
              {...register('style')}
            />
          </label>
        </div>
      </section>

      {uploadError && <p className="rounded-xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">{uploadError}</p>}
      {successMessage && <p className="rounded-xl border border-primary/60 bg-primary/10 px-4 py-3 text-sm text-primary">{successMessage}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-primary px-6 py-3 text-base font-semibold text-gray-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-primary/40"
      >
        {loading ? '生成中...' : '生成 CopyMind 爆文'}
      </button>
    </form>
  );
}
