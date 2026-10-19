import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { errors, jwtVerify, SignJWT } from "jose";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE_NAME = "expenza_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("JWT_SECRET must be set to a random value of at least 32 bytes.");
  }

  return new TextEncoder().encode(secret);
}

export function assertAuthConfiguration() {
  getJwtSecret();
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await derivePasswordHash(password, salt);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, encodedSalt, encodedHash] = storedHash.split("$");

  if (algorithm !== "scrypt" || !encodedSalt || !encodedHash) {
    return false;
  }

  const salt = Buffer.from(encodedSalt, "base64url");
  const expectedHash = Buffer.from(encodedHash, "base64url");

  if (salt.length !== 16 || expectedHash.length !== 64) {
    return false;
  }

  const actualHash = await derivePasswordHash(password, salt);
  return timingSafeEqual(actualHash, expectedHash);
}

function derivePasswordHash(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
      } else {
        resolve(derivedKey);
      }
    });
  });
}

export async function createSessionToken(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("expenza")
    .setAudience("expenza")
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getJwtSecret());
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getAuthenticatedUser() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: "expenza",
      audience: "expenza",
    });

    return typeof payload.sub === "string" ? { id: payload.sub } : null;
  } catch (error) {
    if (error instanceof errors.JOSEError) {
      return null;
    }

    throw error;
  }
}
