# backend

# 1️⃣ 패키지 초기화
npm init -y

# 2️⃣ 필수
npm install wrangler --save-dev

# 버전 확인
npx wrangler --version

# 실행
npx wrangler dev

# 3️⃣ 선택 (로컬에서 환경 변수 쓰거나 스크립트 깔끔히 하려면)
npm install cross-env prettier --save-dev

# 배포
npx wrangler publish
