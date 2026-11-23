// Vercel 서버리스 진입점: /api/* 와 /covers/* 요청을 server.js의 handler로 넘긴다
import { handler } from "../server.js";

export default handler;
