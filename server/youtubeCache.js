import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { DATA_DIR } from "./paths.js";

const CACHE_FILE = path.join(DATA_DIR, "youtube-cache.json");

// 키: '정규화 아티스트|정규화 곡명' -> { videoId, savedAt }
const memoryCache = new Map();
let isDirty = false;
let saveTimer = null;

// 유효 기간: videoId 7일, null은 1일
const TTL_VALID = 7 * 24 * 60 * 60 * 1000;
const TTL_NULL = 1 * 24 * 60 * 60 * 1000;

export async function loadCache() {
  try {
    if (!existsSync(CACHE_FILE)) return;
    const data = await fs.readFile(CACHE_FILE, "utf-8");
    const json = JSON.parse(data);
    const now = Date.now();
    for (const [key, item] of Object.entries(json)) {
      const ttl = item.videoId ? TTL_VALID : TTL_NULL;
      if (now - item.savedAt < ttl) {
        memoryCache.set(key, item);
      }
    }
  } catch (err) {
    console.warn("YouTube 캐시 로딩 실패 (새 캐시 사용):", err.message);
  }
}

export function getFromCache({ artist, title }) {
  const key = `${artist.toLowerCase().trim()}|${title.toLowerCase().trim()}`;
  const item = memoryCache.get(key);
  if (!item) return undefined;

  const ttl = item.videoId ? TTL_VALID : TTL_NULL;
  if (Date.now() - item.savedAt > ttl) {
    memoryCache.delete(key);
    isDirty = true;
    return undefined;
  }
  return item.videoId;
}

export function setToCache({ artist, title }, videoId) {
  const key = `${artist.toLowerCase().trim()}|${title.toLowerCase().trim()}`;
  memoryCache.set(key, { videoId, savedAt: Date.now() });
  isDirty = true;
  scheduleSave();
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    if (!isDirty) return;
    try {
      const obj = Object.fromEntries(memoryCache);
      await fs.mkdir(DATA_DIR, { recursive: true });
      const tempFile = `${CACHE_FILE}.tmp.${Date.now()}`;
      await fs.writeFile(tempFile, JSON.stringify(obj), "utf-8");
      await fs.rename(tempFile, CACHE_FILE);
      isDirty = false;
    } catch (err) {
      console.warn("YouTube 캐시 저장 실패:", err.message);
    }
  }, 5000); // 5초 디바운스
}
