export const playlistResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "questions", "playlist"],
  properties: {
    status: { type: "string", enum: ["ok", "clarify"] },
    questions: { type: "array", items: { type: "string" } },
    playlist: { anyOf: [{ $ref: "#/$defs/playlist" }, { type: "null" }] }
  },
  $defs: {
    playlist: {
      type: "object",
      additionalProperties: false,
      required: ["title", "description", "mood", "energy", "flow", "coverConcept", "tracks"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        mood: { type: "array", items: { type: "string" } },
        energy: { type: "integer", enum: [1, 2, 3, 4, 5] },
        flow: { type: "string" },
        coverConcept: { type: "string" },
        tracks: { type: "array", items: { $ref: "#/$defs/track" } }
      }
    },
    track: {
      type: "object",
      additionalProperties: false,
      required: ["no", "title", "artist", "reason"],
      properties: {
        no: { type: "integer" },
        title: { type: "string" },
        artist: { type: "string" },
        reason: { type: "string" }
      }
    }
  }
};
