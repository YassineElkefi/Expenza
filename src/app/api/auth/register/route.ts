import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ensureIndexes } from "@/lib/mongodb-indexes";
import {
  assertAuthConfiguration,
  createSessionToken,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth-server";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, password } = body as Record<string, unknown>;
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";

  if (
    normalizedEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { error: "Password must be between 8 and 128 characters." },
      { status: 400 }
    );
  }

  try {
    assertAuthConfiguration();
    const db = await getDb();
    await ensureIndexes(db);
    const passwordHash = await hashPassword(password);
    const result = await db.collection("users").insertOne({
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date(),
    });
    const token = await createSessionToken(result.insertedId.toString());
    const response = NextResponse.json({ ok: true });

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    console.error("Account registration failed:", error);
    return NextResponse.json(
      { error: "Could not create your account. Please try again." },
      { status: 500 }
    );
  }
}
