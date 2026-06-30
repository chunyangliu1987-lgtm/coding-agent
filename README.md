# 🐘 小象 Agent

> 一个属于你自己的中文 AI 智能体（Agent）平台 —— 借鉴 OpenHands 与 Genspark 的 Agent 产品逻辑，基于 Hono + Cloudflare 打造的轻量级边缘 Web 应用。

## 项目概述

- **名称**：小象 Agent（Xiaoxiang Agent）
- **目标**：让你拥有一个可自由部署、全中文界面的多智能体对话平台
- **核心理念**：多 Agent 编排（Genspark 式）+ 智能体系统提示词驱动（OpenHands 式）+ 流式对话体验

## 在线访问

- **沙箱预览地址**：通过 GetServiceUrl 获取的临时公网地址（开发期间有效）
- **生产地址**：部署到 Cloudflare Pages 后为 `https://xiaoxiang-agent.pages.dev`（待部署）
- **GitHub 仓库**：https://github.com/chunyangliu1987-lgtm/coding-agent

## 已完成功能

- ✅ **6 大内置智能体**：通用助手、代码工程师、写作大师、深度研究、数据分析师、行程规划，每个都有独立的系统提示词与引导问题
- ✅ **智能体选择首页**：卡片式选择界面，展示每个 Agent 的能力标签
- ✅ **流式对话**：基于 SSE（Server-Sent Events）的实时打字机式输出
- ✅ **会话管理**：新建 / 切换 / 删除会话，自动以首条消息生成标题
- ✅ **会话历史持久化**：使用 Cloudflare D1 数据库存储所有对话
- ✅ **Markdown 渲染**：助手回复支持标题、列表、代码高亮、表格等
- ✅ **大模型安全代理**：API 密钥仅保存在服务端，前端永不接触
- ✅ **响应式中文界面**：基于 Tailwind CSS，适配桌面与移动端

## 功能入口（API 路径）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 主页面（单页应用） |
| GET | `/api/agents` | 获取所有智能体定义 |
| GET | `/api/conversations` | 获取会话列表 |
| POST | `/api/conversations` | 新建会话，参数 `{ agent_type }` |
| GET | `/api/conversations/:id/messages` | 获取某会话的消息记录 |
| PUT | `/api/conversations/:id` | 重命名会话，参数 `{ title }` |
| DELETE | `/api/conversations/:id` | 删除会话及其消息 |
| POST | `/api/chat` | **核心**：流式聊天，参数 `{ conversation_id, message, agent_type }`，返回 SSE 流 |

## 数据架构

- **数据模型**：
  - `conversations`（会话）：id、title、agent_type、created_at、updated_at
  - `messages`（消息）：id、conversation_id、role、content、meta、created_at
- **存储服务**：Cloudflare D1（SQLite 边缘数据库）
- **数据流**：用户消息 → 存入 D1 → 拼接历史上下文 + Agent 系统提示词 → 调用大模型（流式）→ 助手回复存入 D1

## 大模型接入

- 通过 OpenAI 兼容接口调用（当前使用 GenSpark LLM 代理）
- 模型：`gpt-5-mini`（可在环境变量 `LLM_MODEL` 中切换）
- 密钥配置：
  - 本地开发：写入 `.dev.vars`（已被 git 忽略）
  - 生产部署：`npx wrangler pages secret put OPENAI_API_KEY`

## 用户使用指南

1. 打开平台首页，从卡片中**选择一个智能体**
2. 在欢迎页点击引导问题，或直接在底部输入框提问
3. 助手会**实时流式**输出回答（支持 Markdown）
4. 左侧边栏可**切换历史对话**、**新建对话**或**删除对话**
5. 点击顶部「切换智能体」可随时回到智能体选择页

## 本地开发

```bash
npm install                                   # 安装依赖
npm run build                                 # 构建
npm run db:migrate:local                      # 初始化本地 D1
pm2 start ecosystem.config.cjs                # 启动服务（端口 3000）
curl http://localhost:3000                     # 测试
```

## 部署到 Cloudflare Pages

```bash
npx wrangler d1 create xiaoxiang-agent-production   # 创建生产数据库，回填 database_id
npx wrangler d1 migrations apply xiaoxiang-agent-production   # 应用迁移
npx wrangler pages secret put OPENAI_API_KEY        # 配置密钥
npm run deploy:prod                                  # 构建并部署
```

## 尚未实现 / 后续可拓展

- ⏳ 用户登录与多用户数据隔离
- ⏳ 联网搜索、代码执行等真实工具调用（Tool Use）
- ⏳ 文件 / 图片上传（结合 Cloudflare R2）
- ⏳ 自定义智能体（用户自建 Agent 与提示词）
- ⏳ 对话导出（Markdown / PDF）
- ⏳ 多模型切换 UI（让用户自选模型）

## 技术栈

- **后端**：Hono（TypeScript）
- **前端**：原生 JS + Tailwind CSS + marked + DOMPurify（CDN 引入）
- **存储**：Cloudflare D1
- **部署**：Cloudflare Pages / Workers
- **构建**：Vite

## 致谢

本项目的产品逻辑借鉴自：
- [OpenHands](https://github.com/All-Hands-AI/OpenHands)（智能体系统设计理念）
- Genspark（多 Agent 平台产品形态）

---

**部署状态**：✅ 本地运行中 | ⏳ 待部署 Cloudflare Pages
**最后更新**：2026-06-30
