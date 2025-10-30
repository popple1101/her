// Base64URL helpers
const b64url = {
  encode: (ab) => {
    let str = btoa(String.fromCharCode(...new Uint8Array(ab)));
    return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  },
  fromString: (s) => new TextEncoder().encode(s),
};

async function importKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    b64url.fromString(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signJWT(payload, secret, expSeconds = 3600) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const full = { iat: now, exp: now + expSeconds, ...payload };

  const enc = (obj) => b64url.encode(new TextEncoder().encode(JSON.stringify(obj)));
  const unsigned = `${enc(header)}.${enc(full)}`;

  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${b64url.encode(sig)}`;
}

export async function verifyJWT(token, secret) {
  try {
    const [h, p, s] = token.split(".");
    const data = `${h}.${p}`;
    const key = await importKey(secret);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
      new TextEncoder().encode(data)
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(
      Uint8Array.from(atob(p.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))
    ));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
