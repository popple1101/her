import React, { useEffect, useMemo } from "react";
import { Button, Alert } from "react-native";
import * as AuthSession from "expo-auth-session";

const NAVER_CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.EXPO_PUBLIC_NAVER_CLIENT_SECRET;

const discovery = {
  authorizationEndpoint: "https://nid.naver.com/oauth2.0/authorize",
  tokenEndpoint: "https://nid.naver.com/oauth2.0/token",
};

export default function NaverLogin({ onSuccess }) {
  const redirectUri = useMemo(
    () => AuthSession.makeRedirectUri({ scheme: "luvar", path: "oauth" }),
    []
  );
  const state = useMemo(() => Math.random().toString(36).slice(2), []);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: NAVER_CLIENT_ID,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: ["name", "email", "gender"], // 동의한 항목만 내려옴
      extraParams: { state },
    },
    discovery
  );

  useEffect(() => {
    (async () => {
      if (response?.type !== "success" || !response.params?.code) return;
      try {
        // 1) 토큰 교환
        const body = new URLSearchParams({
          grant_type: "authorization_code",
          client_id: NAVER_CLIENT_ID,
          client_secret: NAVER_CLIENT_SECRET,
          code: response.params.code,
          state,
        }).toString();

        const tokenRes = await fetch(discovery.tokenEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
        const token = await tokenRes.json();
        if (!token.access_token) throw new Error(JSON.stringify(token));

        // 2) 사용자 정보
        const meRes = await fetch("https://openapi.naver.com/v1/nid/me", {
          headers: { Authorization: `Bearer ${token.access_token}` },
        });
        const me = await meRes.json();
        if (me?.resultcode !== "00") throw new Error(JSON.stringify(me));

        // gender: 'F' | 'M' | undefined (동의 안 하면 없음)
        onSuccess?.({ token, profile: me.response });
      } catch (e) {
        Alert.alert("네이버 로그인 실패", String(e?.message ?? e));
      }
    })();
  }, [response]);

  return (
    <Button
      title="네이버로 로그인"
      onPress={() => promptAsync({ useProxy: false })}
      disabled={!request}
    />
  );
}
