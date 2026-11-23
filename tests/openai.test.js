import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { callOpenAI, buildUserMessage, extractResult } from "../server/openai.js";

describe("buildUserMessage", () => {
  test("기본 분위기 입력 프롬프트 조립 및 프롬프트 주입 방지", () => {
    const msg = buildUserMessage({ mood: "비 오는 날 밤 드라이브", language: "ko" });
    assert.ok(msg.includes("[사용자 입력]"));
    assert.ok(msg.includes("<<<"));
    assert.ok(msg.includes("비 오는 날 밤 드라이브"));
    assert.ok(msg.includes("[언어 선호] 국내곡만"));
  });

  test("수정 요청 시 이전 데이터와 함께 프롬프트 조립", () => {
    const prev = {
      title: "기존 제목",
      tracks: [{ no: 1, title: "기존 곡", artist: "기존 가수", reason: "이유" }]
    };
    const msg = buildUserMessage({
      mood: "원래 무드",
      language: "auto",
      refinement: "더 신나게",
      previous: prev
    });
    assert.ok(msg.includes("[수정 요청]"));
    assert.ok(msg.includes("더 신나게"));
    assert.ok(msg.includes("[이전 플레이리스트]"));
  });
});

describe("extractResult and callOpenAI", () => {
  test("OpenAI 정상 응답 파싱", () => {
    const mockApiResponse = {
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                status: "ok",
                questions: [],
                playlist: {
                  title: "테스트 플레이리스트",
                  description: "설명",
                  mood: ["차분함"],
                  energy: 2,
                  flow: "잔잔",
                  coverConcept: "추상화",
                  tracks: []
                }
              })
            }
          ]
        }
      ]
    };

    const res = extractResult(mockApiResponse);
    assert.equal(res.status, "ok");
    assert.equal(res.playlist.title, "테스트 플레이리스트");
  });

  test("callOpenAI 모의 fetch 호출 테스트", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  status: "clarify",
                  questions: ["어떤 기분인가요?"],
                  playlist: null
                })
              }
            ]
          }
        ]
      })
    });

    const result = await callOpenAI({
      instructions: "시스템 지침",
      input: "아무거나",
      fetchFn: mockFetch
    });

    assert.equal(result.status, "clarify");
    assert.equal(result.questions[0], "어떤 기분인가요?");
  });
});
