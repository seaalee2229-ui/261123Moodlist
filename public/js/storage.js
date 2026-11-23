const STORAGE_KEY = "moodlist:history:v1";

export function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter((item) => item && typeof item === "object" && item.playlist);
  } catch (err) {
    console.warn("기록 불러오기 실패:", err);
    return [];
  }
}

export function saveHistoryItem({ input, playlist }) {
  try {
    const list = loadHistory();
    const newItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
      input,
      playlist
    };

    // 최신 항목 맨 앞 추가 및 최대 10개 유지
    const updated = [newItem, ...list.filter((it) => it.playlist.title !== playlist.title)].slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn("기록 저장 실패:", err);
    return [];
  }
}

export function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("기록 삭제 실패:", err);
  }
}
