import { VIDEO_ID, buildPlayAllUrl } from "./links.js";
import { getFromCache, setToCache } from "./youtubeCache.js";

const SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";

export class QuotaError extends Error {
  constructor() {
    super("YouTube API quota exceeded");
    this.name = "QuotaError";
  }
}

export function decodeHtmlEntities(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function pickBestMatch(items, { artist, title }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const normTitle = title.toLowerCase().replace(/\s+/g, "");
  const normArtist = artist.toLowerCase().replace(/\s+/g, "");

  const candidates = [];

  for (const item of items) {
    const rawVidTitle = item?.snippet?.title || "";
    const rawChannel = item?.snippet?.channelTitle || "";
    const videoId = item?.id?.videoId;

    if (!videoId || !VIDEO_ID.test(videoId)) continue;

    const vidTitle = decodeHtmlEntities(rawVidTitle).toLowerCase();
    const vidChannel = decodeHtmlEntities(rawChannel).toLowerCase();

    // 제외 키워드 확인
    const excludes = ["cover", "커버", "reaction", "가사", "lyrics", "1시간", "1 hour", "loop"];
    if (excludes.some((kw) => vidTitle.includes(kw))) {
      continue;
    }

    // 제목에 곡명이 포함되어야 후보
    const condensedTitle = vidTitle.replace(/\s+/g, "");
    if (!condensedTitle.includes(normTitle)) {
      continue;
    }

    let score = 0;
    if (vidChannel.includes(normArtist)) score += 10;
    if (vidChannel.endsWith(" - topic")) score += 8;
    if (vidTitle.includes("official")) score += 5;

    candidates.push({ videoId, score });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].videoId;
}

export async function findVideoId({ artist, title }, fetchFn = globalThis.fetch) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "3",
    q: `${artist} ${title}`,
    videoEmbeddable: "true",
    videoCategoryId: "10", // 음악
    regionCode: "KR",
    fields: "items(id/videoId,snippet/title,snippet/channelTitle)",
    key: apiKey
  });

  const res = await fetchFn(`${SEARCH_ENDPOINT}?${params}`, {
    signal: AbortSignal.timeout(5000)
  });

  if (res.status === 403) {
    const data = await res.json().catch(() => ({}));
    const reason = data?.error?.errors?.[0]?.reason;
    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
      throw new QuotaError();
    }
  }

  if (!res.ok) {
    throw new Error(`YouTube API 오류: ${res.status}`);
  }

  const { items = [] } = await res.json();
  return pickBestMatch(items, { artist, title });
}

async function mapWithConcurrency(items, limit, fn) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

export async function attachYouTube(playlist, fetchFn = globalThis.fetch) {
  if (!process.env.YOUTUBE_API_KEY) {
    playlist.youtube = {
      status: "disabled",
      resolved: 0,
      total: playlist.tracks.length,
      playAllUrl: null
    };
    return playlist;
  }

  let quotaHit = false;

  try {
    // 8초 타임아웃 제한
    await Promise.race([
      mapWithConcurrency(playlist.tracks, 3, async (track) => {
        const cached = getFromCache(track);
        if (cached !== undefined) {
          track.videoId = cached;
          return;
        }
        if (quotaHit) return;

        try {
          const vid = await findVideoId(track, fetchFn);
          track.videoId = vid;
          setToCache(track, vid);
        } catch (e) {
          if (e instanceof QuotaError) {
            quotaHit = true;
          }
        }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000))
    ]);
  } catch (err) {
    // 8초 초과 시 그때까지 찾은 결과로 계속 진행
  }

  const ids = playlist.tracks.map((t) => t.videoId).filter(Boolean);

  let status = "ok";
  if (quotaHit && ids.length < playlist.tracks.length) {
    status = "quota_exceeded";
  } else if (ids.length === playlist.tracks.length) {
    status = "ok";
  } else if (ids.length > 0) {
    status = "partial";
  } else {
    status = "error";
  }

  playlist.youtube = {
    status,
    resolved: ids.length,
    total: playlist.tracks.length,
    playAllUrl: buildPlayAllUrl(ids)
  };

  return playlist;
}
