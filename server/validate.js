export function normalizeArtist(artist) {
  if (typeof artist !== "string") return "";
  let norm = artist.toLowerCase();
  norm = norm.split(/\s*(feat\.|ft\.|&|,|\()\s*/)[0];
  return norm.replace(/\s+/g, "").trim();
}

export function normalizeTitle(title) {
  if (typeof title !== "string") return "";
  return title.toLowerCase().replace(/\s+/g, "").trim();
}

export function validatePlaylistResponse(data) {
  const hard = [];
  const soft = [];

  if (!data || typeof data !== "object") {
    return { hard: ["응답이 올바른 객체 형태가 아닙니다."], soft: [] };
  }

  const { status, questions, playlist } = data;

  if (status !== "ok" && status !== "clarify") {
    hard.push(`status는 'ok' 또는 'clarify'여야 합니다 (현재: ${status})`);
  }

  if (status === "clarify") {
    if (playlist !== null) {
      hard.push("clarify 상태일 때는 playlist가 null이어야 합니다.");
    }
    if (!Array.isArray(questions) || questions.length < 1 || questions.length > 2) {
      hard.push("clarify 상태일 때는 1~2개의 질문이 제공되어야 합니다.");
    }
    return { hard, soft };
  }

  // status === 'ok'
  if (!Array.isArray(questions) || questions.length !== 0) {
    hard.push("ok 상태일 때는 questions가 빈 배열이어야 합니다.");
  }

  if (!playlist || typeof playlist !== "object") {
    hard.push("ok 상태일 때는 playlist 객체가 필요합니다.");
    return { hard, soft };
  }

  const { title, description, mood, energy, flow, coverConcept, tracks } = playlist;

  if (typeof energy !== "number" || !Number.isInteger(energy) || energy < 1 || energy > 5) {
    hard.push("energy는 1에서 5 사이의 정수여야 합니다.");
  }

  if (!Array.isArray(mood) || mood.length < 1 || mood.length > 3) {
    hard.push("mood는 1개 이상 3개 이하의 배열이어야 합니다.");
  }

  if (!Array.isArray(tracks) || tracks.length !== 10) {
    hard.push(`tracks는 정확히 10곡이어야 합니다 (현재: ${tracks?.length ?? 0}곡)`);
  } else {
    const artistCounts = new Map();
    const trackSet = new Set();

    tracks.forEach((track, idx) => {
      if (!track || typeof track !== "object") {
        hard.push(`${idx + 1}번째 곡 데이터가 올바르지 않습니다.`);
        return;
      }

      const tTitle = typeof track.title === "string" ? track.title.trim() : "";
      const tArtist = typeof track.artist === "string" ? track.artist.trim() : "";
      const tReason = typeof track.reason === "string" ? track.reason.trim() : "";

      if (!tTitle) hard.push(`${idx + 1}번째 곡의 제목이 비어 있습니다.`);
      if (!tArtist) hard.push(`${idx + 1}번째 곡의 아티스트가 비어 있습니다.`);
      if (!tReason) hard.push(`${idx + 1}번째 곡의 추천 이유가 비어 있습니다.`);

      // 아티스트 중복 (최대 2곡)
      const normArtist = normalizeArtist(tArtist);
      if (normArtist) {
        const count = (artistCounts.get(normArtist) || 0) + 1;
        artistCounts.set(normArtist, count);
        if (count > 2) {
          hard.push(`아티스트 '${tArtist}'의 곡이 3곡 이상 포함되었습니다.`);
        }
      }

      // 곡 중복 방지
      const trackKey = `${normalizeArtist(tArtist)}|${normalizeTitle(tTitle)}`;
      if (trackKey && trackSet.has(trackKey)) {
        hard.push(`중복된 곡이 포함되어 있습니다: ${tArtist} - ${tTitle}`);
      }
      trackSet.add(trackKey);

      // soft rules
      if (tReason) {
        const sentences = tReason.split(/[.?!]\s+/).filter(Boolean);
        if (sentences.length > 1) {
          soft.push(`${idx + 1}번째 곡의 추천 이유가 1문장을 초과합니다.`);
        }
        if (/["'].{8,}["']/.test(tReason)) {
          soft.push(`${idx + 1}번째 곡에 가사 인용이 의심됩니다.`);
        }
      }
    });
  }

  // soft rules: 제목 및 커버 콘셉트
  if (typeof title === "string") {
    if (title.length < 4 || title.length > 15) {
      soft.push(`제목 길이가 4~15자를 벗어납니다 (현재: ${title.length}자)`);
    }
  }

  const hasKorean = (str) => typeof str === "string" && /[가-힣]/.test(str);
  if (!hasKorean(title) || !hasKorean(description)) {
    soft.push("제목 또는 설명에 한국어가 포함되어 있지 않습니다.");
  }

  return { hard, soft };
}

export function sanitizeCoverConcept(coverConcept, { mood = [], flow = "" }) {
  if (!coverConcept || typeof coverConcept !== "string" || coverConcept.trim().length === 0 || coverConcept.length > 300) {
    return `${(mood || []).join(", ")} 분위기의 ${flow || "조화로운"} 흐름을 표현한 추상적인 장면`;
  }
  // 따옴표 안 문구 및 연속 대문자 단어(브랜드 의심) 제거
  let clean = coverConcept.replace(/["'"][^"']*["']/g, "").replace(/\b[A-Z]{3,}\b/g, "");
  clean = clean.replace(/\s+/g, " ").trim();
  return clean || `${(mood || []).join(", ")} 분위기의 장면`;
}
