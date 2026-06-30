export function renderPage(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>小象 Agent · 你的中文 AI 超级智能体</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%90%98%3C/text%3E%3C/svg%3E" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.5.1/github-markdown-light.min.css" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.9/dist/purify.min.js"></script>
  <link href="/static/style.css" rel="stylesheet" />
  <script>
    tailwind.config = {
      theme: { extend: {
        fontFamily: { sans: ['Inter','system-ui','-apple-system','PingFang SC','Microsoft YaHei','sans-serif'] },
        colors: { brand: { DEFAULT: '#2563eb', light: '#3b82f6', dark: '#1d4ed8' } }
      } }
    }
  </script>
</head>
<body class="h-screen overflow-hidden bg-white text-gray-900">
  <div id="app" class="flex h-full">

    <!-- 极窄侧边栏 (Genspark 风格) -->
    <aside id="sidebar" class="w-[68px] hover:w-60 group/side shrink-0 bg-[#fafafa] border-r border-gray-100 flex flex-col transition-all duration-300 overflow-hidden z-30">
      <div class="h-14 flex items-center gap-2 px-[18px] shrink-0">
        <span class="text-2xl shrink-0">🐘</span>
        <span class="font-bold text-[15px] whitespace-nowrap opacity-0 group-hover/side:opacity-100 transition-opacity">小象 Agent</span>
      </div>

      <div class="px-3 mt-1">
        <button id="new-chat-btn" class="w-full h-10 flex items-center gap-3 px-[10px] rounded-xl text-gray-700 hover:bg-gray-200/70 transition">
          <i class="fas fa-plus w-5 text-center text-[15px]"></i>
          <span class="text-sm whitespace-nowrap opacity-0 group-hover/side:opacity-100 transition-opacity">新建对话</span>
        </button>
        <button id="home-btn" class="w-full h-10 flex items-center gap-3 px-[10px] rounded-xl text-gray-700 hover:bg-gray-200/70 transition">
          <i class="fas fa-house w-5 text-center text-[15px]"></i>
          <span class="text-sm whitespace-nowrap opacity-0 group-hover/side:opacity-100 transition-opacity">主页</span>
        </button>
      </div>

      <div class="px-4 mt-4 mb-1 text-[11px] font-medium text-gray-400 whitespace-nowrap opacity-0 group-hover/side:opacity-100 transition-opacity">历史对话</div>
      <nav id="conv-list" class="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-0.5 pb-4"></nav>

      <div class="p-3 border-t border-gray-100">
        <div class="flex items-center gap-3 px-[10px] h-9">
          <div class="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold">象</div>
          <span class="text-xs text-gray-500 whitespace-nowrap opacity-0 group-hover/side:opacity-100 transition-opacity">我的小象</span>
        </div>
      </div>
    </aside>

    <!-- 主区域 -->
    <main class="flex-1 flex flex-col min-w-0 relative">

      <!-- 顶栏 -->
      <header class="h-14 shrink-0 flex items-center px-5 gap-3 z-10">
        <button id="mobile-menu" class="md:hidden text-gray-500"><i class="fas fa-bars"></i></button>
        <div id="current-agent" class="flex items-center gap-2 text-sm font-medium text-gray-700"></div>
        <div class="ml-auto">
          <span class="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-brand bg-blue-50 px-3 py-1.5 rounded-full">
            <i class="fas fa-bolt"></i> 中文超级智能体
          </span>
        </div>
      </header>

      <!-- 内容区 -->
      <section id="content" class="flex-1 overflow-y-auto"></section>

      <!-- 底部输入区 (会话模式下显示) -->
      <div id="composer" class="shrink-0 px-4 pb-4 hidden">
        <div class="max-w-3xl mx-auto">
          <div class="composer-box flex items-end gap-2 bg-white border border-gray-200 rounded-[20px] px-4 py-2.5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] focus-within:border-brand focus-within:shadow-[0_4px_24px_rgba(37,99,235,0.12)] transition">
            <textarea id="input" rows="1" placeholder="给小象发消息…"
              class="flex-1 bg-transparent resize-none outline-none text-[15px] max-h-40 py-1.5 placeholder:text-gray-400"></textarea>
            <button id="send-btn" class="shrink-0 w-9 h-9 rounded-full bg-brand hover:bg-brand-dark text-white flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed">
              <i class="fas fa-arrow-up text-sm"></i>
            </button>
          </div>
          <p class="text-center text-[11px] text-gray-400 mt-2">小象 Agent 也可能出错，请核查重要信息</p>
        </div>
      </div>
    </main>
  </div>

  <script src="/static/app.js"></script>
</body>
</html>`
}
