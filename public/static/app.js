// 小象 Agent 前端逻辑
const App = {
  agents: [],
  currentAgent: null,
  currentConv: null,
  streaming: false,
}

const $ = (sel) => document.querySelector(sel)
const el = (tag, cls, html) => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (html !== undefined) e.innerHTML = html
  return e
}

marked.setOptions({ breaks: true, gfm: true })
const renderMd = (text) => DOMPurify.sanitize(marked.parse(text || ''))

// ---------- 初始化 ----------
async function init() {
  App.agents = await fetch('/api/agents').then((r) => r.json())
  bindEvents()
  await loadConversations()
  showAgentPicker()
}

function bindEvents() {
  $('#new-chat-btn').onclick = showAgentPicker
  $('#switch-agent-btn').onclick = showAgentPicker
  $('#toggle-sidebar').onclick = () => $('#sidebar').classList.toggle('collapsed')
  $('#send-btn').onclick = sendMessage
  const input = $('#input')
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })
  input.addEventListener('input', () => {
    input.style.height = 'auto'
    input.style.height = Math.min(input.scrollHeight, 160) + 'px'
  })
}

// ---------- Agent 选择首页 ----------
function showAgentPicker() {
  App.currentConv = null
  $('#composer').classList.add('hidden')
  $('#current-agent').innerHTML = '<span class="text-gray-400">选择一个智能体</span>'
  highlightConv(null)

  const content = $('#content')
  content.innerHTML = ''
  const wrap = el('div', 'max-w-4xl mx-auto px-6 py-10 fade-in')

  wrap.appendChild(
    el(
      'div',
      'text-center mb-8',
      `<div class="text-5xl mb-3">🐘</div>
       <h2 class="text-2xl font-bold text-gray-800">欢迎使用小象 Agent</h2>
       <p class="text-gray-500 mt-2">选择一个智能体，开启你的 AI 协作之旅</p>`
    )
  )

  const grid = el('div', 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4')
  App.agents.forEach((a) => {
    const card = el(
      'button',
      `text-left p-5 rounded-2xl border border-gray-200 hover:border-transparent hover:shadow-lg transition bg-white group`
    )
    card.innerHTML = `
      <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${a.color} text-white flex items-center justify-center text-xl mb-3">
        <i class="fas ${iconFix(a.icon)}"></i>
      </div>
      <h3 class="font-bold text-gray-800 group-hover:text-indigo-600 transition">${a.name}</h3>
      <p class="text-xs text-gray-500 mt-1">${a.tagline}</p>
      <div class="flex flex-wrap gap-1 mt-3">
        ${a.capabilities
          .map(
            (c) =>
              `<span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">${c}</span>`
          )
          .join('')}
      </div>`
    card.onclick = () => startConversation(a)
    grid.appendChild(card)
  })
  wrap.appendChild(grid)
  content.appendChild(wrap)
}

// FontAwesome 没有 elephant 免费图标，做个映射
function iconFix(icon) {
  if (icon === 'fa-elephant') return 'fa-robot'
  return icon
}

// ---------- 新建会话 ----------
async function startConversation(agent, existingConv) {
  App.currentAgent = agent
  $('#current-agent').innerHTML = `
    <span class="w-7 h-7 rounded-lg bg-gradient-to-br ${agent.color} text-white flex items-center justify-center text-sm"><i class="fas ${iconFix(
    agent.icon
  )}"></i></span>
    <span>${agent.name}</span>`

  if (existingConv) {
    App.currentConv = existingConv
    await loadMessages(existingConv.id)
  } else {
    const conv = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_type: agent.id }),
    }).then((r) => r.json())
    App.currentConv = conv
    await loadConversations()
    renderWelcome(agent)
  }

  $('#composer').classList.remove('hidden')
  highlightConv(App.currentConv.id)
  $('#input').focus()
}

function renderWelcome(agent) {
  const content = $('#content')
  content.innerHTML = ''
  const wrap = el('div', 'max-w-3xl mx-auto px-4 py-10 fade-in text-center')
  wrap.innerHTML = `
    <div class="w-16 h-16 rounded-2xl bg-gradient-to-br ${agent.color} text-white flex items-center justify-center text-2xl mx-auto mb-4">
      <i class="fas ${iconFix(agent.icon)}"></i>
    </div>
    <h2 class="text-xl font-bold text-gray-800">${agent.name}</h2>
    <p class="text-gray-500 mt-1 mb-6">${agent.description}</p>`
  const grid = el('div', 'grid grid-cols-1 sm:grid-cols-2 gap-3 text-left')
  agent.starters.forEach((s) => {
    const b = el(
      'button',
      'p-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-sm text-gray-700 transition'
    )
    b.innerHTML = `<i class="fas fa-lightbulb text-amber-400 mr-2"></i>${s}`
    b.onclick = () => {
      $('#input').value = s
      sendMessage()
    }
    grid.appendChild(b)
  })
  wrap.appendChild(grid)
  content.appendChild(wrap)
}

// ---------- 消息列表渲染 ----------
function ensureMsgContainer() {
  let list = $('#msg-list')
  if (!list) {
    $('#content').innerHTML = ''
    const wrap = el('div', 'max-w-3xl mx-auto px-4 py-6 space-y-6')
    wrap.id = 'msg-list'
    $('#content').appendChild(wrap)
    list = wrap
  }
  return list
}

function appendMessage(role, content) {
  const list = ensureMsgContainer()
  const row = el('div', 'flex gap-3 fade-in ' + (role === 'user' ? 'flex-row-reverse' : ''))
  const avatar = el(
    'div',
    `shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm ${
      role === 'user'
        ? 'bg-gray-700'
        : 'bg-gradient-to-br ' + (App.currentAgent?.color || 'from-indigo-500 to-purple-500')
    }`,
    role === 'user' ? '<i class="fas fa-user"></i>' : `<i class="fas ${iconFix(App.currentAgent?.icon || 'fa-robot')}"></i>`
  )
  const bubble = el(
    'div',
    role === 'user'
      ? 'max-w-[80%] bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap'
      : 'max-w-[85%] bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 markdown-body'
  )
  if (role === 'user') bubble.textContent = content
  else bubble.innerHTML = renderMd(content)
  row.appendChild(avatar)
  row.appendChild(bubble)
  list.appendChild(row)
  scrollBottom()
  return bubble
}

function scrollBottom() {
  const c = $('#content')
  c.scrollTop = c.scrollHeight
}

async function loadMessages(convId) {
  const msgs = await fetch(`/api/conversations/${convId}/messages`).then((r) => r.json())
  $('#content').innerHTML = ''
  ensureMsgContainer()
  if (!msgs.length && App.currentAgent) {
    renderWelcome(App.currentAgent)
    return
  }
  msgs.forEach((m) => appendMessage(m.role, m.content))
}

// ---------- 发送消息（流式） ----------
async function sendMessage() {
  if (App.streaming) return
  const input = $('#input')
  const text = input.value.trim()
  if (!text || !App.currentConv) return

  input.value = ''
  input.style.height = 'auto'
  appendMessage('user', text)

  // 助手占位
  const bubble = appendMessage('assistant', '')
  bubble.innerHTML =
    '<span class="thinking-dots text-gray-400"><span>●</span><span>●</span><span>●</span></span>'
  App.streaming = true
  $('#send-btn').disabled = true

  let acc = ''
  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: App.currentConv.id,
        message: text,
        agent_type: App.currentAgent.id,
      }),
    })

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const parts = buf.split('\n\n')
      buf = parts.pop() || ''
      for (const part of parts) {
        const line = part.trim()
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        try {
          const obj = JSON.parse(data)
          if (obj.type === 'delta') {
            acc += obj.content
            bubble.innerHTML = renderMd(acc)
            bubble.classList.add('cursor-blink')
            scrollBottom()
          } else if (obj.type === 'error') {
            acc += '\n\n> ⚠️ ' + obj.content
            bubble.innerHTML = renderMd(acc)
          } else if (obj.type === 'done') {
            bubble.classList.remove('cursor-blink')
          }
        } catch {}
      }
    }
    bubble.classList.remove('cursor-blink')
    if (!acc) bubble.innerHTML = renderMd('（未收到回复）')
    await loadConversations()
  } catch (e) {
    bubble.classList.remove('cursor-blink')
    bubble.innerHTML = renderMd('⚠️ 网络错误：' + e.message)
  } finally {
    App.streaming = false
    $('#send-btn').disabled = false
  }
}

// ---------- 会话列表 ----------
async function loadConversations() {
  const list = await fetch('/api/conversations').then((r) => r.json())
  const nav = $('#conv-list')
  nav.innerHTML = ''
  if (!list.length) {
    nav.innerHTML = '<p class="text-xs text-gray-500 px-2 py-4 text-center">暂无对话</p>'
    return
  }
  list.forEach((c) => {
    const agent = App.agents.find((a) => a.id === c.agent_type)
    const item = el(
      'div',
      `group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm hover:bg-white/10 transition ${
        App.currentConv?.id === c.id ? 'bg-white/15' : ''
      }`
    )
    item.dataset.id = c.id
    item.innerHTML = `
      <i class="fas ${iconFix(agent?.icon || 'fa-comment')} text-xs text-gray-400 w-4"></i>
      <span class="flex-1 truncate text-gray-200">${c.title}</span>
      <button class="del-btn opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition"><i class="fas fa-trash text-xs"></i></button>`
    item.onclick = (e) => {
      if (e.target.closest('.del-btn')) return
      const agentDef = App.agents.find((a) => a.id === c.agent_type) || App.agents[0]
      startConversation(agentDef, c)
    }
    item.querySelector('.del-btn').onclick = async (e) => {
      e.stopPropagation()
      if (!confirm('确定删除这个对话？')) return
      await fetch(`/api/conversations/${c.id}`, { method: 'DELETE' })
      if (App.currentConv?.id === c.id) showAgentPicker()
      await loadConversations()
    }
    nav.appendChild(item)
  })
}

function highlightConv(id) {
  document.querySelectorAll('#conv-list [data-id]').forEach((n) => {
    n.classList.toggle('bg-white/15', n.dataset.id === id)
  })
}

init()
