import { renderResult } from "./render.js";
import { setTracks } from "./player.js";

export const state = {
  view: "idle", // 'idle' | 'loading' | 'clarify' | 'result' | 'error' | 'refining'
  input: {
    mood: "",
    language: "auto"
  },
  playlist: null,
  questions: [],
  error: null
};

export function setState(patch) {
  Object.assign(state, patch);

  const main = document.getElementById("main-content");
  if (main) {
    main.dataset.state = state.view;
  }

  updateDOM();
}

function updateDOM() {
  const inputTile = document.getElementById("input-tile");
  const clarifyTile = document.getElementById("clarify-tile");
  const resultTile = document.getElementById("result-tile");
  const loadingTile = document.getElementById("loading-tile");
  const errorTile = document.getElementById("error-tile");
  const stickyBar = document.getElementById("sticky-bar");
  const submitBtn = document.getElementById("submit-btn");

  // 기본 노출 제어 (CSP가 HTML 인라인 style을 막으므로 hidden 속성으로 토글)
  if (inputTile) inputTile.hidden = state.view === "clarify";
  if (clarifyTile) clarifyTile.hidden = state.view !== "clarify";
  if (loadingTile) loadingTile.hidden = state.view !== "loading";
  if (errorTile) errorTile.hidden = state.view !== "error";
  if (stickyBar) stickyBar.hidden = !(state.view === "result" || state.view === "refining");

  if (submitBtn) {
    if (state.view === "loading") {
      submitBtn.textContent = "만드는 중…";
      submitBtn.disabled = true;
    } else {
      submitBtn.textContent = "추천받기";
      submitBtn.disabled = false;
    }
  }

  if (state.view === "result" && state.playlist && resultTile) {
    resultTile.hidden = false;
    resultTile.style.opacity = "1";
    setTracks(state.playlist.tracks);
    renderResult(state.playlist, resultTile);
  } else if (state.view === "refining" && resultTile) {
    resultTile.hidden = false;
    resultTile.style.opacity = "0.5";
  } else if (state.view !== "refining" && state.view !== "result" && resultTile) {
    resultTile.hidden = true;
  }

  if (state.view === "clarify" && clarifyTile) {
    const questionEl = document.getElementById("clarify-question");
    if (questionEl && state.questions.length > 0) {
      questionEl.textContent = state.questions[0];
    }
  }

  if (state.view === "error" && errorTile) {
    const errorMsgEl = document.getElementById("error-message");
    if (errorMsgEl && state.error) {
      errorMsgEl.textContent = state.error.message;
    }
  }
}
