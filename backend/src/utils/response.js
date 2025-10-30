export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function error(message, status = 400) {
  return json({ error: message }, status);
}

export function withCORS(resp, origin, env) {
  const allow = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim());
  const ok = allow.includes(origin) ? origin : allow[0] || "*";
  const h = new Headers(resp.headers);
  h.set("Access-Control-Allow-Origin", ok);
  h.set("Access-Control-Allow-Credentials", "true");
  h.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  h.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  return new Response(resp.body, { status: resp.status, headers: h });
}

// "Authorization: Bearer xxx" -> xxx
export function parseAuthz(hv) {
  if (!hv) return null;
  const [, token] = hv.split(" ");
  return token || null;
}
