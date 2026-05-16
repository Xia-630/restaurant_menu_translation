import { z } from "zod";

export const MenuItemSchema = z.object({
  original_name: z.string().describe("菜品在菜单上的原文名称，保持原样"),
  chinese_name: z
    .string()
    .describe(
      "符合中文餐饮习惯的译名（不要逐字翻译）。不确定时用音译加括号注释",
    ),
  price: z
    .string()
    .nullable()
    .describe("菜单上显示的价格（含货币符号或代码），没有则为 null"),
  original_description: z
    .string()
    .nullable()
    .describe("原文描述（如果菜单上有），否则为 null"),
  chinese_description: z
    .string()
    .nullable()
    .describe("简洁的中文描述，若 original_description 为 null 则也为 null"),
  section: z
    .string()
    .nullable()
    .describe(
      '菜单上的小类别原文，例如 "Tacos"、"Cocktails"、"Appetizers"。没有就 null',
    ),
  category: z
    .enum(["food", "drink"])
    .describe('"food" 表示食物菜品，"drink" 表示饮料/酒类'),
});

export const MenuSchema = z.object({
  restaurant_name: z
    .string()
    .nullable()
    .describe("菜单上可见的餐厅名，没有则为 null"),
  source_language: z
    .string()
    .describe('检测到的源语言，例如 "English"、"日本語"、"한국어"'),
  currency: z
    .string()
    .nullable()
    .describe('货币代码，例如 "USD"、"JPY"、"EUR"，无法判断则为 null'),
  estimated_per_person: z
    .string()
    .nullable()
    .describe(
      '一顿正常用餐的人均消费估算字符串，格式 "低值-高值 货币代码（可选备注）"，例如 "$30-$50 CAD"、"¥1500-¥2500 JPY（不含酒水）"。菜单无价或无法估算则为 null',
    ),
  items: z.array(MenuItemSchema).describe("菜单上所有可识别的菜品，按阅读顺序"),
});

export type MenuItem = z.infer<typeof MenuItemSchema>;
export type Menu = z.infer<typeof MenuSchema>;
