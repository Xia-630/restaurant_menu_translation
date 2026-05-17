# 菜单翻译 / Restaurant Menu Translation

把任意语言的餐厅菜单翻译成中文。支持两种模式：

- **拍照模式**：上传菜单照片，自动识别并翻译
- **地址模式**：输入餐厅名 + 地址，自动查找官网并抓取菜单翻译

输出结构化菜单：原文名、中文译名、价格、菜品分类（食物/饮料）、人均消费估算等。

## 功能特性

- 多模型支持：Gemini Flash（免费）/ Claude（付费）/ Mock（无 key 时使用，返回演示菜单）
- 拍照模式支持 JPEG / PNG / GIF / WebP，最大 10MB
- 地址模式使用 [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/) 查找餐厅，再用 Gemini URL Context 抓官网菜单，失败时回退到 Gemini Search
- 翻译结果包含原文 + 译名，便于点餐时对照
- 输出符合中文餐饮习惯的译名（不逐字直译，不确定时用音译加注释）

## 技术栈

- [Next.js 16](https://nextjs.org/) (App Router, Server Actions)
- React 19 + TypeScript
- Tailwind CSS 4
- [`@google/genai`](https://www.npmjs.com/package/@google/genai) — Gemini SDK
- [`@anthropic-ai/sdk`](https://www.npmjs.com/package/@anthropic-ai/sdk) — Claude SDK
- [Zod](https://zod.dev/) — 结构化输出校验
- OpenStreetMap Nominatim API — 餐厅信息查询

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API Key

复制环境变量模板：

```bash
cp .env.local.example .env.local
```

打开 `.env.local`，三选一填入：

| 选项 | 说明 | 拿 Key |
|------|------|--------|
| `GEMINI_API_KEY` | **推荐**，免费层够用，注册不要信用卡 | [aistudio.google.com](https://aistudio.google.com) |
| `ANTHROPIC_API_KEY` | 付费，翻译质量最高 | [console.anthropic.com](https://console.anthropic.com) |
| _（都不填）_ | Mock 模式，永远返回固定的 Pai Thai 演示菜单 | — |

> 优先级：Gemini > Claude > Mock。若同时设置 Gemini 和 Claude，会用 Gemini。

### 3. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000

## 部署

已配置好的 Vercel 部署：

```bash
# 在 Vercel 项目设置中添加环境变量 GEMINI_API_KEY（或 ANTHROPIC_API_KEY）
# 然后推到 main 分支自动部署
git push
```

## 项目结构

```
app/
  page.tsx                       # 主页面（拍照 / 地址两种模式的 UI）
  layout.tsx                     # 根布局
  globals.css                    # 全局样式（Tailwind）
  api/
    translate-image/route.ts     # 图片菜单翻译 API
    translate-by-name/route.ts   # 餐厅名查找 + 菜单抓取 API
lib/
  geminiTranslate.ts             # Gemini 翻译实现（图片 / URL Context / Search）
  claudeTranslate.ts             # Claude 翻译实现（图片）
  menuSchema.ts                  # 菜单结构化输出 Zod schema
  menuPrompt.ts                  # 翻译 prompt
  mockMenu.ts                    # Mock 模式的演示菜单
  osm.ts                         # OpenStreetMap Nominatim 查询
```

## 地址模式工作流程

1. 用 Nominatim 按 `name + address` 查找餐厅 → 拿到 OSM 上的信息（地址、电话、营业时间、官网等）
2. 如果 OSM 没找到 / 没有官网信息，调 Gemini Search 找官网
3. 用 Gemini URL Context 直接读取官网内容并提取菜单
4. 如果 URL Context 失败（比如官网是 JS 渲染的 SPA），回退到 Gemini Search 在网络上搜菜单片段
5. 全部失败时，提示用户改用拍照模式

## 输出格式

菜单数据结构（见 [lib/menuSchema.ts](lib/menuSchema.ts)）：

```ts
{
  restaurant_name: string | null,
  source_language: string,           // 检测到的源语言
  currency: string | null,           // "USD" / "JPY" / "EUR" 等
  estimated_per_person: string | null, // 人均消费估算，例如 "$30-$50 CAD"
  items: [{
    original_name: string,           // 原文菜名
    chinese_name: string,            // 中文译名
    price: string | null,
    original_description: string | null,
    chinese_description: string | null,
    section: string | null,          // 菜单分类（如 "Tacos"）
    category: "food" | "drink",
  }]
}
```

## 注意事项

- **Nominatim 使用条款**：免费但有频率限制（1 req/sec），User-Agent 已在 `lib/osm.ts` 中设置。生产环境大流量请自建实例或换商业 API。
- **隐私**：上传的菜单图片会经 Gemini/Claude API 处理，请勿上传含敏感信息的图片。
- **成本**：地址模式可能触发 2-3 次 Gemini 调用（URL Context + Search 回退）。

## License

MIT — 详见 [LICENSE](LICENSE)。
