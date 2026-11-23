import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { pickInstantCover, buildCoverPrompt, startCoverJob } from "../server/cover.js";

describe("pickInstantCover", () => {
  test("썸네일이 4개 이상 있을 때 collage 모드로 최대 4개 선택", () => {
    const playlist = {
      tracks: [
        { videoId: "12345678901" },
        { videoId: "12345678902" },
        { videoId: "12345678903" },
        { videoId: "12345678904" },
        { videoId: "12345678905" }
      ]
    };
    const cover = pickInstantCover(playlist, "auto");
    assert.equal(cover.type, "collage");
    assert.equal(cover.thumbnails.length, 4);
    assert.equal(cover.thumbnails[0], "12345678901");
  });

  test("videoId가 없으면 text 표지 반환", () => {
    const playlist = { tracks: [{ videoId: null }] };
    const cover = pickInstantCover(playlist, "auto");
    assert.equal(cover.type, "text");
    assert.equal(cover.thumbnails.length, 0);
  });

  test("mode=ai이면 썸네일이 있어도 text 표지로 시작", () => {
    const playlist = { tracks: [{ videoId: "12345678901" }] };
    const cover = pickInstantCover(playlist, "ai");
    assert.equal(cover.type, "text");
  });
});

describe("buildCoverPrompt", () => {
  test("금지 사항 문구 포함 및 브랜드/곡명/인물 미포함", () => {
    const prompt = buildCoverPrompt({
      coverConcept: "비에 젖은 밤 도로 위로 번지는 붉은 미등 불빛",
      mood: ["차분함"],
      energy: 2,
      flow: "잔잔"
    });
    assert.ok(prompt.includes("no text"));
    assert.ok(prompt.includes("no real or recognizable people"));
    assert.ok(prompt.includes("no musicians"));
    assert.ok(prompt.includes("비에 젖은 밤 도로"));
    assert.ok(!prompt.includes("아이유"));
  });
});

describe("startCoverJob", () => {
  test("COVER_MODE=collage일 때 null 반환 (API 호출 0회)", () => {
    process.env.COVER_MODE = "collage";
    const job = startCoverJob({ coverConcept: "테스트", mood: [] });
    assert.equal(job, null);
    delete process.env.COVER_MODE;
  });
});
