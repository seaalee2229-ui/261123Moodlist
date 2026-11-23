import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validatePlaylistResponse, normalizeArtist, sanitizeCoverConcept } from "../server/validate.js";

describe("normalizeArtist", () => {
  test("정규화 및 피처링 제거", () => {
    assert.equal(normalizeArtist("IU"), "iu");
    assert.equal(normalizeArtist("iu"), "iu");
    assert.equal(normalizeArtist("IU (feat. Suga)"), "iu");
    assert.equal(normalizeArtist("IU ft. Suga"), "iu");
    assert.equal(normalizeArtist("IU & Park"), "iu");
  });
});

describe("validatePlaylistResponse", () => {
  const makeValidPlaylist = () => ({
    status: "ok",
    questions: [],
    playlist: {
      title: "빗길 위의 새벽",
      description: "비 오는 밤 드라이브를 위한 감성적인 플레이리스트입니다.",
      mood: ["차분함", "감성"],
      energy: 2,
      flow: "잔잔 → 고조 → 여운",
      coverConcept: "빗방울 맺힌 유리창 너머로 번지는 가로등 불빛",
      tracks: Array.from({ length: 10 }, (_, i) => ({
        no: i + 1,
        title: `곡제목 ${i + 1}`,
        artist: `가수 ${i + 1}`,
        reason: "분위기와 잘 어울립니다."
      }))
    }
  });

  test("정상 10곡 응답 통과", () => {
    const res = validatePlaylistResponse(makeValidPlaylist());
    assert.equal(res.hard.length, 0);
  });

  test("곡 수가 10곡이 아니면 hard 위반", () => {
    const invalid = makeValidPlaylist();
    invalid.playlist.tracks.pop(); // 9곡
    const res = validatePlaylistResponse(invalid);
    assert.ok(res.hard.some((msg) => msg.includes("10곡")));
  });

  test("같은 아티스트 3곡 포함 시 hard 위반", () => {
    const invalid = makeValidPlaylist();
    invalid.playlist.tracks[0].artist = "IU";
    invalid.playlist.tracks[1].artist = "iu";
    invalid.playlist.tracks[2].artist = "IU (feat. Suga)";
    const res = validatePlaylistResponse(invalid);
    assert.ok(res.hard.some((msg) => msg.includes("3곡 이상")));
  });

  test("곡 중복 시 hard 위반", () => {
    const invalid = makeValidPlaylist();
    invalid.playlist.tracks[1].artist = invalid.playlist.tracks[0].artist;
    invalid.playlist.tracks[1].title = invalid.playlist.tracks[0].title;
    const res = validatePlaylistResponse(invalid);
    assert.ok(res.hard.some((msg) => msg.includes("중복")));
  });

  test("energy 범위(1~5) 벗어나면 hard 위반", () => {
    const invalid = makeValidPlaylist();
    invalid.playlist.energy = 6;
    const res = validatePlaylistResponse(invalid);
    assert.ok(res.hard.some((msg) => msg.includes("energy")));
  });

  test("clarify 상태에서 playlist가 null이 아니면 hard 위반", () => {
    const invalid = {
      status: "clarify",
      questions: ["어떤 기분인가요?"],
      playlist: {}
    };
    const res = validatePlaylistResponse(invalid);
    assert.ok(res.hard.some((msg) => msg.includes("null")));
  });

  test("clarify 상태에서 1개 질문이면 통과", () => {
    const valid = {
      status: "clarify",
      questions: ["어떤 기분인가요?"],
      playlist: null
    };
    const res = validatePlaylistResponse(valid);
    assert.equal(res.hard.length, 0);
  });
});

describe("sanitizeCoverConcept", () => {
  test("빈 값인 경우 기본 문장 생성", () => {
    const result = sanitizeCoverConcept("", { mood: ["차분함"], flow: "잔잔한" });
    assert.ok(result.includes("차분함"));
  });

  test("따옴표 및 대문자 단어 제거", () => {
    const result = sanitizeCoverConcept('풍경과 "APPLE" 로고 없는 ARTWORK 밤거리', { mood: [] });
    assert.ok(!result.includes('"APPLE"'));
    assert.ok(!result.includes('ARTWORK'));
  });
});
