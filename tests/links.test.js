import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildSearchLink, buildPlayAllUrl } from "../server/links.js";

describe("buildSearchLink", () => {
  test("아티스트와 곡명으로 안전한 YouTube 검색 URL 생성", () => {
    const url = buildSearchLink("아이유", "밤편지");
    assert.ok(url.startsWith("https://www.youtube.com/results?search_query="));
    assert.ok(url.includes("%EC%95%84%EC%9D%B4%EC%9C%A0")); // 아이유
  });

  test("공백 및 특수문자 정규화", () => {
    const url = buildSearchLink("  IU  ", "  Good Day  ");
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("search_query"), "IU Good Day");
  });
});

describe("buildPlayAllUrl", () => {
  test("유효한 ID 2개 이상일 때 watch_videos URL 생성", () => {
    const ids = ["abcdefghijk", "12345678901"];
    const url = buildPlayAllUrl(ids);
    assert.equal(url, "https://www.youtube.com/watch_videos?video_ids=abcdefghijk,12345678901");
  });

  test("유효한 ID가 1개 이하이거나 올바르지 않으면 null", () => {
    assert.equal(buildPlayAllUrl(["invalid_short"]), null);
    assert.equal(buildPlayAllUrl(["abcdefghijk"]), null);
    assert.equal(buildPlayAllUrl([]), null);
    assert.equal(buildPlayAllUrl(null), null);
  });
});
