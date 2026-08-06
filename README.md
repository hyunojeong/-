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
- **강의료 정산**: 강사·월을 선택하면 해당 월 진행 회차수 × 회차당 단가로 정산 금액 자동 계산

## 실제 배포하기 (Vercel + Neon Postgres, 무료)

원장님이 언제 어디서나(PC·휴대폰·아이패드) 접속해서 쓰려면 배포가 필요합니다.
아래 순서대로 진행하세요.

### 1. Neon에서 무료 Postgres 만들기

1. https://neon.tech 에서 가입 후 새 프로젝트 생성
2. 생성된 프로젝트의 **Connection string**(pooled 연결 문자열, 호스트명에 `-pooler`가
   포함된 것)을 복사해둡니다. 나중에 `DATABASE_URL` 로 사용합니다.

### 2. Vercel에 배포하기

1. https://vercel.com 에서 GitHub 계정으로 가입
2. "Add New Project" → 이 GitHub 저장소(`hyunojeong/-`) 선택 → Import
3. 배포 전에 **Environment Variables** 에 아래 3개를 입력합니다.

   | 변수명 | 값 |
   |---|---|
   | `DATABASE_URL` | 1번에서 복사한 Neon connection string |
   | `ADMIN_PASSWORD_HASH` | 아래 명령으로 생성 (달러 기호 이스케이프된 값 사용) |
   | `AUTH_SECRET` | 아래 명령으로 생성 |

   ```bash
   npx tsx scripts/hash-password.ts "원하는비밀번호"
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Deploy 클릭. 빌드 시 `prisma migrate deploy` 가 자동으로 실행되어 Neon
   데이터베이스에 테이블이 만들어집니다.

### 3. 초기 데이터 넣기

배포가 끝나면, 내 컴퓨터에서 Neon의 `DATABASE_URL` 을 임시로 사용해 기본
데이터(강사 2명, 강의실 A/B, 샘플 과정)를 한 번 넣어줍니다.

```bash
DATABASE_URL="Neon connection string" npx prisma db seed
```

기존 엑셀 스케줄 데이터를 이관하려면(이미 진행했다면 생략):

```bash
DATABASE_URL="Neon connection string" node scripts/import-legacy-schedule.mjs <데이터파일경로>
```

### 4. 접속

Vercel이 알려준 URL(예: `https://xxx.vercel.app`)로 접속해서 로그인하면 끝입니다.
이후 GitHub 저장소에 새 커밋이 올라갈 때마다 Vercel이 자동으로 재배포합니다.

## 로컬 개발

로컬에서 개발/테스트하려면 Postgres가 필요합니다 (Neon을 로컬 개발용으로 같이
써도 되고, 로컬에 Postgres를 설치해도 됩니다).

```bash
npm install
cp .env.example .env
```

`.env` 파일에 `DATABASE_URL`(Postgres 연결 문자열), `ADMIN_PASSWORD_HASH`,
`AUTH_SECRET` 을 채웁니다 (생성 방법은 위 "Vercel에 배포하기" 3번과 동일).

```bash
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

http://localhost:3000 접속 후 설정한 비밀번호로 로그인합니다.

## 기술 스택

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma + PostgreSQL (Neon 등)
- FullCalendar (캘린더 UI)
- 단일 관리자 비밀번호 로그인 (bcrypt + JWT 쿠키 세션)

## 다음 단계 (로드맵)

- 네이버 캘린더 개인 계정 연동 검토 중 (네이버 공식 API는 일정 "생성"만 지원하고
  수정·삭제·조회 API는 없어 활용 범위가 제한적 — 별도 논의 필요)

## 참고

- `.env` 의 `AUTH_SECRET`, `ADMIN_PASSWORD_HASH` 는 배포 환경마다 새로 생성한
  값으로 설정하세요 (로컬 개발용 값을 그대로 쓰지 마세요).
