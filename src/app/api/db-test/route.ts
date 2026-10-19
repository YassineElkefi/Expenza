import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { ensureIndexes } from "@/lib/mongodb-indexes";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const db = await getDb();
    await ensureIndexes(db);

    await db.command({ ping: 1 });

    return NextResponse.json({
      ok: true,
      database: "expenza",
      authenticated: true,
      message: "MongoDB connection and Expenza authentication both work.",
    });
  } catch (error) {
    console.error("MongoDB test failed:", error);

    return NextResponse.json(
      { error: "Database connection failed." },
      { status: 500 }
    );
  }
}