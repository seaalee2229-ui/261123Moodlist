import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { verifyTrack, verifyPlaylistTracks } from "../server/verify.js";

describe("verifyTrack", () => {
  test("iTunes API 검색 결과 일치 시 true 반환", async () => {
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({
        results: [
          { trackName: "Through the Night", artistName: "IU" }
        ]
      })
    });

    const isVerified = await verifyTrack({ artist: "아이유", title: "Through the Night" }, mockFetch);
    assert.equal(isVerified, true);
  });

  test("iTunes API 검색 결과 불일치 시 false 반환", async () => {
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({
        results: []
      })
    });

    const isVerified = await verifyTrack({ artist: "없는가수", title: "가짜곡명123" }, mockFetch);
    assert.equal(isVerified, false);
  });

  test("VERIFY_TRACKS=false일 때는 검증 없이 그대로 반환", async () => {
    delete process.env.VERIFY_TRACKS;
    const tracks = [{ title: "곡1", artist: "가수1", verified: null }];
    const verifiedTracks = await verifyPlaylistTracks(tracks);
    assert.equal(verifiedTracks[0].verified, null);
  });
});
