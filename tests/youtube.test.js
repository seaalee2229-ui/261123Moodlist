import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { pickBestMatch, QuotaError } from "../server/youtube.js";

describe("pickBestMatch", () => {
  test("공식 Topic 채널 우선 매칭", () => {
    const items = [
      { id: { videoId: "cover123456" }, snippet: { title: "밤편지 커버 Cover", channelTitle: "일반채널" } },
      { id: { videoId: "topic123456" }, snippet: { title: "밤편지", channelTitle: "아이유 - Topic" } },
      { id: { videoId: "other123456" }, snippet: { title: "밤편지", channelTitle: "기타채널" } }
    ];
    const match = pickBestMatch(items, { artist: "아이유", title: "밤편지" });
    assert.equal(match, "topic123456");
  });

  test("제외 키워드(커버, 가사, 1시간) 필터링", () => {
    const items = [
      { id: { videoId: "cover123456" }, snippet: { title: "밤편지 [가사/Lyrics]", channelTitle: "음악채널" } },
      { id: { videoId: "hour1123456" }, snippet: { title: "밤편지 1시간 연속재생", channelTitle: "음악채널" } }
    ];
    const match = pickBestMatch(items, { artist: "아이유", title: "밤편지" });
    assert.equal(match, null);
  });

  test("곡명이 영상 제목에 포함되지 않으면 제외", () => {
    const items = [
      { id: { videoId: "other123456" }, snippet: { title: "좋은 날 - 아이유", channelTitle: "아이유" } }
    ];
    const match = pickBestMatch(items, { artist: "아이유", title: "밤편지" });
    assert.equal(match, null);
  });
});
