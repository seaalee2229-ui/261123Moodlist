let player = null;
let mode = null; // 'playlist' | 'single'
let queue = [];
let currentNo = null;
let apiReadyPromise = null;

function preloadApi() {
  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }
  if (!apiReadyPromise) {
    apiReadyPromise = new Promise((resolve) => {
      const existing = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (existing) existing();
        resolve();
      };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    });
  }
  return apiReadyPromise;
}

export function setTracks(tracks) {
  queue = (tracks || []).filter((t) => t.videoId && /^[A-Za-z0-9_-]{11}$/.test(t.videoId));
  preloadApi();
}

function showMiniPlayer() {
  const el = document.getElementById("mini-player");
  if (el) el.hidden = false;
}

function hideMiniPlayer() {
  const el = document.getElementById("mini-player");
  if (el) el.hidden = true;
}

export function setPlayback(val) {
  document.body.dataset.playback = val;

  const modeLabel = document.getElementById("player-mode-label");
  const trackLabel = document.getElementById("player-track-label");
  const pauseBtn = document.getElementById("player-pause-btn");
  const coverBadge = document.querySelector(".cover__badge");

  const currentTrack = queue.find((t) => t.no === currentNo);

  if (trackLabel && currentTrack) {
    trackLabel.textContent = `${currentTrack.title} — ${currentTrack.artist}`;
  }

  const isPaused = val.endsWith("-paused");

  if (modeLabel) {
    if (mode === "playlist") {
      const idx = queue.findIndex((t) => t.no === currentNo);
      modeLabel.textContent = `지금 재생 · ${String(idx + 1).padStart(2, "0")}/${String(queue.length).padStart(2, "0")}`;
    } else {
      modeLabel.textContent = "한 곡 재생";
    }
  }

  if (pauseBtn) {
    pauseBtn.textContent = isPaused ? "▶" : "❚❚";
    pauseBtn.setAttribute("aria-label", isPaused ? "재생" : "일시정지");
  }

  if (coverBadge) {
    coverBadge.textContent = (mode === "playlist" && !isPaused) ? "❚❚" : "▶";
  }

  // 트랙 목록 강조
  document.querySelectorAll(".track-row").forEach((row) => {
    const no = Number(row.dataset.no);
    const titleEl = row.querySelector(".track-row__title");
    const statusEl = row.querySelector(".track-row__status");
    if (no === currentNo && !val.startsWith("none")) {
      row.classList.add("is-playing");
      row.setAttribute("aria-current", "true");
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = isPaused ? "일시정지" : "재생 중";
      }
    } else {
      row.classList.remove("is-playing");
      row.removeAttribute("aria-current");
      if (statusEl) statusEl.hidden = true;
    }
  });
}

async function ensurePlayer() {
  await preloadApi();
  if (player) return player;

  showMiniPlayer();

  return new Promise((resolve) => {
    player = new window.YT.Player("yt-player", {
      host: "https://www.youtube-nocookie.com",
      width: "100%",
      height: "100%",
      playerVars: {
        playsinline: 1,
        rel: 0,
        origin: window.location.origin
      },
      events: {
        onReady: () => resolve(player),
        onStateChange: (e) => {
          if (mode === "playlist" && player.getPlaylistIndex) {
            const idx = player.getPlaylistIndex();
            currentNo = queue[idx]?.no ?? null;
          }
          if (e.data === window.YT.PlayerState.PLAYING) {
            setPlayback(`${mode}-playing`);
          } else if (e.data === window.YT.PlayerState.PAUSED) {
            setPlayback(`${mode}-paused`);
          } else if (e.data === window.YT.PlayerState.ENDED) {
            setPlayback(`${mode}-paused`);
          }
        },
        onError: () => {
          if (mode === "playlist" && player.nextVideo) {
            player.nextVideo();
          } else {
            setPlayback("single-paused");
          }
        },
        onAutoplayBlocked: () => {
          setPlayback("blocked");
        }
      }
    });
  });
}

export async function playAll() {
  if (queue.length === 0) return;
  const p = await ensurePlayer();
  showMiniPlayer();

  if (mode === "playlist") {
    const state = p.getPlayerState ? p.getPlayerState() : -1;
    if (state === window.YT.PlayerState.PLAYING) {
      p.pauseVideo();
    } else {
      p.playVideo();
    }
    return;
  }

  mode = "playlist";
  currentNo = queue[0].no;
  p.loadPlaylist(queue.map((t) => t.videoId), 0);
}

export async function playSingle(no) {
  const track = queue.find((t) => t.no === no);
  if (!track) return;

  const p = await ensurePlayer();
  showMiniPlayer();

  if (mode === "single" && currentNo === no) {
    const state = p.getPlayerState ? p.getPlayerState() : -1;
    if (state === window.YT.PlayerState.PLAYING) {
      p.pauseVideo();
    } else {
      p.playVideo();
    }
    return;
  }

  mode = "single";
  currentNo = no;
  p.loadVideoById(track.videoId);
}

export function stopPlayer() {
  if (player && player.stopVideo) {
    player.stopVideo();
  }
  mode = null;
  currentNo = null;
  setPlayback("none");
  hideMiniPlayer();
}

// 미니 플레이어 헤더 컨트롤 바인딩
document.addEventListener("DOMContentLoaded", () => {
  const pauseBtn = document.getElementById("player-pause-btn");
  const closeBtn = document.getElementById("player-close-btn");

  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      if (!player) return;
      const state = player.getPlayerState ? player.getPlayerState() : -1;
      if (state === window.YT.PlayerState.PLAYING) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      stopPlayer();
    });
  }
});
