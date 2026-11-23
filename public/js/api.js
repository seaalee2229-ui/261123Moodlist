let currentController = null;

export async function requestPlaylist({ mood, language = "auto", refinement = null, previous = null }) {
  // 이전 요청이 진행 중이면 중단
  if (currentController) {
    currentController.abort();
  }
  currentController = new AbortController();

  const response = await fetch("/api/playlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      mood,
      language,
      refinement,
      previous
    }),
    signal: currentController.signal
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.error?.message || "잠시 연결이 원활하지 않아요. 다시 시도해 주세요.";
    const errorCode = data?.error?.code || "NETWORK_ERROR";
    const err = new Error(errorMsg);
    err.code = errorCode;
    err.status = response.status;
    throw err;
  }

  return data;
}
