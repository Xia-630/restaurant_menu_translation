import { GoogleGenAI } from "@google/genai";
import { MENU_SYSTEM_PROMPT } from "./menuPrompt";
import { MenuSchema, type Menu } from "./menuSchema";

export type TranslateResult = {
  menu: Menu;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read: number;
  };
};

export type FetchedUrl = {
  url: string;
  status: string;
};

export type UrlTranslateResult = TranslateResult & {
  fetched_urls: FetchedUrl[];
};

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

function sumUsage(
  ...usages: Array<TranslateResult["usage"]>
): TranslateResult["usage"] {
  return usages.reduce(
    (acc, u) => ({
      input_tokens: acc.input_tokens + u.input_tokens,
      output_tokens: acc.output_tokens + u.output_tokens,
      cache_read: acc.cache_read + u.cache_read,
    }),
    { input_tokens: 0, output_tokens: 0, cache_read: 0 },
  );
}

const GEMINI_SCHEMA = {
  type: "object",
  properties: {
    restaurant_name: { type: "string", nullable: true },
    source_language: { type: "string" },
    currency: { type: "string", nullable: true },
    estimated_per_person: { type: "string", nullable: true },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original_name: { type: "string" },
          chinese_name: { type: "string" },
          price: { type: "string", nullable: true },
          original_description: { type: "string", nullable: true },
          chinese_description: { type: "string", nullable: true },
          section: { type: "string", nullable: true },
          category: { type: "string", enum: ["food", "drink"] },
        },
        required: [
          "original_name",
          "chinese_name",
          "price",
          "original_description",
          "chinese_description",
          "section",
          "category",
        ],
        propertyOrdering: [
          "original_name",
          "chinese_name",
          "price",
          "original_description",
          "chinese_description",
          "section",
          "category",
        ],
      },
    },
  },
  required: [
    "restaurant_name",
    "source_language",
    "currency",
    "estimated_per_person",
    "items",
  ],
  propertyOrdering: [
    "restaurant_name",
    "source_language",
    "currency",
    "estimated_per_person",
    "items",
  ],
};

function client() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

function usageFrom(meta?: {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  cachedContentTokenCount?: number;
}): TranslateResult["usage"] {
  return {
    input_tokens: meta?.promptTokenCount ?? 0,
    output_tokens: meta?.candidatesTokenCount ?? 0,
    cache_read: meta?.cachedContentTokenCount ?? 0,
  };
}

export async function translateWithGemini(file: File): Promise<TranslateResult> {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const response = await client().models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: file.type, data: base64 } },
          { text: "请识别这张菜单并翻译成中文。" },
        ],
      },
    ],
    config: {
      systemInstruction: MENU_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: GEMINI_SCHEMA,
    },
  });

  if (!response.text) throw new Error("Gemini 返回为空");
  const parsed = MenuSchema.parse(JSON.parse(response.text));
  return { menu: parsed, usage: usageFrom(response.usageMetadata) };
}

async function structureMenuFromText(rawText: string): Promise<TranslateResult> {
  const prompt = `下面是从一家餐厅网站抓取下来的内容（可能含菜单，也可能是其他页面）。请找出菜单部分，按要求的 schema 输出。如果根本没有菜单内容，items 数组返回空。

网页内容：
${rawText.slice(0, 60_000)}`;

  const response = await client().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: MENU_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: GEMINI_SCHEMA,
    },
  });

  if (!response.text) throw new Error("Gemini 返回为空");
  const parsed = MenuSchema.parse(JSON.parse(response.text));
  return { menu: parsed, usage: usageFrom(response.usageMetadata) };
}

const BLOCKED_DOMAINS = [
  "yelp.com",
  "yelp.ca",
  "tripadvisor.com",
  "tripadvisor.ca",
  "opentable.com",
  "opentable.ca",
  "exploretock.com",
  "doordash.com",
  "ubereats.com",
  "grubhub.com",
  "skipthedishes.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "michelin.com",
  "blogto.com",
  "narcity.com",
  "google.com",
  "maps.google.com",
];

function looksLikeOfficialSite(url: string): boolean {
  try {
    const u = new URL(url);
    return !BLOCKED_DOMAINS.some(
      (d) => u.hostname === d || u.hostname.endsWith(`.${d}`),
    );
  } catch {
    return false;
  }
}

export async function findWebsiteByName(
  name: string,
  address: string,
): Promise<string | null> {
  const prompt = `Find the official website URL for the restaurant "${name}" located at "${address}".

Search Google for this restaurant. Look for the restaurant's OWN website (their own domain), NOT third-party listings like:
- Yelp, TripAdvisor, OpenTable, Tock, DoorDash, UberEats
- Facebook, Instagram, Twitter
- Food blogs, news articles, Michelin Guide

Reply with ONLY the URL on a single line. No prose, no explanation.
If you cannot confidently find the restaurant's own website, reply exactly: NONE`;

  const res = await client().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] },
  });

  const text = (res.text ?? "").trim();
  if (!text || /^NONE\s*$/i.test(text)) return null;

  // Gemini may reply with: https://x.com, "x.com", or x.com on its own line.
  // Try full URL first, then bare domain.
  let url: string | null = null;
  const fullMatch = text.match(/https?:\/\/[^\s)"'<>]+/);
  if (fullMatch) {
    url = fullMatch[0];
  } else {
    const bareMatch = text.match(
      /([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s)"'<>]*)?/i,
    );
    if (bareMatch) url = `https://${bareMatch[0]}`;
  }

  if (!url) return null;
  url = url.replace(/[.,;:!?]+$/, "");
  if (!looksLikeOfficialSite(url)) return null;
  return url;
}

function buildCandidateUrls(websiteUrl: string): string[] {
  let origin: string;
  try {
    origin = new URL(websiteUrl).origin;
  } catch {
    return [websiteUrl];
  }
  const paths = [
    "/menu",
    "/menus",
    "/our-menu",
    "/food",
    "/menu-food",
    "/food-menu",
    "/menu-drink",
    "/drink-menu",
    "/drinks",
    "/cocktails",
  ];
  const homepage = websiteUrl.replace(/\/$/, "");
  return Array.from(new Set([homepage, ...paths.map((p) => `${origin}${p}`)]));
}

export async function translateMenuFromUrl(
  websiteUrl: string,
): Promise<UrlTranslateResult> {
  const candidates = buildCandidateUrls(websiteUrl).slice(0, 12);

  const fetchPrompt = `你的任务：从下面这些 URL 中找出餐厅的完整菜单。所有 URL 都属于同一家餐厅的网站，可能是首页、菜单页或其他子页面。

URL 列表（请逐个访问检查；不存在的 URL 会返回 404，跳过即可）：
${candidates.map((u, i) => `${i + 1}. ${u}`).join("\n")}

要求：
- 找到所有包含菜品列表的页面（Menu / Food / Drinks / Cocktails / Wine / Carte / Dinner 等都算）
- **重要**：很多餐厅会把食物和饮品分成两个独立页面（如 /menu-food 和 /menu-drink）。如果你看到这种结构，**两个页面都要抓**，不要只抓一个
- 列出每一道菜/每一款饮品的原文名、价格、描述
- **不要翻译**，原文是什么写什么
- 不要省略，把能看到的全列出来（食物 + 饮品都要）
- 输出格式：每行一项，"名字 | 价格 | 描述（没有就空）"
- section 标题用单独一行标出，并在标题前加 [FOOD] 或 [DRINK] 标签，例如：
    [FOOD] Appetizers
    [FOOD] Mains
    [DRINK] Cocktails
    [DRINK] Beer
- 如果所有 URL 都跑完了还没找到任何菜单内容，回复且**只回复**这一行：NO_MENU_FOUND`;

  const fetchResponse = await client().models.generateContent({
    model: MODEL,
    contents: fetchPrompt,
    config: { tools: [{ urlContext: {} }] },
  });

  const fetchedUrls: FetchedUrl[] = (
    fetchResponse.candidates?.[0]?.urlContextMetadata?.urlMetadata ?? []
  ).map((u) => ({
    url: u.retrievedUrl ?? "",
    status: u.urlRetrievalStatus ?? "unknown",
  }));

  const rawText = fetchResponse.text ?? "";
  if (!rawText || /^\s*NO_MENU_FOUND\s*$/i.test(rawText.trim())) {
    const err = new Error("Gemini 在该网站上没找到菜单内容") as Error & {
      fetched_urls?: FetchedUrl[];
    };
    err.fetched_urls = fetchedUrls;
    throw err;
  }

  const fetchUsage = usageFrom(fetchResponse.usageMetadata);
  const structured = await structureMenuFromText(rawText);

  return {
    menu: structured.menu,
    usage: sumUsage(fetchUsage, structured.usage),
    fetched_urls: fetchedUrls,
  };
}

export async function findMenuViaSearch(
  name: string,
  address: string,
): Promise<TranslateResult> {
  const prompt = `Search Google for the menu of "${name}" restaurant at "${address}".
Look through search results (Yelp, TripAdvisor, blogs, reviews, news articles, cached pages) for actual menu items with prices.

List as many dishes as you can find. Do NOT translate — preserve the original language.

Output format: each line one dish, formatted as "dish name | price (if known) | brief description"
Section headers (e.g. "Appetizers", "Main Courses", "Desserts") on their own line.

If you cannot find any specific menu items, reply EXACTLY: NO_MENU_FOUND`;

  const searchRes = await client().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] },
  });

  const text = (searchRes.text ?? "").trim();
  if (!text || /^NO_MENU_FOUND\s*$/i.test(text)) {
    throw new Error("搜索结果里也没找到菜单");
  }

  const searchUsage = usageFrom(searchRes.usageMetadata);
  const structured = await structureMenuFromText(text);

  return {
    menu: structured.menu,
    usage: sumUsage(searchUsage, structured.usage),
  };
}
