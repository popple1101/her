// src/services/db.js

/** ─────────────────────────────────────────────────────────
 * Supabase PostgREST 공통 헤더/요청 유틸
 * ───────────────────────────────────────────────────────── */
const supaHeaders = (env) => ({
  "Content-Type": "application/json",
  apikey: env.SUPABASE_SERVICE_ROLE,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
});

async function supaRequest(env, path, init = {}) {
  const res = await fetch(`${env.SUPABASE_URL}${path}`, {
    ...init,
    headers: { ...supaHeaders(env), ...(init.headers || {}) },
  });
  return res;
}

/** ─────────────────────────────────────────────────────────
 * 관리자 화이트리스트 확인 (네이버 ID)
 *  - admin_whitelist(naver_id TEXT PRIMARY KEY)
 * ───────────────────────────────────────────────────────── */
export async function isAdminWhitelisted(env, naver_id) {
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/admin_whitelist`);
  url.searchParams.set("select", "naver_id");
  url.searchParams.set("naver_id", `eq.${naver_id}`);

  const res = await fetch(url, { headers: supaHeaders(env) });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("isAdminWhitelisted error", res.status, t);
    return false;
  }
  const rows = await res.json();
  return rows && rows.length > 0;
}

/** ─────────────────────────────────────────────────────────
 * 사용자 Upsert (네이버 로그인)
 *  - unique key: naver_id
 *  - role: 'admin' | 'user' (기본 user)
 *  - gender: 'female' | 'male' (여성만 정상 가입, admin은 라우터에서 예외처리)
 * ───────────────────────────────────────────────────────── */
export async function upsertUserByNaver(
  env,
  { naver_id, gender, nickname, avatar, email, role = "user", gender_verified = false }
) {
  const payload = [
    {
      naver_id,
      gender,
      gender_verified, // 라우터에서 (여성 true) or (관리자 예외 true)로 결정해서 전달
      nickname,
      avatar_url: avatar,
      email,
      role, // 'admin' | 'user'
      last_login_at: new Date().toISOString(),
    },
  ];

  const res = await supaRequest(env, "/rest/v1/app_users", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("upsertUserByNaver error", res.status, t);
    throw new Error("upsertUserByNaver failed");
  }
}

/** ─────────────────────────────────────────────────────────
 * naver_id로 사용자 조회
 * ───────────────────────────────────────────────────────── */
export async function getUserByNaverId(env, naver_id) {
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/app_users`);
  url.searchParams.set("select", "id,nickname,avatar_url,gender_verified,role");
  url.searchParams.set("naver_id", `eq.${naver_id}`);

  const res = await fetch(url, { headers: supaHeaders(env) });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("getUserByNaverId error", res.status, t);
    return null;
  }
  const rows = await res.json();
  return rows?.[0] || null;
}

/** ─────────────────────────────────────────────────────────
 * id로 사용자 조회 (/auth/session 용)
 * ───────────────────────────────────────────────────────── */
export async function getUserById(env, id) {
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/app_users`);
  url.searchParams.set("select", "id,nickname,avatar_url,gender_verified,role");
  url.searchParams.set("id", `eq.${id}`);

  const res = await fetch(url, { headers: supaHeaders(env) });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("getUserById error", res.status, t);
    return null;
  }
  const rows = await res.json();
  return rows?.[0] || null;
}

/** ─────────────────────────────────────────────────────────
 * (옵션) 마지막 로그인 시간만 갱신하고 싶을 때
 * ───────────────────────────────────────────────────────── */
export async function touchLastLogin(env, id) {
  const res = await supaRequest(env, "/rest/v1/app_users?id=eq." + encodeURIComponent(id), {
    method: "PATCH",
    body: JSON.stringify({ last_login_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("touchLastLogin error", res.status, t);
  }
}

/*관리자 예외는 라우터(auth.naver.js)에서 isAdminWhitelisted로 판정 → upsertUserByNaver(..., { role: 'admin', gender_verified: true, gender: 'female' })처럼 넘겨주면 돼.

일반 사용자는 네이버 gender가 F일 때만: role: 'user', gender: 'female', gender_verified: true.

/auth/session은 getUserById 그대로 사용 가능.*/