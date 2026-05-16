import { NextRequest, NextResponse } from "next/server";
import { MOCK_MENU } from "@/lib/mockMenu";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const MAX_BYTES = 10 * 1024 * 1024;
const MOCK_DELAY_MS = 1200;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少图片" }, { status: 400 });
    }
    if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `不支持的图片格式：${file.type}` },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "图片太大，最大 10MB" },
        { status: 400 },
      );
    }

    if (process.env.GEMINI_API_KEY) {
      const { translateWithGemini } = await import("@/lib/geminiTranslate");
      const result = await translateWithGemini(file);
      return NextResponse.json(result);
    }

    if (process.env.ANTHROPIC_API_KEY) {
      const { translateWithClaude } = await import("@/lib/claudeTranslate");
      const result = await translateWithClaude(file);
      return NextResponse.json(result);
    }

    await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
    return NextResponse.json({
      menu: MOCK_MENU,
      usage: { input_tokens: 0, output_tokens: 0, cache_read: 0 },
      mock: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("translate-image error:", err);
    return NextResponse.json(
      { error: `翻译失败：${message}` },
      { status: 500 },
    );
  }
}
