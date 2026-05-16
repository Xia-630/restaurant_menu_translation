import { NextRequest, NextResponse } from "next/server";
import { findRestaurant, type RestaurantInfo } from "@/lib/osm";
import { MOCK_MENU } from "@/lib/mockMenu";

export const runtime = "nodejs";
export const maxDuration = 60;

const MOCK_DELAY_MS = 800;

function synthesizeRestaurant(
  name: string,
  address: string,
  website: string,
): RestaurantInfo {
  return {
    name,
    display_address: address,
    lat: null,
    lon: null,
    website,
    phone: null,
    opening_hours: null,
    cuisine: null,
    osm_url: null,
    match_confidence: "low",
    data_source: "web_search",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const address = typeof body?.address === "string" ? body.address.trim() : "";

    if (!name || !address) {
      return NextResponse.json(
        { error: "请填写餐厅名字和地址" },
        { status: 400 },
      );
    }

    let restaurant = await findRestaurant(name, address);
    const hasGemini = !!process.env.GEMINI_API_KEY;

    if ((!restaurant || !restaurant.website) && hasGemini) {
      const { findWebsiteByName } = await import("@/lib/geminiTranslate");
      const discoveredUrl = await findWebsiteByName(name, address);

      if (discoveredUrl) {
        if (restaurant) {
          restaurant = { ...restaurant, website: discoveredUrl };
        } else {
          restaurant = synthesizeRestaurant(name, address, discoveredUrl);
        }
      }
    }

    if (!restaurant) {
      return NextResponse.json(
        {
          error:
            "OSM 找不到，Gemini Search 也没找到这家餐厅的官网。请检查拼写或换用拍照模式。",
        },
        { status: 404 },
      );
    }

    if (hasGemini) {
      if (!restaurant.website) {
        return NextResponse.json({
          restaurant,
          menu: null,
          source: "none",
          note:
            "找到了这家餐厅但没有官网信息，无法自动抓菜单。请用拍照模式上传一张菜单照片。",
        });
      }

      const { translateMenuFromUrl, findMenuViaSearch } = await import(
        "@/lib/geminiTranslate"
      );

      let fetched_urls: unknown[] = [];

      try {
        const result = await translateMenuFromUrl(restaurant.website);
        fetched_urls = result.fetched_urls;

        if (result.menu.items.length > 0) {
          return NextResponse.json({
            restaurant,
            menu: result.menu,
            usage: result.usage,
            source: "website",
            fetched_urls,
          });
        }
      } catch (err) {
        fetched_urls = (err as { fetched_urls?: unknown[] }).fetched_urls ?? [];
        console.warn(
          "URL Context failed, falling back to search:",
          err instanceof Error ? err.message : err,
        );
      }

      try {
        const searchResult = await findMenuViaSearch(name, address);
        if (searchResult.menu.items.length > 0) {
          return NextResponse.json({
            restaurant,
            menu: searchResult.menu,
            usage: searchResult.usage,
            source: "search",
            fetched_urls,
          });
        }
      } catch (err) {
        console.error("Search snippets fallback also failed:", err);
      }

      return NextResponse.json({
        restaurant,
        menu: null,
        source: "none",
        note: `没能从 ${restaurant.website} 或搜索结果中找到菜单。该网站可能是 JS 渲染的 SPA。请用拍照模式上传菜单照片。`,
        fetched_urls,
      });
    }

    await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
    return NextResponse.json({
      restaurant,
      menu: MOCK_MENU,
      source: "mock",
      mock: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("translate-by-name error:", err);
    return NextResponse.json(
      { error: `查找失败：${message}` },
      { status: 500 },
    );
  }
}
