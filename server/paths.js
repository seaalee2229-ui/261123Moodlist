import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Vercel 서버리스는 /tmp만 쓰기 가능 (인스턴스별 임시 저장소)
export const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "moodlist-data")
  : path.join(__dirname, "..", "data");

export const COVERS_DIR = path.join(DATA_DIR, "covers");
