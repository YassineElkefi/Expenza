import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import {
  assertAuthConfiguration,
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth-server";

type UserDocument = {
  _id: import("mongodb").ObjectId;
  email: string;
  passwordHash: string;
};

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
    !normalizedEmail ||
    normalizedEmail.length > 254 ||
    typeof password !== "string" ||
    password.length > 128
  ) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 400 }
    );
  }

  try {
    assertAuthConfiguration();
    const db = await getDb();
    const user = await db
      .collection<UserDocument>("users")
      .findOne({ email: normalizedEmail });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = await createSessionToken(user._id.toString());
    const response = NextResponse.json({ ok: true });

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Sign in failed:", error);
    return NextResponse.json(
      { error: "Could not sign in. Please try again." },
      { status: 500 }
    );
  }
}
