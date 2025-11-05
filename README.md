# CopyMind

AI-powered WeChat Article Remixer — Upload → Rebuild → Publish.

## Overview

CopyMind 让创作者可以上传公众号爆文，自动抽取事实与结构，迁移至自己的 IP 风格，并输出全新的 Markdown 爆文。项目包含：

- **Next.js 前端**：上传原文、配置改写参数、展示生成结果并导出。
- **Express 后端**：封装 OpenRouter 模型调用，实现改写与去重检测接口。
- **AI Pipeline**：抽取事实 → 结构重组 → 风格迁移 → 去重检测 → Markdown 输出。

## Monorepo 结构

```
/copymind
├── backend            # Node.js + Express API 服务
│   ├── server.js
│   ├── routes/
│   │   ├── rewrite.js
│   │   └── checkSimilarity.js
│   ├── package.json
│   └── .env.example
├── frontend           # Next.js + TailwindCSS 单页应用
│   ├── pages/
│   │   ├── _app.tsx
│   │   ├── index.tsx
│   │   └── api/proxy.ts
│   ├── components/
│   │   ├── ResultView.tsx
│   │   └── UploadPanel.tsx
│   ├── styles/globals.css
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## 快速开始

### 1. 准备环境变量

```bash
cp backend/.env.example backend/.env
```

在 `.env` 中填入：

```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxx
MODEL_NAME=openai/gpt-5-codex
BASE_URL=https://openrouter.ai/api/v1
PORT=4000
EMBEDDING_MODEL=text-embedding-3-large
```

### 2. 启动后端

```bash
cd backend
npm install
npm run dev
```

服务启动后默认监听 `http://localhost:4000`，并提供：

- `POST /api/rewrite`
- `POST /api/check_similarity`
- `GET /api/models`
- `GET /api/health`

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

在 `.env.local` 中可自定义 API 地址：

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

运行 `npm run dev` 后访问 `http://localhost:3000` 体验 CopyMind。

### 4. Pipeline 说明

1. 上传原文（粘贴文本 / 上传 `.docx` / URL 抓取）。
2. 填写目标字数、语气强度、表情密度与改写力度等参数。
3. 点击 “生成 CopyMind 爆文” 调用后端 Rewrite 接口。
4. 后端根据 Prompt 模板调用 OpenRouter（GPT-5 Codex）返回结构化 JSON。
5. 前端渲染 Markdown、标题候选、图片建议，并可导出 `.md` / `.docx`。
6. 自动调用 `check_similarity` 返回字符、词汇、语义重合度与去重建议。

## 技术要点

- **Rewrite Prompt**：包含 Hook → Pain → Insight → Action Steps → Quick Plan → Closing 结构、事实保留、黑名单词、风格迁移与多标题、多配图输出。
- **去重检测**：字符 n-gram 重合、词汇 Jaccard、向量语义余弦。阈值超限时返回建议。
- **前端体验**：Tailwind 设计语言、react-hook-form 参数管理、react-markdown 渲染正文、HTML → Docx 导出。

## 品牌信息

- Brand: **CopyMind**
- Slogan: *Rebuild Ideas, Not Sentences.*
- 主题色：深灰蓝 `#1F2937` + AI 绿 `#10B981`
- Logo：线条脑形 + 打字光标（待设计）

欢迎基于此 MVP 继续扩展，例如：登录鉴权、历史记录、草稿箱、多人协作等功能。
