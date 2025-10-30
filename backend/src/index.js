import { authRouter } from "./routes/auth.naver.js";
import { json, error, withCORS, parseAuthz } from "./utils/response.js";
import { verifyJWT } from "./services/jwt.js";
import { getUserById } from "./services/db.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    // CORS 프리플라이트
    if (request.method === "OPTIONS") {
      return withCORS(new Response(null, { status: 204 }), origin, env);
    }

    // 라우팅
    try {
      // 헬스체크
      if (url.pathname === "/health") {
        return withCORS(json({ ok: true, time: new Date().toISOString() }), origin, env);
      }

      // 인증 라우트
      if (url.pathname.startsWith("/auth/kakao")) {
        const resp = await authRouter(request, env);
        return withCORS(resp, origin, env);
      }

      // 세션 확인
      if (url.pathname === "/auth/session") {
        if (request.method !== "GET") {
          return withCORS(error("Method Not Allowed", 405), origin, env);
        }
        const token = parseAuthz(request.headers.get("Authorization"));
        if (!token) return withCORS(error("Unauthorized", 401), origin, env);

        const payload = await verifyJWT(token, env.APP_JWT_SECRET);
        if (!payload) return withCORS(error("Invalid token", 401), origin, env);

        const user = await getUserById(env, payload.user_id);
        if (!user) return withCORS(error("User not found", 404), origin, env);

        return withCORS(json({ user: {
          id: user.id, nickname: user.nickname, avatar_url: user.avatar_url,
          gender_verified: user.gender_verified === true
        }}), origin, env);
      }

      return withCORS(error("Not Found", 404), origin, env);
    } catch (e) {
      console.error(e);
      return withCORS(error("Server Error", 500), origin, env);
    }
  },
};
