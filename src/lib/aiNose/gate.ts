// Edge runtime 호환 — Web Crypto API 만 사용 (node:crypto X)
import { cookies } from "next/headers";

const COOKIE_NAME = "ainose_gate";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 14; // 14일

const enc = new TextEncoder();

function getSecret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("SUPABASE_SERVICE_ROLE_KEY 가 없어요 — gate 시크릿 누락");
  return s;
}

async function hmacSign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return bufferToHex(sigBuf);
}

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function verifyGateCredentials(user: string, pass: string): boolean {
  const expectedUser = process.env.AINOSE_USER || "";
  const expectedPass = process.env.AINOSE_PASS || "";
  if (!expectedUser || !expectedPass) return false;
  return constantTimeEqual(user, expectedUser) && constantTimeEqual(pass, expectedPass);
}

export async function makeGateCookieValue(user: string): Promise<string> {
  const issuedAt = Date.now();
  const payload = `${user}.${issuedAt}`;
  const sig = await hmacSign(payload);
  return `${payload}.${sig}`;
}

export async function isValidGateCookie(value: string | undefined | null): Promise<boolean> {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [user, issuedAt, sig] = parts;
  const expected = await hmacSign(`${user}.${issuedAt}`);
  if (!constantTimeEqual(sig, expected)) return false;
  const issued = Number(issuedAt);
  if (!Number.isFinite(issued)) return false;
  if (Date.now() - issued > COOKIE_MAX_AGE * 1000) return false;
  if (user !== process.env.AINOSE_USER) return false;
  return true;
}

export async function setGateCookie(user: string) {
  const value = await makeGateCookieValue(user);
  cookies().set({
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearGateCookie() {
  cookies().set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}

export async function isGateUnlocked(): Promise<boolean> {
  const c = cookies().get(COOKIE_NAME);
  return await isValidGateCookie(c?.value);
}

export const GATE_COOKIE_NAME = COOKIE_NAME;
