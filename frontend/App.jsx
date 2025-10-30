import React from "react";
import { View } from "react-native";
import NaverLogin from "./src/auth/NaverLogin";

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      <NaverLogin
        onSuccess={({ token, profile }) => {
          console.log("NAVER profile:", profile); // profile.gender === 'F' | 'M'
          // TODO: 우리 서버로 전달해 JWT 세션 발급
        }}
      />
    </View>
  );
}
