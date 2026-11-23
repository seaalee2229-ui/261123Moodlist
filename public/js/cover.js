let pollController = null;

export function stopWatchCover() {
  if (pollController) {
    pollController.abort();
    pollController = null;
  }
}

export async function watchAiCover(ai, coverContainer, figcaption) {
  stopWatchCover();
  if (!ai || !ai.id) {
    if (figcaption) {
      figcaption.textContent = coverContainer.querySelector(".cover__collage")
        ? "수록곡 썸네일 · YouTube"
        : "";
    }
    return;
  }

  pollController = new AbortController();
  const signal = pollController.signal;

  if (ai.status === "ready" && ai.url) {
    swapCover(ai.url, coverContainer, figcaption);
    return;
  }

  if (figcaption) {
    figcaption.textContent = "AI 표지를 그리는 중…";
  }

  for (let i = 0; i < 60 && !signal.aborted; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    if (signal.aborted) break;

    try {
      const res = await fetch(`/api/cover/${ai.id}`, { signal });
      if (!res.ok) {
        if (res.status === 404 || res.status === 400) break;
        continue;
      }
      const data = await res.json();
      if (data.status === "ready" && data.url) {
        swapCover(data.url, coverContainer, figcaption);
        break;
      }
      if (data.status === "failed") {
        restoreCaption(coverContainer, figcaption);
        break;
      }
    } catch (e) {
      if (e.name === "AbortError") break;
    }
  }
}

function restoreCaption(coverContainer, figcaption) {
  if (!figcaption) return;
  if (coverContainer.querySelector(".cover__collage")) {
    figcaption.textContent = "수록곡 썸네일 · YouTube";
  } else {
    figcaption.textContent = "";
  }
}

function swapCover(url, coverContainer, figcaption) {
  if (!/^\/covers\/[a-f0-9]{16}\.webp$/.test(url)) return;

  const img = new Image();
  img.src = url;
  img.alt = "";
  img.className = "cover__image";
  img.style.opacity = "0";
  img.style.transition = "opacity var(--duration-base) var(--ease-standard)";

  img.onload = () => {
    const existingContent = coverContainer.querySelector(".cover__image, .cover__collage, .cover__text");
    if (existingContent) {
      existingContent.replaceWith(img);
    } else {
      coverContainer.prepend(img);
    }
    // 부드러운 페이드인
    requestAnimationFrame(() => {
      img.style.opacity = "1";
    });
    if (figcaption) {
      figcaption.textContent = "AI가 만든 표지";
    }
  };
}
