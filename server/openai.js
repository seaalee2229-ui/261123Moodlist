import { playlistResponseSchema } from "./schema.js";
import { AppError } from "./rateLimit.js";

const LANGUAGE_LABEL = {
  auto: "지정 안 함(국내·해외 혼합)",
  ko: "국내곡만",
  global: "해외곡만"
};

export function stripForPrompt(playlist) {
  if (!playlist || typeof playlist !== "object") return null;
  const { title, description, mood, energy, flow, coverConcept, tracks } = playlist;
  return {
    title: String(title || "").slice(0, 100),
    description: String(description || "").slice(0, 200),
    mood: Array.isArray(mood) ? mood.slice(0, 3).map((m) => String(m).slice(0, 30)) : [],
    energy: typeof energy === "number" ? energy : 3,
    flow: String(flow || "").slice(0, 50),
    coverConcept: String(coverConcept || "").slice(0, 200),
    tracks: Array.isArray(tracks)
      ? tracks.slice(0, 10).map((t) => ({
          no: t.no,
          title: String(t.title || "").slice(0, 100),
          artist: String(t.artist || "").slice(0, 100),
          reason: String(t.reason || "").slice(0, 200)
        }))
      : []
  };
}

export function buildUserMessage({ mood, language = "auto", refinement, previous }) {
  const lines = [
    "[사용자 입력]",
    "<<<",
    mood,
    ">>>",
    `[언어 선호] ${LANGUAGE_LABEL[language] || LANGUAGE_LABEL.auto}`
  ];

  if (refinement && previous) {
    const stripped = stripForPrompt(previous);
    lines.push(
      "[작업] 수정 요청",
      "[이전 플레이리스트]",
      JSON.stringify(stripped),
      "[수정 요청]",
      "<<<",
      refinement,
      ">>>",
      "수정 요청에 해당하는 조건만 바꾸고 나머지 조건(상황·언어·분위기 방향)은 유지하세요."
    );
  }

  return lines.join("\n");
}

export function extractResult(data) {
  if (!data) throw new AppError("UPSTREAM_ERROR", "OpenAI 응답이 비어 있습니다.", 502);
  if (data.status === "incomplete") throw new AppError("UPSTREAM_ERROR", "응답이 중간에 끊겼어요.", 502);

  const message = data.output?.find((item) => item.type === "message");
  const part = message?.content?.find((c) => c.type === "output_text" || c.type === "refusal");

  if (!part) throw new AppError("UPSTREAM_ERROR", "응답을 해석할 수 없어요.", 502);
  if (part.type === "refusal") throw new AppError("REFUSED", "이 요청으로는 플레이리스트를 만들 수 없어요.", 422);

  try {
    return JSON.parse(part.text);
  } catch (err) {
    throw new AppError("UPSTREAM_ERROR", "응답 JSON 형식을 파싱할 수 없습니다.", 502);
  }
}

export async function callOpenAI({ instructions, input, fetchFn = globalThis.fetch }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AppError("CONFIG_ERROR", "OpenAI API 키가 설정되지 않았습니다.", 500);
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.6";
  const timeoutMs = Number(process.env.REQUEST_TIMEOUT_MS) || 45000;

  let res;
  try {
    res = await fetchFn("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        instructions,
        input,
        text: {
          format: {
            type: "json_schema",
            name: "playlist_response",
            strict: true,
            schema: playlistResponseSchema
          }
        },
        max_output_tokens: 8000,
        store: false
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (err) {
    if (err.name === "TimeoutError") {
      throw new AppError("TIMEOUT", "요청 시간이 초과되었습니다.", 504);
    }
    throw new AppError("UPSTREAM_ERROR", "OpenAI 연결 중 오류가 발생했습니다.", 502);
  }

  if (res.status === 401) {
    throw new AppError("CONFIG_ERROR", "OpenAI API 키 인증에 실패했습니다.", 500);
  }
  if (res.status === 429) {
    throw new AppError("UPSTREAM_ERROR", "OpenAI 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.", 502);
  }
  if (!res.ok) {
    throw new AppError("UPSTREAM_ERROR", `OpenAI 서버 오류 (${res.status})`, 502);
  }

  const data = await res.json();
  return extractResult(data);
}
