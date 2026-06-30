export function renderPage(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>小象 Agent · 你的中文 AI 智能体平台</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%90%98%3C/text%3E%3C/svg%3E" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.5.1/github-markdown-light.min.css" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.9/dist/purify.min.js"></script>
  <link href="/static/style.css" rel="stylesheet" />
  <script>
    tailwind.config = {
      theme: { extend: { fontFamily: { sans: ['system-ui','-apple-system','PingFang SC','Microsoft YaHei','sans-serif'] } } }
    }
  </script>
</head>
<body class="h-screen overflow-hidden bg-gray-50 text-gray-800">
  <div id="app" class="flex h-full">

    <!-- 侧边栏 -->
    <aside id="sidebar" class="w-64 shrink-0 bg-gradient-to-b from-slate-900 to-slate-800 text-gray-100 flex flex-col transition-all duration-300">
      <header class="px-4 py-4 flex items-center gap-2 border-b border-white/10">
        <span class="text-2xl">🐘</span>
        <div>
          <h1 class="font-bold text-lg leading-tight">小象 Agent</h1>
          <p class="text-[11px] text-gray-400">中文 AI 智能体平台</p>
        </div>
      </header>

      <div class="p-3">
        <button id="new-chat-btn" class="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg py-2.5 text-sm font-medium transition">
          <i class="fas fa-plus"></i> 新建对话
        </button>
      </div>

      <div class="px-3 text-xs text-gray-400 font-medium mb-1">历史对话</div>
      <nav id="conv-list" class="flex-1 overflow-y-auto px-2 space-y-1 pb-4"></nav>

      <footer class="px-4 py-3 border-t border-white/10 text-[11px] text-gray-400">
        基于 Hono · Cloudflare · 借鉴 OpenHands / Genspark
      </footer>
    </aside>

    <!-- 主区域 -->
    <main class="flex-1 flex flex-col min-w-0 bg-white">
      <!-- 顶栏 -->
      <header class="h-14 shrink-0 border-b border-gray-200 flex items-center px-4 gap-3">
        <button id="toggle-sidebar" class="text-gray-500 hover:text-gray-800"><i class="fas fa-bars"></i></button>
        <div id="current-agent" class="flex items-center gap-2 font-semibold">
          <span class="text-gray-400">小象 Agent</span>
        </div>
        <div class="ml-auto flex items-center gap-2">
          <button id="switch-agent-btn" class="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
            <i class="fas fa-shuffle mr-1"></i>切换智能体
          </button>
        </div>
      </header>

      <!-- 内容区 -->
      <section id="content" class="flex-1 overflow-y-auto"></section>

      <!-- 输入区 -->
      <div id="composer" class="shrink-0 border-t border-gray-200 p-3 hidden">
        <div class="max-w-3xl mx-auto">
          <div class="relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-indigo-400 transition">
            <textarea id="input" rows="1" placeholder="给小象发消息…（Enter 发送，Shift+Enter 换行）"
              class="flex-1 bg-transparent resize-none outline-none text-sm max-h-40 py-1.5"></textarea>
            <button id="send-btn" class="shrink-0 w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition disabled:opacity-40">
              <i class="fas fa-arrow-up"></i>
            </button>
          </div>
          <p class="text-center text-[11px] text-gray-400 mt-1.5">小象 Agent 可能会出错，请核查重要信息。</p>
        </div>
      </div>
    </main>
  </div>

  <script src="/static/app.js"></script>
</body>
</html>`
}
