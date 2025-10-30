import { json, error } from "../utils/response.js";
import { exchangeCodeForToken, getUserInfo } from "../services/naver.js";
import { upsertUserByNaver, getUserByNaverId } from "../services/db.js";
import { signJWT } from "../services/jwt.js";

export async function authRouter(request, env) {
  const url = new URL(request.url);

  // 1️⃣ 로그인 시작
  if (url.pathname === "/auth/naver/start") {
    const redirect = url.searchParams.get("redirect"); // RN 딥링크
    const state = crypto.randomUUID();
    const authorizeUrl =
      `https://nid.naver.com/oauth2.0/authorize` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(env.NAVER_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(env.NAVER_REDIRECT_URI)}` +
      `&state=${state}`;
    return Response.redirect(authorizeUrl, 302);
  }

  // 2️⃣ 콜백
  if (url.pathname === "/auth/naver/callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const deepRedirect = url.searchParams.get("redirect");

    if (!code) return error("Missing code", 400);

    // 토큰 교환
    const token = await exchangeCodeForToken(env, code, state);
    if (!token?.access_token) return error("Token exchange failed", 400);

    // 사용자 정보 요청
    const me = await getUserInfo(token.access_token);
    const response = me?.response || {};
    const naverId = response.id;
    const nickname = response.nickname || `user_${naverId}`;
    const avatar = response.profile_image || null;
    const email = response.email || null;
    const gender = (response.gender || "").toLowerCase(); // "M" | "F"

    // 여성만 허용
    if (gender !== "f") {
      if (deepRedirect) {
        return Response.redirect(`${deepRedirect}?error=gender_required`, 302);
      }
      return error("여성 사용자만 이용 가능합니다. 네이버 '성별 제공'에 동의해주세요.", 403);
    }

    // DB upsert
    await upsertUserByNaver(env, {
      naver_id: naverId,
      gender: gender === "f" ? "female" : "male",
      nickname,
      avatar,
      email,
    });

    const user = await getUserByNaverId(env, naverId);
    if (!user) return error("Upsert failed", 500);

    // JWT 발급
    const jwt = await signJWT(
      { user_id: user.id, gender_verified: true },
      env.APP_JWT_SECRET,
      60 * 60 * 24 * 7
    );

    if (deepRedirect) {
      return Response.redirect(`${deepRedirect}?token=${encodeURIComponent(jwt)}`, 302);
    }
    return json({ token: jwt });
  }

  return error("Not Found", 404);
}
