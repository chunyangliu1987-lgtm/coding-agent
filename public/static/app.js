// 小象 Agent 前端逻辑 · Genspark 风格
const App = {
  agents: [],
  currentAgent: null,
  currentConv: null,
  streaming: false,
  homeSelectedAgent: 'general', // 首页当前选中的 agent
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

// FontAwesome 没有免费的 elephant 图标，做映射
function iconFix(icon) {
  return icon === 'fa-elephant' ? 'fa-wand-magic-sparkles' : icon
}

// ---------- 初始化 ----------
async function init() {
  App.agents = await fetch('/api/agents').then((r) => r.json())
  bindGlobalEvents()
  await loadConversations()
  showHome()
}

function bindGlobalEvents() {
  $('#new-chat-btn').onclick = showHome
  $('#home-btn').onclick = showHome
  $('#mobile-menu').onclick = () => $('#sidebar').classList.toggle('open')
  $('#send-btn').onclick = sendMessage
  const input = $('#input')
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })
  input.addEventListener('input', () => autoGrow(input))
}

function autoGrow(t) {
  t.style.height = 'auto'
  t.style.height = Math.min(t.scrollHeight, 160) + 'px'
}

// ============================================================
//  首页 (Genspark 风格：大标题 + 大输入框 + 圆形 Agent 入口)
// ============================================================
function showHome() {
  App.currentConv = null
  App.currentAgent = null
  $('#composer').classList.add('hidden')
  $('#current-agent').innerHTML = ''
  highlightConv(null)
  $('#sidebar').classList.remove('open')

  const content = $('#content')
  content.innerHTML = ''
  const wrap = el('div', 'min-h-full flex flex-col items-center justify-center px-4 py-10')

  // 标题
  const hero = el('div', 'text-center mb-8 fade-up')
  hero.style.animationDelay = '0.02s'
  hero.innerHTML = `
    <div class="text-5xl mb-4">🐘</div>
    <h1 class="text-[34px] sm:text-[40px] font-extrabold tracking-tight"><span class="gradient-text">小象 Agent</span></h1>
    <p class="text-gray-500 mt-3 text-[15px]">你的中文 AI 超级智能体 · 提问、创作、研究，一站搞定</p>`
  wrap.appendChild(hero)

  // 大输入框
  const boxWrap = el('div', 'w-full max-w-2xl fade-up')
  boxWrap.style.animationDelay = '0.08s'
  const box = el('div', 'hero-box px-5 pt-4 pb-3')
  box.innerHTML = `
    <textarea id="home-input" rows="2" placeholder="问我任何问题，或让我帮你创作…"
      class="w-full bg-transparent resize-none outline-none text-[16px] placeholder:text-gray-400 leading-relaxed"></textarea>
    <div class="flex items-center justify-between mt-1">
      <div id="home-agent-tag" class="flex items-center gap-1.5 text-[13px] text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-full pl-1 pr-3 py-1 cursor-default transition"></div>
      <button id="home-send" class="w-9 h-9 rounded-full bg-brand hover:bg-brand-dark text-white flex items-center justify-center transition disabled:opacity-30">
        <i class="fas fa-arrow-up text-sm"></i>
      </button>
    </div>`
  boxWrap.appendChild(box)
  wrap.appendChild(boxWrap)

  // 圆形 Agent 入口横排
  const orbsWrap = el('div', 'w-full max-w-3xl mt-10 fade-up')
  orbsWrap.style.animationDelay = '0.14s'
  const orbs = el(
    'div',
    'flex flex-wrap items-start justify-center gap-x-6 gap-y-5'
  )
  App.agents.forEach((a) => {
    const pill = el('button', 'agent-pill flex flex-col items-center gap-2 w-[76px] group')
    pill.innerHTML = `
      <span class="agent-orb">
        <i class="fas ${iconFix(a.icon)} bg-gradient-to-br ${a.color} bg-clip-text text-transparent"></i>
      </span>
      <span class="text-[12px] text-gray-600 group-hover:text-gray-900 text-center leading-tight transition">${a.name}</span>`
    pill.onclick = () => selectHomeAgent(a)
    orbs.appendChild(pill)
  })
  orbsWrap.appendChild(orbs)
  wrap.appendChild(orbsWrap)

  // 提示条
  const tip = el('div', 'mt-10 text-[12px] text-gray-400 fade-up text-center')
  tip.style.animationDelay = '0.2s'
  tip.innerHTML = '基于 Hono · Cloudflare 构建 · 借鉴 OpenHands 与 Genspark 的智能体逻辑'
  wrap.appendChild(tip)

  content.appendChild(wrap)

  // 绑定首页事件
  const homeInput = $('#home-input')
  homeInput.addEventListener('input', () => autoGrow(homeInput))
  homeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitFromHome()
    }
  })
  $('#home-send').onclick = submitFromHome
  setTimeout(() => homeInput.focus(), 100)

  // 默认选中通用助手
  const def = App.agents.find((a) => a.id === App.homeSelectedAgent) || App.agents[0]
  updateHomeAgentTag(def)
}

function selectHomeAgent(agent) {
  App.homeSelectedAgent = agent.id
  updateHomeAgentTag(agent)
  const input = $('#home-input')
  if (input) input.focus()
  // 高亮选中的 orb
  document.querySelectorAll('.agent-pill').forEach((p, i) => {
    const active = App.agents[i] && App.agents[i].id === agent.id
    const orb = p.querySelector('.agent-orb')
    if (orb) orb.style.borderColor = active ? '#2563eb' : '#e5e7eb'
  })
}

function updateHomeAgentTag(agent) {
  const tag = $('#home-agent-tag')
  if (!tag) return
  tag.innerHTML = `
    <span class="w-6 h-6 rounded-full bg-gradient-to-br ${agent.color} text-white flex items-center justify-center text-[11px]"><i class="fas ${iconFix(
    agent.icon
  )}"></i></span>
    <span>${agent.name}</span>`
}

async function submitFromHome() {
  const input = $('#home-input')
  const text = (input?.value || '').trim()
  const agent = App.agents.find((a) => a.id === App.homeSelectedAgent) || App.agents[0]
  if (!text) {
    // 没输入则进入该 agent 的欢迎页
    await startConversation(agent)
    return
  }
  await startConversation(agent)
  $('#input').value = text
  await sendMessage()
}

// ============================================================
//  会话
// ============================================================
async function startConversation(agent, existingConv) {
  App.currentAgent = agent
  $('#current-agent').innerHTML = `
    <span class="w-7 h-7 rounded-lg bg-gradient-to-br ${agent.color} text-white flex items-center justify-center text-sm"><i class="fas ${iconFix(
    agent.icon
  )}"></i></span>
    <span>${agent.name}</span>`
  $('#sidebar').classList.remove('open')

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
  const wrap = el('div', 'max-w-3xl mx-auto px-4 py-12 fade-in text-center')
  wrap.innerHTML = `
    <div class="agent-orb mx-auto mb-4" style="border-color:transparent;background:none;">
      <span class="w-14 h-14 rounded-full bg-gradient-to-br ${agent.color} text-white flex items-center justify-center text-2xl"><i class="fas ${iconFix(
    agent.icon
  )}"></i></span>
    </div>
    <h2 class="text-xl font-bold text-gray-800">${agent.name}</h2>
    <p class="text-gray-500 mt-2 mb-7 text-sm max-w-md mx-auto">${agent.description}</p>`
  const grid = el('div', 'grid grid-cols-1 sm:grid-cols-2 gap-3 text-left')
  agent.starters.forEach((s) => {
    const b = el(
      'button',
      'p-3.5 rounded-2xl border border-gray-200 hover:border-brand hover:bg-blue-50/40 text-sm text-gray-700 transition flex items-start gap-2.5'
    )
    b.innerHTML = `<i class="fas fa-arrow-up-right-from-square text-brand/70 text-xs mt-1"></i><span>${s}</span>`
    b.onclick = () => {
      $('#input').value = s
      sendMessage()
    }
    grid.appendChild(b)
  })
  wrap.appendChild(grid)
  content.appendChild(wrap)
}

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
    `shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
      role === 'user'
        ? 'bg-gray-800'
        : 'bg-gradient-to-br ' + (App.currentAgent?.color || 'from-blue-500 to-indigo-600')
    }`,
    role === 'user'
      ? '<i class="fas fa-user text-xs"></i>'
      : `<i class="fas ${iconFix(App.currentAgent?.icon || 'fa-robot')}"></i>`
  )
  const bubble = el(
    'div',
    role === 'user'
      ? 'max-w-[80%] bg-brand text-white rounded-2xl rounded-tr-md px-4 py-2.5 text-[15px] whitespace-pre-wrap'
      : 'max-w-[85%] bg-[#f7f7f8] rounded-2xl rounded-tl-md px-4 py-3 markdown-body'
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
  if (!msgs.length && App.currentAgent) {
    renderWelcome(App.currentAgent)
    return
  }
  ensureMsgContainer()
  msgs.forEach((m) => appendMessage(m.role, m.content))
}

// ---------- 流式发送 ----------
async function sendMessage() {
  if (App.streaming) return
  const input = $('#input')
  const text = input.value.trim()
  if (!text || !App.currentConv) return

  input.value = ''
  input.style.height = 'auto'
  appendMessage('user', text)

  const bubble = appendMessage('assistant', '')
  bubble.innerHTML =
    '<span class="thinking-dots inline-flex items-center"><span></span><span></span><span></span></span>'
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
    nav.innerHTML =
      '<p class="text-[11px] text-gray-400 px-3 py-3 whitespace-nowrap opacity-0 group-hover/side:opacity-100 transition-opacity">暂无对话</p>'
    return
  }
  list.forEach((c) => {
    const agent = App.agents.find((a) => a.id === c.agent_type)
    const item = el(
      'div',
      `conv-item group/item flex items-center gap-2.5 h-9 px-[10px] rounded-xl cursor-pointer hover:bg-gray-200/70 transition ${
        App.currentConv?.id === c.id ? 'bg-gray-200/80' : ''
      }`
    )
    item.dataset.id = c.id
    item.innerHTML = `
      <i class="fas ${iconFix(agent?.icon || 'fa-comment')} text-[13px] text-gray-400 w-5 text-center shrink-0"></i>
      <span class="flex-1 truncate text-[13px] text-gray-700 whitespace-nowrap opacity-0 group-hover/side:opacity-100 transition-opacity">${c.title}</span>
      <button class="del-btn opacity-0 group-hover/item:opacity-100 group-hover/side:inline text-gray-400 hover:text-red-500 transition shrink-0"><i class="fas fa-trash-can text-[11px]"></i></button>`
    item.onclick = (e) => {
      if (e.target.closest('.del-btn')) return
      const agentDef = App.agents.find((a) => a.id === c.agent_type) || App.agents[0]
      startConversation(agentDef, c)
    }
    item.querySelector('.del-btn').onclick = async (e) => {
      e.stopPropagation()
      if (!confirm('确定删除这个对话？')) return
      await fetch(`/api/conversations/${c.id}`, { method: 'DELETE' })
      if (App.currentConv?.id === c.id) showHome()
      await loadConversations()
    }
    nav.appendChild(item)
  })
}

function highlightConv(id) {
  document.querySelectorAll('#conv-list [data-id]').forEach((n) => {
    n.classList.toggle('bg-gray-200/80', n.dataset.id === id)
  })
}

init()
