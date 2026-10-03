import { createHmac, timingSafeEqual } from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { getSessionCookieOptions } from "./_core/cookies";

export const ADMIN_SESSION_COOKIE = "bhu_admin_session";
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function secret() {
  return process.env.ADMIN_DASHBOARD_PASSWORD ?? "";
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function verifyAdminPassword(password: string) {
  const configured = secret();
  if (!configured || !password) return false;
  const expected = Buffer.from(configured);
  const received = Buffer.from(password);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function createAdminSession() {
  const payload = `${Date.now()}.${crypto.randomUUID()}`;
  return `${payload}.${signature(payload)}`;
}

export function isAdminSession(req: Request) {
  const token = parseCookieHeader(req.headers.cookie ?? "")[ADMIN_SESSION_COOKIE];
  if (!token || !secret()) return false;
  const [issuedAt, nonce, providedSignature] = token.split(".");
  if (!issuedAt || !nonce || !providedSignature || !/^\d+$/.test(issuedAt)) return false;
  if (Date.now() - Number(issuedAt) > ADMIN_SESSION_TTL_MS) return false;
  const expected = Buffer.from(signature(`${issuedAt}.${nonce}`));
  const received = Buffer.from(providedSignature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function setAdminSession(res: Response, req: Request) {
  res.cookie(ADMIN_SESSION_COOKIE, createAdminSession(), { ...getSessionCookieOptions(req), maxAge: ADMIN_SESSION_TTL_MS });
}

export function clearAdminSession(res: Response, req: Request) {
  res.clearCookie(ADMIN_SESSION_COOKIE, { ...getSessionCookieOptions(req), maxAge: -1 });
}
