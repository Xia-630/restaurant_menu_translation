"use client";

import { useCallback, useRef, useState } from "react";
import type { Menu, MenuItem } from "@/lib/menuSchema";
import type { RestaurantInfo } from "@/lib/osm";

type UsageInfo = {
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
};

type Mode = "photo" | "address";

type FetchedUrl = { url: string; status: string };

type Source = "image" | "website" | "search" | "mock" | "none";

type Result = {
  menu: Menu | null;
  usage: UsageInfo | null;
  restaurant: RestaurantInfo | null;
  source: Source;
  note: string | null;
  fetched_urls: FetchedUrl[];
};

export default function Home() {
  const [mode, setMode] = useState<Mode>("photo");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-full flex flex-col items-center bg-zinc-50 dark:bg-zinc-950 px-4 py-10">
      <main className="w-full max-w-4xl flex flex-col gap-6">
        <header className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            菜单翻译
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            把任意语言的餐厅菜单翻译成中文
          </p>
        </header>

        <ModeTabs mode={mode} onChange={switchMode} />

        {mode === "photo" ? (
          <PhotoMode
            loading={loading}
            setLoading={setLoading}
            onResult={setResult}
            onError={setError}
            resetResult={() => setResult(null)}
          />
        ) : (
          <AddressMode
            loading={loading}
            setLoading={setLoading}
            onResult={setResult}
            onError={setError}
            resetResult={() => setResult(null)}
          />
        )}

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {result?.restaurant && <RestaurantCard info={result.restaurant} />}
        {result?.note && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-4 text-sm text-amber-800 dark:text-amber-200">
            {result.note}
          </div>
        )}
        {result?.fetched_urls && result.fetched_urls.length > 0 && (
          <FetchedUrlsList urls={result.fetched_urls} />
        )}
        {result?.menu && (
          <MenuResult
            menu={result.menu}
            usage={result.usage}
            source={result.source}
          />
        )}
      </main>
    </div>
  );
}

function ModeTabs({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      active
        ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
    }`;
  return (
    <div className="flex justify-center gap-2">
      <button
        type="button"
        className={tabClass(mode === "photo")}
        onClick={() => onChange("photo")}
      >
        📷 拍照翻译
      </button>
      <button
        type="button"
        className={tabClass(mode === "address")}
        onClick={() => onChange("address")}
      >
        📍 名字 + 地址
      </button>
    </div>
  );
}

function PhotoMode({
  loading,
  setLoading,
  onResult,
  onError,
  resetResult,
}: {
  loading: boolean;
  setLoading: (b: boolean) => void;
  onResult: (r: Result) => void;
  onError: (e: string | null) => void;
  resetResult: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (f: File | null) => {
      resetResult();
      onError(null);
      if (!f) {
        setFile(null);
        setPreviewUrl(null);
        return;
      }
      if (!f.type.startsWith("image/")) {
        onError("请选择图片文件");
        return;
      }
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    },
    [onError, resetResult],
  );

  const onTranslate = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    onError(null);
    resetResult();
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/translate-image", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "请求失败");
      onResult({
        menu: data.menu,
        usage: data.usage ?? null,
        restaurant: null,
        source: data.mock ? "mock" : "image",
        note: null,
        fetched_urls: [],
      });
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [file, onError, onResult, resetResult, setLoading]);

  return (
    <section
      className={`relative rounded-xl border-2 border-dashed transition-colors ${
        dragOver
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
          : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0] ?? null);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {previewUrl ? (
        <div className="p-4 flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="菜单预览"
            className="max-h-96 rounded-lg object-contain"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              换一张
            </button>
            <button
              type="button"
              onClick={onTranslate}
              disabled={loading}
              className="px-6 py-2 rounded-lg text-sm font-medium bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "翻译中…" : "开始翻译"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-16 flex flex-col items-center gap-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          <div className="text-sm">点击上传，或将菜单图片拖到这里</div>
          <div className="text-xs text-zinc-400">支持 JPG / PNG / WebP, 最大 10MB</div>
        </button>
      )}
    </section>
  );
}

function AddressMode({
  loading,
  setLoading,
  onResult,
  onError,
  resetResult,
}: {
  loading: boolean;
  setLoading: (b: boolean) => void;
  onResult: (r: Result) => void;
  onError: (e: string | null) => void;
  resetResult: () => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const onSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !address.trim()) {
        onError("请填写餐厅名字和地址");
        return;
      }
      setLoading(true);
      onError(null);
      resetResult();
      try {
        const res = await fetch("/api/translate-by-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, address }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "请求失败");
        onResult({
          menu: data.menu ?? null,
          usage: data.usage ?? null,
          restaurant: data.restaurant ?? null,
          source: data.source ?? (data.mock ? "mock" : "none"),
          note: data.note ?? null,
          fetched_urls: data.fetched_urls ?? [],
        });
      } catch (err) {
        onError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [name, address, onError, onResult, resetResult, setLoading],
  );

  return (
    <form
      onSubmit={onSearch}
      className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="restaurant-name"
          className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
        >
          餐厅名字
        </label>
        <input
          id="restaurant-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: Pai Northern Thai Kitchen"
          className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="restaurant-address"
          className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
        >
          地址
        </label>
        <input
          id="restaurant-address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="例: 18 Duncan St, Toronto"
          className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 rounded-lg text-sm font-medium bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "查找中…" : "查找并翻译"}
        </button>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed">
        通过 OpenStreetMap 免费数据查找餐厅。返回的网站 / 电话 / 营业时间均为真实数据；
        菜单部分目前是 mock（演示用）。
      </p>
    </form>
  );
}

function RestaurantCard({ info }: { info: RestaurantInfo }) {
  const confidenceLabel = {
    high: { text: "匹配度高", className: "text-green-700 dark:text-green-300" },
    medium: { text: "可能匹配", className: "text-amber-700 dark:text-amber-300" },
    low: { text: "匹配度低", className: "text-zinc-500" },
  }[info.match_confidence];

  return (
    <section className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {info.name}
        </h2>
        <span className={`text-xs ${confidenceLabel.className}`}>
          {confidenceLabel.text}
        </span>
      </div>
      <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
        {info.display_address}
      </div>
      {info.data_source === "web_search" && (
        <div className="mt-2 text-xs text-zinc-400 italic">
          OSM 没有这家餐厅的数据；通过 Gemini 搜索找到了官网
        </div>
      )}
      <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {info.website && (
          <InfoRow label="网站">
            <a
              href={info.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline break-all"
            >
              {info.website}
            </a>
          </InfoRow>
        )}
        {info.phone && (
          <InfoRow label="电话">
            <a
              href={`tel:${info.phone.replace(/\s+/g, "")}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {info.phone}
            </a>
          </InfoRow>
        )}
        {info.cuisine && <InfoRow label="菜系">{info.cuisine}</InfoRow>}
        {info.opening_hours && (
          <InfoRow label="营业时间">
            <span className="font-mono text-xs">{info.opening_hours}</span>
          </InfoRow>
        )}
      </dl>
      {(info.lat !== null || info.osm_url) && (
        <div className="mt-4 flex gap-4 text-xs text-zinc-400">
          {info.lat !== null && info.lon !== null && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${info.lat},${info.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              在 Google Maps 查看 →
            </a>
          )}
          {info.osm_url && (
            <a
              href={info.osm_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              在 OpenStreetMap 查看 →
            </a>
          )}
        </div>
      )}
    </section>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-zinc-900 dark:text-zinc-100">{children}</dd>
    </div>
  );
}

function FetchedUrlsList({ urls }: { urls: FetchedUrl[] }) {
  return (
    <details className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-xs">
      <summary className="cursor-pointer text-zinc-500 dark:text-zinc-400 select-none">
        抓取了 {urls.length} 个 URL（点击展开）
      </summary>
      <ul className="mt-2 space-y-1 font-mono">
        {urls.map((u, i) => {
          const ok = u.status === "URL_RETRIEVAL_STATUS_SUCCESS";
          return (
            <li key={i} className="flex gap-2">
              <span className={ok ? "text-green-600" : "text-zinc-400"}>
                {ok ? "✓" : "·"}
              </span>
              <span className="text-zinc-700 dark:text-zinc-300 break-all">
                {u.url}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function groupMenuItems(
  items: MenuItem[],
): { category: "food" | "drink"; section: string | null; items: MenuItem[] }[] {
  const order: string[] = [];
  const map = new Map<
    string,
    { category: "food" | "drink"; section: string | null; items: MenuItem[] }
  >();
  for (const item of items) {
    const key = `${item.category}::${item.section ?? "_"}`;
    if (!map.has(key)) {
      order.push(key);
      map.set(key, {
        category: item.category,
        section: item.section,
        items: [],
      });
    }
    map.get(key)!.items.push(item);
  }
  const categoryRank = { food: 0, drink: 1 };
  return order
    .map((k) => map.get(k)!)
    .sort(
      (a, b) =>
        categoryRank[a.category] - categoryRank[b.category],
    );
}

function GroupedItems({ items }: { items: MenuItem[] }) {
  const groups = groupMenuItems(items);
  let lastCategory: "food" | "drink" | null = null;
  return (
    <div>
      {groups.map((group, gi) => {
        const showCategoryDivider = group.category !== lastCategory;
        lastCategory = group.category;
        return (
          <div key={gi}>
            {showCategoryDivider && (
              <div
                className={`px-6 py-3 border-y text-xs font-semibold tracking-wider uppercase ${
                  group.category === "food"
                    ? "bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800"
                    : "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-900"
                }`}
              >
                {group.category === "food" ? "🍽 食物" : "🍷 饮品"}
              </div>
            )}
            {group.section && (
              <div className="px-6 pt-4 pb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {group.section}
              </div>
            )}
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {group.items.map((item, i) => (
                <li
                  key={i}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">
                      {item.chinese_name}
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {item.original_name}
                    </div>
                    {item.chinese_description && (
                      <div className="text-sm text-zinc-600 dark:text-zinc-300 mt-2">
                        {item.chinese_description}
                      </div>
                    )}
                    {item.original_description &&
                      item.original_description !==
                        item.chinese_description && (
                        <div className="text-xs text-zinc-400 mt-1 italic">
                          {item.original_description}
                        </div>
                      )}
                  </div>
                  {item.price && (
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      {item.price}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function MenuResult({
  menu,
  usage,
  source,
}: {
  menu: Menu;
  usage: UsageInfo | null;
  source: Source;
}) {
  const sourceBadge =
    source === "mock"
      ? { text: "演示数据", className: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300" }
      : source === "website"
        ? { text: "从餐厅网站抓取", className: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300" }
        : source === "search"
          ? { text: "从搜索结果汇总", className: "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300" }
          : null;
  return (
    <section className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      <header className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {menu.restaurant_name ?? "翻译结果"}
          </h2>
          <span className="text-xs text-zinc-500">
            {menu.source_language}
            {menu.currency ? ` · ${menu.currency}` : ""} · 共 {menu.items.length} 项
          </span>
          {sourceBadge && (
            <span
              className={`ml-auto text-xs px-2 py-0.5 rounded ${sourceBadge.className}`}
            >
              {sourceBadge.text}
            </span>
          )}
        </div>
        {menu.estimated_per_person && (
          <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            <span className="text-zinc-500 dark:text-zinc-400">人均:</span>{" "}
            <span className="font-medium">{menu.estimated_per_person}</span>
          </div>
        )}
      </header>

      {menu.items.length === 0 ? (
        <div className="p-8 text-center text-sm text-zinc-500">
          未识别到菜品
        </div>
      ) : (
        <GroupedItems items={menu.items} />
      )}

      {usage && (usage.input_tokens > 0 || usage.output_tokens > 0) && (
        <footer className="px-6 py-2 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400">
          tokens: in {usage.input_tokens} · out {usage.output_tokens}
          {usage.cache_read > 0 ? ` · cache ${usage.cache_read}` : ""}
        </footer>
      )}
    </section>
  );
}
