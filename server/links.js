export const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function buildSearchLink(artist, title) {
  const query = `${artist} ${title}`.replace(/\s+/g, " ").trim();
  return "https://www.youtube.com/results?" + new URLSearchParams({ search_query: query });
}

export function buildPlayAllUrl(videoIds) {
  if (!Array.isArray(videoIds)) return null;
  const ids = videoIds.filter((id) => typeof id === "string" && VIDEO_ID.test(id));
  return ids.length >= 2 ? `https://www.youtube.com/watch_videos?video_ids=${ids.join(",")}` : null;
}
