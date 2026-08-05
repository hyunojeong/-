// 사용법: npx tsx scripts/hash-password.ts "새비밀번호"
// 출력된 해시를 .env 의 ADMIN_PASSWORD_HASH 에 넣으세요.
// 주의: Next.js 가 .env 값의 $ 기호를 변수 확장으로 해석하므로,
// 해시에 포함된 모든 $ 는 \$ 로 이스케이프해서 넣어야 합니다.
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error('사용법: npx tsx scripts/hash-password.ts "새비밀번호"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log(hash);
console.log("\n.env 에 넣을 값 (이스케이프 처리됨):");
console.log(hash.replaceAll("$", "\\$"));
