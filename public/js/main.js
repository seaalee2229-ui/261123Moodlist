import { requestPlaylist } from "./api.js";
import { state, setState } from "./state.js";
import { saveHistoryItem, loadHistory, clearHistory } from "./storage.js";

let loadingTimer = null;
const loadingStages = [
  "분위기를 읽는 중…",
  "곡을 고르는 중…",
  "YouTube에서 찾는 중…"
];

function startLoadingStages() {
  let stageIdx = 0;
  const stageEl = document.getElementById("loading-stage-text");
  if (stageEl) {
    stageEl.textContent = loadingStages[0];
  }
  clearInterval(loadingTimer);
  loadingTimer = setInterval(() => {
    stageIdx = (stageIdx + 1) % loadingStages.length;
    if (stageEl) {
      stageEl.textContent = loadingStages[stageIdx];
    }
  }, 3000);
}

function stopLoadingStages() {
  clearInterval(loadingTimer);
}

async function handleGenerate({ mood, language = state.input.language, refinement = null, previous = null }) {
  const trimmed = mood.trim();
  if (!trimmed) {
    alert("분위기나 상황을 한 줄만 적어주세요.");
    return;
  }

  setState({
    view: refinement ? "refining" : "loading",
    input: { mood: trimmed, language }
  });

  if (!refinement) {
    startLoadingStages();
  }

  try {
    const data = await requestPlaylist({
      mood: trimmed,
      language,
      refinement,
      previous
    });

    stopLoadingStages();

    if (data.status === "clarify") {
      setState({
        view: "clarify",
        questions: data.questions || ["음악을 들을 분위기나 상황을 조금 더 자세히 알려주세요."],
        error: null
      });
      const clarifyInput = document.getElementById("clarify-input");
      if (clarifyInput) {
        clarifyInput.value = "";
        clarifyInput.focus();
      }
    } else if (data.status === "ok") {
      setState({
        view: "result",
        playlist: data.playlist,
        questions: [],
        error: null
      });

      // 로컬 스토리지에 기록 저장
      saveHistoryItem({ input: { mood: trimmed, language }, playlist: data.playlist });

      // 표지로 부드럽게 스크롤
      const resultTile = document.getElementById("result-tile");
      if (resultTile) {
        resultTile.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  } catch (err) {
    stopLoadingStages();
    if (err.name === "AbortError") return;
    setState({
      view: "error",
      error: { message: err.message || "잠시 연결이 원활하지 않아요. 다시 시도해 주세요." }
    });
  }
}

// 초기 이벤트 바인딩
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("mood-form");
  const input = document.getElementById("mood-input");
  const clarifyBtn = document.getElementById("clarify-btn");
  const clarifyInput = document.getElementById("clarify-input");
  const retryBtn = document.getElementById("retry-btn");
  const newPlaylistBtn = document.getElementById("new-playlist-btn");

  // 초기 상태: idle
  setState({ view: "idle" });
  if (input) input.focus();

  // 1. 분위기 입력 제출
  if (form && input) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      handleGenerate({ mood: input.value });
    });
  }

  // 2. 예시 칩 클릭
  document.querySelectorAll("[data-example]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ex = btn.dataset.example;
      if (input) input.value = ex;
      handleGenerate({ mood: ex });
    });
  });

  // 3. 언어 칩 선택
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-checked", "false"));
      btn.setAttribute("aria-checked", "true");
      state.input.language = btn.dataset.lang;
    });
  });

  // 4. 되묻기 답변 제출
  if (clarifyBtn && clarifyInput) {
    clarifyBtn.addEventListener("click", () => {
      const answer = clarifyInput.value.trim();
      if (!answer) return;
      const combined = `${state.input.mood} / ${answer}`;
      handleGenerate({ mood: combined });
    });
  }

  // 5. 다시 시도 버튼
  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      if (state.input.mood) {
        handleGenerate({ mood: state.input.mood });
      } else {
        setState({ view: "idle" });
      }
    });
  }

  // 7. 하단 스티키 바 수정 요청 칩
  document.querySelectorAll("[data-refine]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const refinement = btn.dataset.refine;
      if (!state.playlist) return;

      let lang = state.input.language;
      if (refinement === "K-POP만") lang = "ko";
      if (refinement === "해외곡만") lang = "global";

      handleGenerate({
        mood: state.input.mood,
        language: lang,
        refinement,
        previous: state.playlist
      });
    });
  });

  // 8. 하단 스티키 바 직접 수정 입력
  const refineSubmitBtn = document.getElementById("refine-submit-btn");
  const refineCustomInput = document.getElementById("refine-custom-input");
  if (refineSubmitBtn && refineCustomInput) {
    refineSubmitBtn.addEventListener("click", () => {
      const val = refineCustomInput.value.trim();
      if (!val || !state.playlist) return;
      handleGenerate({
        mood: state.input.mood,
        language: state.input.language,
        refinement: val,
        previous: state.playlist
      });
      refineCustomInput.value = "";
    });
  }

  // 9. 기록 모달 열기/닫기/복원
  const historyBtn = document.getElementById("history-btn");
  const historyDialog = document.getElementById("history-dialog");
  const closeHistoryBtn = document.getElementById("close-history-btn");
  const clearHistoryBtn = document.getElementById("clear-history-btn");
  const historyList = document.getElementById("history-list");

  function renderHistoryModal() {
    if (!historyList) return;
    historyList.replaceChildren();
    const items = loadHistory();
    if (items.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.className = "t-body";
      emptyLi.style.color = "var(--color-text-2)";
      emptyLi.textContent = "저장된 플레이리스트 기록이 없습니다.";
      historyList.appendChild(emptyLi);
      return;
    }

    items.forEach((item) => {
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.padding = "12px";
      li.style.background = "var(--color-field)";
      li.style.borderRadius = "var(--radius-sm)";

      const infoDiv = document.createElement("div");
      infoDiv.style.display = "flex";
      infoDiv.style.flexDirection = "column";

      const titleSpan = document.createElement("span");
      titleSpan.className = "t-body-strong";
      titleSpan.textContent = item.playlist.title;
      infoDiv.appendChild(titleSpan);

      const subSpan = document.createElement("span");
      subSpan.className = "t-caption";
      subSpan.style.color = "var(--color-text-2)";
      subSpan.textContent = `${item.input.mood} · ${item.playlist.tracks?.length ?? 10}곡`;
      infoDiv.appendChild(subSpan);

      const restoreBtn = document.createElement("button");
      restoreBtn.className = "btn-secondary t-caption";
      restoreBtn.type = "button";
      restoreBtn.textContent = "불러오기";
      restoreBtn.style.minHeight = "36px";
      restoreBtn.style.padding = "6px 14px";

      restoreBtn.addEventListener("click", () => {
        setState({
          view: "result",
          input: item.input,
          playlist: item.playlist,
          error: null
        });
        historyDialog.close();
      });

      li.appendChild(infoDiv);
      li.appendChild(restoreBtn);
      historyList.appendChild(li);
    });
  }

  if (historyBtn && historyDialog) {
    historyBtn.addEventListener("click", () => {
      renderHistoryModal();
      historyDialog.showModal();
    });
  }

  if (closeHistoryBtn && historyDialog) {
    closeHistoryBtn.addEventListener("click", () => {
      historyDialog.close();
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", () => {
      if (confirm("모든 플레이리스트 기록을 삭제하시겠습니까?")) {
        clearHistory();
        renderHistoryModal();
      }
    });
  }
});
