import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
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

export async function translateWithClaude(file: File): Promise<TranslateResult> {
  const claude = new Anthropic();
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const response = await claude.messages.parse({
    model: "claude-opus-4-7",
    max_tokens: 16000,
    system: [
      {
        type: "text",
        text: MENU_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: {
      format: zodOutputFormat(MenuSchema),
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: file.type as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: base64,
            },
          },
          { type: "text", text: "请识别这张菜单并翻译成中文。" },
        ],
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("无法解析模型返回的结果");
  }

  return {
    menu: response.parsed_output,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_read: response.usage.cache_read_input_tokens ?? 0,
    },
  };
}
