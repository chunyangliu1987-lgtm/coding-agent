import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { AGENTS, getAgent } from './agents'
import { renderPage } from './page'

type Bindings = {
  DB: D1Database
  OPENAI_API_KEY: string
  OPENAI_BASE_URL: string
  LLM_MODEL: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './public' }))

// ---------- 工具函数 ----------
function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
  )
}

async function ensureSchema(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '新对话',
        agent_type TEXT NOT NULL DEFAULT 'general',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    )
    .run()
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        meta TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    )
    .run()
}

function llmConfig(env: Bindings) {
  const apiKey = env.OPENAI_API_KEY || (globalThis as any).OPENAI_API_KEY
  const baseUrl =
    env.OPENAI_BASE_URL ||
    (globalThis as any).OPENAI_BASE_URL ||
    'https://www.genspark.ai/api/llm_proxy/v1'
  const model = env.LLM_MODEL || 'gpt-5-mini'
  return { apiKey, baseUrl, model }
}

// ---------- 页面 ----------
app.get('/', (c) => c.html(renderPage()))

// ---------- Agent 列表 ----------
app.get('/api/agents', (c) => {
  return c.json(
    AGENTS.map((a) => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      color: a.color,
      tagline: a.tagline,
      description: a.description,
      capabilities: a.capabilities,
      starters: a.starters,
    }))
  )
})

// ---------- 会话列表 ----------
app.get('/api/conversations', async (c) => {
  try {
    await ensureSchema(c.env.DB)
    const { results } = await c.env.DB.prepare(
      `SELECT id, title, agent_type, updated_at FROM conversations ORDER BY updated_at DESC LIMIT 100`
    ).all()
    return c.json(results || [])
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ---------- 创建会话 ----------
app.post('/api/conversations', async (c) => {
  try {
    await ensureSchema(c.env.DB)
    const { agent_type } = await c.req.json<{ agent_type?: string }>()
    const agent = getAgent(agent_type || 'general')
    const id = uid()
    await c.env.DB.prepare(
      `INSERT INTO conversations (id, title, agent_type) VALUES (?, ?, ?)`
    )
      .bind(id, `与${agent.name}的对话`, agent.id)
      .run()
    return c.json({ id, title: `与${agent.name}的对话`, agent_type: agent.id })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ---------- 获取会话消息 ----------
app.get('/api/conversations/:id/messages', async (c) => {
  try {
    await ensureSchema(c.env.DB)
    const id = c.req.param('id')
    const { results } = await c.env.DB.prepare(
      `SELECT role, content, meta, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC`
    )
      .bind(id)
      .all()
    return c.json(results || [])
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ---------- 删除会话 ----------
app.delete('/api/conversations/:id', async (c) => {
  try {
    await ensureSchema(c.env.DB)
    const id = c.req.param('id')
    await c.env.DB.prepare(`DELETE FROM messages WHERE conversation_id = ?`)
      .bind(id)
      .run()
    await c.env.DB.prepare(`DELETE FROM conversations WHERE id = ?`)
      .bind(id)
      .run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ---------- 重命名会话 ----------
app.put('/api/conversations/:id', async (c) => {
  try {
    await ensureSchema(c.env.DB)
    const id = c.req.param('id')
    const { title } = await c.req.json<{ title: string }>()
    await c.env.DB.prepare(
      `UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
      .bind(title, id)
      .run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ---------- 核心：聊天（流式 SSE） ----------
app.post('/api/chat', async (c) => {
  await ensureSchema(c.env.DB)
  const body = await c.req.json<{
    conversation_id: string
    message: string
    agent_type?: string
  }>()
  const { conversation_id, message } = body
  const agent = getAgent(body.agent_type || 'general')

  if (!message || !conversation_id) {
    return c.json({ error: '缺少必要参数' }, 400)
  }

  // 保存用户消息
  await c.env.DB.prepare(
    `INSERT INTO messages (conversation_id, role, content) VALUES (?, 'user', ?)`
  )
    .bind(conversation_id, message)
    .run()

  // 若是第一条用户消息，自动用其作为标题
  const { results: cnt } = await c.env.DB.prepare(
    `SELECT COUNT(*) as n FROM messages WHERE conversation_id = ? AND role='user'`
  )
    .bind(conversation_id)
    .all()
  if (cnt && (cnt[0] as any).n === 1) {
    const title = message.slice(0, 20) + (message.length > 20 ? '…' : '')
    await c.env.DB.prepare(
      `UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
      .bind(title, conversation_id)
      .run()
  }

  // 取历史消息构造上下文（最近 20 条）
  const { results: history } = await c.env.DB.prepare(
    `SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 20`
  )
    .bind(conversation_id)
    .all()
  const ctx = (history || []).reverse() as { role: string; content: string }[]

  const messages = [
    { role: 'system', content: agent.systemPrompt },
    ...ctx.map((m) => ({ role: m.role, content: m.content })),
  ]

  const { apiKey, baseUrl, model } = llmConfig(c.env)

  // 发起流式请求
  const encoder = new TextEncoder()
  const db = c.env.DB

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

      let full = ''
      try {
        const resp = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            stream: true,
          }),
        })

        if (!resp.ok || !resp.body) {
          const errText = await resp.text().catch(() => '')
          send({
            type: 'error',
            content: `大模型调用失败 (${resp.status})：${errText.slice(0, 200)}`,
          })
          controller.close()
          return
        }

        const reader = resp.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const data = trimmed.slice(5).trim()
            if (data === '[DONE]') continue
            try {
              const json = JSON.parse(data)
              const delta = json.choices?.[0]?.delta?.content || ''
              if (delta) {
                full += delta
                send({ type: 'delta', content: delta })
              }
            } catch {
              // 忽略解析失败的分片
            }
          }
        }

        // 保存助手回复
        if (full) {
          await db
            .prepare(
              `INSERT INTO messages (conversation_id, role, content) VALUES (?, 'assistant', ?)`
            )
            .bind(conversation_id, full)
            .run()
          await db
            .prepare(
              `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`
            )
            .bind(conversation_id)
            .run()
        }
        send({ type: 'done' })
      } catch (e: any) {
        send({ type: 'error', content: `服务异常：${e.message}` })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})

export default app
