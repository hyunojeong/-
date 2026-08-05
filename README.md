# 승무원 학원 스케줄 관리

승무원 학원 수업 스케줄을 관리하는 웹 애플리케이션입니다. 강의실 2개(A/B)와
강사(원장, 스피치 선생님)의 시간 충돌을 자동으로 방지하고, 학생별 수강 과정과
결제 현황을 관리합니다.

## 주요 기능

- **캘린더**: 월/주 단위로 수업 일정을 보고, 날짜 클릭으로 등록·수정
- **이중예약 방지**: 같은 시간대에 같은 강의실 또는 같은 강사가 겹치면 저장을 차단
- **과정 관리**: 과정(정규/커스텀/스피치 등)을 자유롭게 추가·비활성화, 과정별 기본 강의료 설정
- **학생/결제 관리**: 학생별 수강 과정 등록 시 과정의 기본 강의료가 자동 입력되며,
  개별 할인 등으로 수동 조정 가능. 등록 시점의 금액은 스냅샷으로 저장되어 이후
  과정의 기본가가 바뀌어도 과거 등록 건에는 영향을 주지 않습니다.

## 시작하기

```bash
npm install
cp .env.example .env
```

`.env` 파일에 아래 두 값을 채워주세요.

```bash
# 로그인 비밀번호 해시 생성
npx tsx scripts/hash-password.ts "원하는비밀번호"
# 출력된 "이스케이프 처리된 값"을 .env 의 ADMIN_PASSWORD_HASH 에 붙여넣으세요.

# 세션 서명용 시크릿 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 출력값을 .env 의 AUTH_SECRET 에 붙여넣으세요.
```

데이터베이스를 준비하고 기본 데이터(강사 2명, 강의실 A/B, 샘플 과정)를 넣습니다.

```bash
npx prisma migrate deploy
npx prisma db seed
```

개발 서버를 실행합니다.

```bash
npm run dev
```

http://localhost:3000 접속 후 설정한 비밀번호로 로그인합니다.

## 기술 스택

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite (개발용) — 배포 시 Postgres 등으로 교체 권장
- FullCalendar (캘린더 UI)
- 단일 관리자 비밀번호 로그인 (bcrypt + JWT 쿠키 세션)

## 다음 단계 (로드맵)

1. 기존 엑셀 스케줄(10개월치) 데이터 마이그레이션
2. 스피치 선생님 별도 계정/권한
3. 네이버 캘린더 개인 계정 연동 (일정 자동 반영)

## 배포 시 참고

- SQLite는 로컬 개발용입니다. Vercel 등 서버리스 환경은 파일시스템이 영구적이지
  않으므로 배포 시 Postgres(Neon, Supabase 등)로 datasource 를 교체하세요.
- `.env` 의 `AUTH_SECRET`, `ADMIN_PASSWORD_HASH` 는 배포 환경에서 반드시
  새로 생성한 값으로 교체하세요.
