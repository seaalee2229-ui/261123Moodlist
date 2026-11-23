export class AppError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// IP별 타임스탬프 배열 보관
const ipRequests = new Map();

// 5분마다 오래된 항목 정리
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of ipRequests.entries()) {
    const valid = timestamps.filter((t) => now - t < 60000);
    if (valid.length === 0) {
      ipRequests.delete(ip);
    } else {
      ipRequests.set(ip, valid);
    }
  }
}, 5 * 60 * 1000).unref();

export function checkRateLimit(req, limit = Number(process.env.RATE_LIMIT_PER_MINUTE) || 10, windowMs = 60000) {
  const ip = (process.env.TRUST_PROXY === "true" && req.headers["x-forwarded-for"])
    ? String(req.headers["x-forwarded-for"]).split(",")[0].trim()
    : req.socket.remoteAddress || "unknown";

  const now = Date.now();
  const timestamps = (ipRequests.get(ip) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0];
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    throw new AppError("RATE_LIMITED", "요청이 많아요. 1분 뒤에 다시 시도해 주세요.", 429);
  }

  timestamps.push(now);
  ipRequests.set(ip, timestamps);
}
