const headers = (env) => ({
  "Content-Type": "application/json",
  "apikey": env.SUPABASE_SERVICE_ROLE,
  "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
});

export async function upsertUserByKakao(env, { kakao_id, gender, nickname, avatar, email }) {
  // PostgREST upsert: Prefer header 사용(유니크 키 = kakao_id)
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/app_users`, {
    method: "POST",
    headers: {
      ...headers(env),
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify([{
      kakao_id,
      gender,
      gender_verified: gender === "female",
      nickname,
      avatar_url: avatar,
      email,
      last_login_at: new Date().toISOString(),
    }]),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("upsert error", res.status, t);
    throw new Error("upsert failed");
  }
}

export async function upsertUserByNaver(env, { naver_id, gender, nickname, avatar, email }) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/app_users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": env.SUPABASE_SERVICE_ROLE,
      "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify([{
      naver_id,
      gender,
      gender_verified: gender === "female",
      nickname,
      avatar_url: avatar,
      email,
      last_login_at: new Date().toISOString(),
    }]),
  });
  if (!res.ok) throw new Error("upsert failed");
}

export async function getUserByNaverId(env, naver_id) {
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/app_users`);
  url.searchParams.set("select", "id,nickname,avatar_url,gender_verified");
  url.searchParams.set("naver_id", `eq.${naver_id}`);

  const res = await fetch(url, {
    headers: {
      "apikey": env.SUPABASE_SERVICE_ROLE,
      "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0] || null;
}

