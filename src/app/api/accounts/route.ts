import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getDb } from "@/lib/mongodb";
import { ensureIndexes } from "@/lib/mongodb-indexes";

const accountTypes = new Set(["bank", "cash", "savings", "other"]);

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, accountType, openingBalanceMillimes } =
    body as Record<string, unknown>;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 100 ||
    typeof accountType !== "string" ||
    !accountTypes.has(accountType) ||
    typeof openingBalanceMillimes !== "number" ||
    !Number.isSafeInteger(openingBalanceMillimes) ||
    openingBalanceMillimes < 0
  ) {
    return NextResponse.json(
      { error: "Enter a valid account name, type, and balance." },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    await ensureIndexes(db);
    await db.collection("accounts").insertOne({
      userId: user.id,
      name: name.trim(),
      accountType,
      openingBalanceMillimes,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Account creation failed:", error);
    return NextResponse.json(
      { error: "Could not add the account. Please try again." },
      { status: 500 }
    );
  }
}
