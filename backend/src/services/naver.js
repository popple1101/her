export async function exchangeCodeForToken(env, code, state) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: env.NAVER_CLIENT_ID,
    client_secret: env.NAVER_CLIENT_SECRET,
    code,
    state,
  });

  const res = await fetch("https://nid.naver.com/oauth2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
  });
  if (!res.ok) {
    console.error("NAVER TOKEN ERR", res.status);
    return null;
  }
  return await res.json();
}

export async function getUserInfo(accessToken) {
  const res = await fetch("https://openapi.naver.com/v1/nid/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    console.error("NAVER USER ERR", res.status);
    return null;
  }
  return await res.json();
}
