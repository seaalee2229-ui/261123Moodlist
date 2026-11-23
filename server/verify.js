const verifyCache = new Map(); // key -> { verified, savedAt }
const TTL_VERIFY = 24 * 60 * 60 * 1000; // 24시간 캐시

export async function verifyTrack({ artist, title }, fetchFn = globalThis.fetch) {
  const normArtist = artist.toLowerCase().trim();
  const normTitle = title.toLowerCase().trim();
  const cacheKey = `${normArtist}|${normTitle}`;

  const cached = verifyCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < TTL_VERIFY) {
    return cached.verified;
  }

  const query = `${artist} ${title}`;
  const url = `https://itunes.apple.com/search?${new URLSearchParams({
    term: query,
    entity: "song",
    limit: "5",
    country: "KR"
  })}`;

  try {
    const res = await fetchFn(url, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) {
      verifyCache.set(cacheKey, { verified: null, savedAt: Date.now() });
      return null;
    }
    const data = await res.json();
    const results = data.results || [];

    const normCondensedTitle = normTitle.replace(/\s+/g, "");
    const match = results.some((item) => {
      const itemTitle = (item.trackName || "").toLowerCase().replace(/\s+/g, "");
      return itemTitle.includes(normCondensedTitle) || normCondensedTitle.includes(itemTitle);
    });

    const verified = match ? true : false;
    verifyCache.set(cacheKey, { verified, savedAt: Date.now() });
    return verified;
  } catch (err) {
    return null;
  }
}

export async function verifyPlaylistTracks(tracks, fetchFn = globalThis.fetch) {
  if (process.env.VERIFY_TRACKS !== "true") {
    return tracks;
  }

  const results = await Promise.all(
    tracks.map(async (t) => {
      const v = await verifyTrack(t, fetchFn);
      return {
        ...t,
        verified: v
      };
    })
  );

  return results;
}
