export type RestaurantInfo = {
  name: string;
  display_address: string;
  lat: number | null;
  lon: number | null;
  website: string | null;
  phone: string | null;
  opening_hours: string | null;
  cuisine: string | null;
  osm_url: string | null;
  match_confidence: "high" | "medium" | "low";
  data_source: "osm" | "web_search";
};

type NominatimResult = {
  place_id: number;
  osm_type: "node" | "way" | "relation";
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  category?: string;
  type?: string;
  importance?: number;
  extratags?: Record<string, string> | null;
};

const RESTAURANT_TYPES = new Set([
  "restaurant",
  "cafe",
  "fast_food",
  "bar",
  "pub",
  "food_court",
  "bistro",
  "ice_cream",
]);

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const HEADERS = {
  "User-Agent": "menu-translator-mvp/0.1 (personal-use; cc_test)",
  "Accept-Language": "en",
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9一-鿿]+/)
    .filter((t) => t.length >= 2);
}

function tokenOverlap(needle: string, hay: string): number {
  const needleTokens = tokenize(needle);
  const haySet = new Set(tokenize(hay));
  let overlap = 0;
  for (const t of needleTokens) if (haySet.has(t)) overlap++;
  return overlap;
}

function isRestaurant(r: NominatimResult): boolean {
  return r.category === "amenity" && !!r.type && RESTAURANT_TYPES.has(r.type);
}

async function nominatimSearch(q: string): Promise<NominatimResult[]> {
  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("limit", "10");

  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`Nominatim 请求失败: HTTP ${res.status}`);
  }
  return (await res.json()) as NominatimResult[];
}

function freeFormQuery(name: string, address: string): string {
  return `${name} ${address}`.replace(/,/g, " ").replace(/\s+/g, " ").trim();
}

function toRestaurantInfo(
  r: NominatimResult,
  confidence: RestaurantInfo["match_confidence"],
  fallbackName: string,
): RestaurantInfo {
  const tags = r.extratags ?? {};
  return {
    name: r.name && r.name.length > 0 ? r.name : fallbackName,
    display_address: r.display_name,
    lat: Number.parseFloat(r.lat),
    lon: Number.parseFloat(r.lon),
    website: tags.website ?? tags["contact:website"] ?? null,
    phone: tags.phone ?? tags["contact:phone"] ?? null,
    opening_hours: tags.opening_hours ?? null,
    cuisine: tags.cuisine ?? null,
    osm_url: `https://www.openstreetmap.org/${r.osm_type}/${r.osm_id}`,
    match_confidence: confidence,
    data_source: "osm",
  };
}

export async function findRestaurant(
  name: string,
  address: string,
): Promise<RestaurantInfo | null> {
  // Strategy 1: free-form query with name + address (high confidence if match)
  const fullQuery = freeFormQuery(name, address);
  const fullResults = await nominatimSearch(fullQuery);
  const restaurantMatches = fullResults.filter(isRestaurant);

  if (restaurantMatches.length > 0) {
    const best = restaurantMatches.sort(
      (a, b) =>
        tokenOverlap(name, b.name ?? "") - tokenOverlap(name, a.name ?? ""),
    )[0];
    return toRestaurantInfo(best, "high", name);
  }

  if (fullResults.length > 0) {
    return toRestaurantInfo(fullResults[0], "medium", name);
  }

  // Strategy 2: address-only search, then pick the best restaurant nearby
  const addressResults = await nominatimSearch(
    address.replace(/,/g, " ").replace(/\s+/g, " ").trim(),
  );
  const nearbyRestaurants = addressResults.filter(isRestaurant);

  if (nearbyRestaurants.length > 0) {
    const ranked = nearbyRestaurants
      .map((r) => ({
        r,
        score: tokenOverlap(name, r.name ?? "") * 10 + (r.importance ?? 0),
      }))
      .sort((a, b) => b.score - a.score);
    const top = ranked[0];
    const confidence: RestaurantInfo["match_confidence"] =
      top.score >= 10 ? "high" : "low";
    return toRestaurantInfo(top.r, confidence, name);
  }

  // Strategy 3: address found, but no restaurant tagged at it
  if (addressResults.length > 0) {
    return toRestaurantInfo(addressResults[0], "low", name);
  }

  return null;
}
