import { playAll, playSingle } from "./player.js";
import { watchAiCover } from "./cover.js";

export const mockPlaylist = {
  title: "빗길 위의 새벽",
  description: "빗소리와 함께 천천히 달리는 밤을 위한 플레이리스트",
  mood: ["차분함", "감성"],
  energy: 2,
  flow: "잔잔 → 고조 → 여운",
  tracks: [
    {
      no: 1,
      title: "밤편지",
      artist: "아이유",
      reason: "잔잔한 피아노가 빗소리와 자연스럽게 어울립니다.",
      link: "https://www.youtube.com/results?search_query=%EC%95%84%EC%9D%B4%EC%9C%A0+%EB%B0%A4%ED%8E%B8%EC%A7%80",
      videoId: "BzYnNdJhZQw",
      verified: null
    },
    {
      no: 2,
      title: "Rainy Days",
      artist: "V",
      reason: "비 오는 밤의 고요한 감정을 그대로 담은 곡입니다.",
      link: "https://www.youtube.com/results?search_query=V+Rainy+Days",
      videoId: "yTsINmrAK4I",
      verified: null
    },
    {
      no: 3,
      title: "비도 오고 그래서",
      artist: "헤이즈",
      reason: "차분하게 가라앉은 도로 위에서 듣기 좋습니다.",
      link: "https://www.youtube.com/results?search_query=%ED%97%A4%EC%9D%B4%EC%96%B4%EC%A6%88+%EB%B9%84%EB%8F%84+%EC%98%A4%EA%B3%A0+%EA%B7%B8%EB%9E%98%EC%84%9C",
      videoId: "afxLaQiLu-o",
      verified: null
    },
    {
      no: 4,
      title: "우산",
      artist: "에픽하이",
      reason: "빗물에 번지는 도심의 네온사인과 감성적인 멜로디가 이어집니다.",
      link: "https://www.youtube.com/results?search_query=%EC%97%90%ED%94%BD%ED%95%98%EC%9D%B4+%EC%9A%B0%EC%82%B0",
      videoId: "3r32fS3B2E0",
      verified: null
    },
    {
      no: 5,
      title: "비",
      artist: "폴킴",
      reason: "담담한 보컬이 혼자만의 드라이브에 깊은 여운을 줍니다.",
      link: "https://www.youtube.com/results?search_query=%ED%8F%B4%ED%82%B4+%EB%B9%84",
      videoId: "tK0_8Y0E8o8",
      verified: null
    },
    {
      no: 6,
      title: "Come Out and Play",
      artist: "Billie Eilish",
      reason: "조용하게 읊조리는 목소리가 안온한 차 안의 공기를 채웁니다.",
      link: "https://www.youtube.com/results?search_query=Billie+Eilish+Come+Out+and+Play",
      videoId: "daGb4430wTU",
      verified: null
    },
    {
      no: 7,
      title: "Drive",
      artist: "Ben Rector",
      reason: "빗길을 천천히 헤쳐 나가는 리듬감을 선사합니다.",
      link: "https://www.youtube.com/results?search_query=Ben+Rector+Drive",
      videoId: "8U2mX6gPzKw",
      verified: null
    },
    {
      no: 8,
      title: "Blue",
      artist: "볼빨간사춘기",
      reason: "새벽녘으로 흐르며 감정선이 서서히 짙어집니다.",
      link: "https://www.youtube.com/results?search_query=%EB%B3%BC%EB%B9%A8%EA%B0%84%EC%82%AC%EC%B6%98%EA%B8%B0+Blue",
      videoId: "AsXxuIdpkWM",
      verified: null
    },
    {
      no: 9,
      title: "주저하는 연인들을 위해",
      artist: "잔나비",
      reason: "차창을 두드리는 빗방울과 어우러져 아련한 밤의 분위기를 완성합니다.",
      link: "https://www.youtube.com/results?search_query=%EC%9E%94%EB%82%98%EB%B9%84+%EC%A3%BC%EC%A0%80%ED%95%98%EB%8A%94+%EC%97%B0%EC%9D%B8%EB%93%A4%EC%9D%84+%EC%9C%84%ED%95%B4",
      videoId: "d_BqX3qLwN8",
      verified: null
    },
    {
      no: 10,
      title: "Through the Night",
      artist: "IU",
      reason: "긴 드라이브의 끝자락, 편안하고 고요한 휴식을 건넵니다.",
      link: "https://www.youtube.com/results?search_query=IU+Through+the+Night",
      videoId: "BzYnNdJhZQw",
      verified: null
    }
  ],
  youtube: {
    status: "ok",
    resolved: 10,
    total: 10,
    playAllUrl: "https://www.youtube.com/watch_videos?video_ids=BzYnNdJhZQw,yTsINmrAK4I"
  },
  cover: {
    type: "text",
    thumbnails: [],
    ai: null
  }
};

export function renderResult(playlist, container) {
  container.replaceChildren();

  // 1. 가운데 타일 컨테이너
  const tileContainer = document.createElement("div");
  tileContainer.className = "tile__container";

  // 2. 표지 블록
  const coverBlock = document.createElement("figure");
  coverBlock.className = "cover-block";

  const coverBtn = document.createElement(playlist.youtube?.status === "disabled" ? "div" : "button");
  coverBtn.className = "cover";
  if (playlist.youtube?.status !== "disabled") {
    coverBtn.type = "button";
    coverBtn.setAttribute("aria-label", `${playlist.title} 전체 재생`);
    coverBtn.addEventListener("click", () => playAll());
  }

  // 표지 내부 채우기 (콜라주 또는 글자)
  if (playlist.cover?.type === "collage" && playlist.cover.thumbnails?.length > 0) {
    const collage = document.createElement("div");
    collage.className = `cover__collage ${playlist.cover.thumbnails.length === 1 ? "is-single" : ""}`;
    playlist.cover.thumbnails.forEach((id) => {
      if (/^[A-Za-z0-9_-]{11}$/.test(id)) {
        const cImg = document.createElement("img");
        cImg.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
        cImg.alt = "";
        collage.appendChild(cImg);
      }
    });
    coverBtn.appendChild(collage);
  } else {
    const coverText = document.createElement("div");
    coverText.className = "cover__text";

    const coverTitle = document.createElement("h2");
    coverTitle.className = "t-display-md";
    coverTitle.textContent = playlist.title;
    coverText.appendChild(coverTitle);

    const tagRow = document.createElement("div");
    tagRow.style.display = "flex";
    tagRow.style.gap = "8px";
    (playlist.mood || []).forEach((m) => {
      const t = document.createElement("span");
      t.className = "tag t-caption";
      t.textContent = m;
      tagRow.appendChild(t);
    });
    coverText.appendChild(tagRow);
    coverBtn.appendChild(coverText);
  }

  if (playlist.youtube?.status !== "disabled") {
    const badge = document.createElement("span");
    badge.className = "cover__badge";
    badge.setAttribute("aria-hidden", "true");
    badge.textContent = "▶";
    coverBtn.appendChild(badge);
  }

  coverBlock.appendChild(coverBtn);

  const figcaption = document.createElement("figcaption");
  figcaption.className = "cover__source t-fine";
  figcaption.textContent = playlist.cover?.type === "collage" ? "수록곡 썸네일 · YouTube" : "";
  coverBlock.appendChild(figcaption);

  // AI 표지 폴링 시작
  if (playlist.cover?.ai) {
    watchAiCover(playlist.cover.ai, coverBtn, figcaption);
  }

  tileContainer.appendChild(coverBlock);

  // 3. 제목 및 소개
  const titleEl = document.createElement("h1");
  titleEl.className = "t-display-lg";
  titleEl.style.marginTop = "32px";
  titleEl.textContent = playlist.title;
  tileContainer.appendChild(titleEl);

  const descEl = document.createElement("p");
  descEl.className = "t-lead-airy";
  descEl.style.marginTop = "12px";
  descEl.textContent = playlist.description;
  tileContainer.appendChild(descEl);

  // 4. 메타 정보 (태그, 에너지 미터, 흐름)
  const metaRow = document.createElement("div");
  metaRow.style.display = "flex";
  metaRow.style.flexWrap = "wrap";
  metaRow.style.gap = "12px";
  metaRow.style.alignItems = "center";
  metaRow.style.justifyContent = "center";
  metaRow.style.marginTop = "24px";

  // 에너지 미터
  const energyMeter = document.createElement("div");
  energyMeter.className = "energy-meter";
  energyMeter.setAttribute("role", "img");
  energyMeter.setAttribute("aria-label", `에너지 5단계 중 ${playlist.energy}`);

  const dotsWrapper = document.createElement("span");
  dotsWrapper.className = "energy-meter__dots";
  for (let i = 1; i <= 5; i++) {
    const dot = document.createElement("span");
    dot.className = `energy-meter__dot ${i <= playlist.energy ? "is-filled" : ""}`;
    dotsWrapper.appendChild(dot);
  }
  energyMeter.appendChild(dotsWrapper);

  const energyText = document.createElement("span");
  energyText.className = "t-caption";
  energyText.style.color = "var(--color-text-2)";
  energyText.textContent = `에너지 ${playlist.energy} / 5`;
  energyMeter.appendChild(energyText);

  metaRow.appendChild(energyMeter);

  const flowEl = document.createElement("span");
  flowEl.className = "t-caption";
  flowEl.style.color = "var(--color-text-2)";
  flowEl.textContent = playlist.flow;
  metaRow.appendChild(flowEl);

  tileContainer.appendChild(metaRow);

  // 5. 버튼 그룹
  const buttonRow = document.createElement("div");
  buttonRow.className = "action-buttons";
  buttonRow.style.display = "flex";
  buttonRow.style.gap = "12px";
  buttonRow.style.marginTop = "32px";
  buttonRow.style.justifyContent = "center";

  if (playlist.youtube?.status !== "disabled") {
    const playAllBtn = document.createElement("button");
    playAllBtn.className = "btn-primary t-body";
    playAllBtn.type = "button";
    playAllBtn.textContent = "▶ 전체 재생";
    playAllBtn.addEventListener("click", () => playAll());
    buttonRow.appendChild(playAllBtn);

    if (playlist.youtube?.playAllUrl) {
      const ytLink = document.createElement("a");
      ytLink.className = "btn-secondary t-body";
      ytLink.href = playlist.youtube.playAllUrl;
      ytLink.target = "_blank";
      ytLink.rel = "noopener noreferrer";
      ytLink.textContent = "YouTube에서 열기 ↗";
      buttonRow.appendChild(ytLink);
    }
  }

  const copyBtn = document.createElement("button");
  copyBtn.className = "btn-capsule t-caption";
  copyBtn.type = "button";
  copyBtn.textContent = "링크 복사";
  copyBtn.addEventListener("click", async () => {
    const textToCopy = playlist.youtube?.playAllUrl || window.location.href;
    try {
      await navigator.clipboard.writeText(textToCopy);
      const original = copyBtn.textContent;
      copyBtn.textContent = "복사했어요";
      setTimeout(() => {
        copyBtn.textContent = original;
      }, 2000);
    } catch {
      alert("클립보드 복사에 실패했습니다.");
    }
  });
  buttonRow.appendChild(copyBtn);

  const copyJsonBtn = document.createElement("button");
  copyJsonBtn.className = "btn-capsule t-caption";
  copyJsonBtn.type = "button";
  copyJsonBtn.textContent = "JSON 복사";
  copyJsonBtn.addEventListener("click", async () => {
    // 2.2 형식에서 verified, cover 제외
    const exportData = {
      title: playlist.title,
      description: playlist.description,
      mood: playlist.mood,
      energy: playlist.energy,
      flow: playlist.flow,
      tracks: (playlist.tracks || []).map((t) => ({
        no: t.no,
        title: t.title,
        artist: t.artist,
        reason: t.reason,
        link: t.link,
        videoId: t.videoId
      })),
      youtube: playlist.youtube
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      const original = copyJsonBtn.textContent;
      copyJsonBtn.textContent = "복사했어요";
      setTimeout(() => {
        copyJsonBtn.textContent = original;
      }, 2000);
    } catch {
      alert("클립보드 복사에 실패했습니다.");
    }
  });
  buttonRow.appendChild(copyJsonBtn);

  tileContainer.appendChild(buttonRow);

  // 6. 연결 상태 문구
  const statusEl = document.createElement("p");
  statusEl.className = "t-caption";
  statusEl.style.color = "var(--color-text-2)";
  statusEl.style.marginTop = "12px";

  if (playlist.youtube?.status === "disabled") {
    statusEl.textContent = "곡마다 YouTube 검색 링크로 감상할 수 있어요.";
  } else if (playlist.youtube?.status === "quota_exceeded") {
    statusEl.textContent = "오늘 YouTube 연결 한도를 다 썼어요. 곡마다 검색 링크로 들을 수 있어요.";
  } else if (playlist.youtube?.resolved === playlist.tracks.length) {
    statusEl.textContent = "10곡 모두 여기서 재생할 수 있어요.";
  } else {
    statusEl.textContent = `10곡 중 ${playlist.youtube?.resolved ?? 0}곡을 여기서 재생할 수 있어요.`;
  }
  tileContainer.appendChild(statusEl);

  // 7. 곡 목록 (ol)
  const tracklist = document.createElement("ol");
  tracklist.className = "tracklist";

  playlist.tracks.forEach((track) => {
    const li = document.createElement("li");
    li.className = "track-row";
    li.dataset.no = String(track.no);

    const playBtn = document.createElement("button");
    playBtn.className = "track-row__play";
    playBtn.type = "button";
    playBtn.setAttribute("aria-label", `${track.artist} - ${track.title} 재생`);
    playBtn.addEventListener("click", () => {
      if (track.videoId) {
        playSingle(track.no);
      } else {
        window.open(track.link, "_blank", "noopener,noreferrer");
      }
    });

    const noSpan = document.createElement("span");
    noSpan.className = "track-row__no t-tagline";
    noSpan.setAttribute("aria-hidden", "true");
    noSpan.textContent = String(track.no).padStart(2, "0");
    playBtn.appendChild(noSpan);

    const bodySpan = document.createElement("span");
    bodySpan.className = "track-row__body";

    const titleSpan = document.createElement("span");
    titleSpan.className = "track-row__title t-body-strong";
    titleSpan.textContent = track.title;
    bodySpan.appendChild(titleSpan);

    const artistSpan = document.createElement("span");
    artistSpan.className = "track-row__artist t-body";
    artistSpan.textContent = track.artist;
    bodySpan.appendChild(artistSpan);

    const reasonSpan = document.createElement("span");
    reasonSpan.className = "track-row__reason t-caption";
    reasonSpan.textContent = track.reason;
    bodySpan.appendChild(reasonSpan);

    playBtn.appendChild(bodySpan);
    li.appendChild(playBtn);

    const searchLink = document.createElement("a");
    searchLink.className = "track-row__search link";
    searchLink.href = track.link;
    searchLink.target = "_blank";
    searchLink.rel = "noopener noreferrer";
    searchLink.setAttribute("aria-label", `${track.artist} - ${track.title} YouTube에서 검색 (새 창)`);
    searchLink.textContent = "↗";
    li.appendChild(searchLink);

    tracklist.appendChild(li);
  });

  tileContainer.appendChild(tracklist);
  container.appendChild(tileContainer);
}
