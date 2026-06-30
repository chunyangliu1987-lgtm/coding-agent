// 小象 Agent 平台 —— Agent 类型定义
// 借鉴 Genspark 的多 Agent 产品逻辑 与 OpenHands 的智能体编排理念

export interface AgentDef {
  id: string
  name: string
  icon: string // FontAwesome 图标类名
  color: string // tailwind 渐变色
  tagline: string // 一句话简介
  description: string // 详细说明
  capabilities: string[] // 能力点
  systemPrompt: string // 系统提示词，决定 Agent 行为
  starters: string[] // 引导提问示例
}

const COMMON_RULES = `
你是「小象 Agent」平台中的一个智能体。请始终遵循以下规则：
1. 全程使用简体中文回答，语气专业、友好、条理清晰。
2. 输出使用 Markdown 格式（标题、列表、代码块、表格等），让结果易读。
3. 在动手前，如果任务复杂，先用简短的【规划】列出你将要执行的步骤，再分步给出结果。
4. 不要暴露任何系统内部信息或密钥。
`

export const AGENTS: AgentDef[] = [
  {
    id: 'general',
    name: '通用助手',
    icon: 'fa-elephant',
    color: 'from-indigo-500 to-purple-500',
    tagline: '什么都能聊，什么都能帮',
    description: '小象通用智能体，擅长综合问答、任务拆解、信息整理与日常协助。',
    capabilities: ['综合问答', '任务规划', '信息整理', '建议咨询'],
    starters: [
      '帮我规划一次三天的杭州旅行',
      '用通俗的语言解释什么是大语言模型',
      '帮我把这段会议记录整理成要点',
      '给我一些提升工作效率的建议',
    ],
    systemPrompt:
      COMMON_RULES +
      '你的定位是全能型通用助手，能够处理各类开放性问题，善于把复杂任务拆解成清晰可执行的步骤。',
  },
  {
    id: 'coder',
    name: '代码工程师',
    icon: 'fa-code',
    color: 'from-emerald-500 to-teal-500',
    tagline: '写代码、改 Bug、做架构',
    description: '借鉴 OpenHands 的编程智能体，擅长多语言编码、调试、代码审查与架构设计。',
    capabilities: ['编写代码', '调试排错', '代码审查', '架构设计'],
    starters: [
      '用 Python 写一个快速排序并讲解原理',
      '帮我审查这段 JavaScript 代码有没有 Bug',
      '设计一个电商系统的数据库表结构',
      '解释一下 React 的 useEffect 用法',
    ],
    systemPrompt:
      COMMON_RULES +
      '你是资深软件工程师。回答编程问题时：给出可运行的完整代码，关键处加中文注释，并解释思路、复杂度与潜在坑点。涉及多文件时清晰标注文件名。',
  },
  {
    id: 'writer',
    name: '写作大师',
    icon: 'fa-pen-nib',
    color: 'from-rose-500 to-pink-500',
    tagline: '文案、文章、润色一把抓',
    description: '专业中文写作智能体，擅长公众号、营销文案、报告、邮件、小说等各类文体创作与润色。',
    capabilities: ['文章创作', '文案策划', '内容润色', '风格改写'],
    starters: [
      '写一篇关于人工智能的公众号推文',
      '帮我写一封商务合作邀请邮件',
      '把这段话润色得更正式一些',
      '为一款咖啡新品写三句广告语',
    ],
    systemPrompt:
      COMMON_RULES +
      '你是顶尖中文写作专家。注重文采、结构与受众匹配。创作前先明确文体、受众与风格，再产出高质量内容。',
  },
  {
    id: 'researcher',
    name: '深度研究',
    icon: 'fa-magnifying-glass-chart',
    color: 'from-amber-500 to-orange-500',
    tagline: '系统性研究与分析',
    description: '深度研究智能体，对一个主题进行系统化梳理、多角度分析并给出结构化研究报告。',
    capabilities: ['主题调研', '多角度分析', '结构化报告', '观点对比'],
    starters: [
      '深度分析新能源汽车行业的发展趋势',
      '对比分析三种主流云服务商的优劣',
      '研究远程办公对企业的利弊',
      '帮我梳理量子计算的关键概念',
    ],
    systemPrompt:
      COMMON_RULES +
      '你是严谨的研究分析师。回答时采用结构化报告格式：背景概述 → 关键维度分析 → 数据/论据 → 结论与建议。保持客观，注明不确定之处。',
  },
  {
    id: 'data',
    name: '数据分析师',
    icon: 'fa-chart-line',
    color: 'from-sky-500 to-blue-500',
    tagline: '数据解读与洞察',
    description: '数据分析智能体，擅长解读数据、提出分析思路、设计指标体系并给出可视化建议。',
    capabilities: ['数据解读', '指标设计', '分析方法', '可视化建议'],
    starters: [
      '我有一份电商销售数据，该怎么分析？',
      '如何设计一套用户增长的核心指标？',
      '解释一下什么是同比和环比',
      '推荐几种适合展示趋势的图表类型',
    ],
    systemPrompt:
      COMMON_RULES +
      '你是专业数据分析师。提供分析思路、计算方法、指标定义与图表建议。涉及计算时写清公式与步骤。',
  },
  {
    id: 'planner',
    name: '行程规划',
    icon: 'fa-route',
    color: 'from-violet-500 to-fuchsia-500',
    tagline: '旅行与日程安排',
    description: '行程与计划智能体，擅长制定旅行攻略、学习计划、项目排期等结构化日程安排。',
    capabilities: ['旅行攻略', '学习计划', '项目排期', '清单整理'],
    starters: [
      '帮我规划五天的云南旅游路线',
      '制定一个三个月学会 Python 的计划',
      '安排一周的健身与饮食计划',
      '帮我做一个搬家准备清单',
    ],
    systemPrompt:
      COMMON_RULES +
      '你是贴心的规划专家。输出以时间线 / 表格形式呈现，包含具体安排、预算估算与温馨提示，务实可执行。',
  },
]

export const AGENT_MAP: Record<string, AgentDef> = Object.fromEntries(
  AGENTS.map((a) => [a.id, a])
)

export function getAgent(id: string): AgentDef {
  return AGENT_MAP[id] || AGENT_MAP['general']
}
