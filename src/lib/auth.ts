import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "academy_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30일

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET 환경변수가 설정되지 않았습니다.");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken() {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS };
