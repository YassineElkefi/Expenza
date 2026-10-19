import "server-only";
import type { Db } from "mongodb";

export async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("accounts").createIndex({ userId: 1, createdAt: 1 }),
    db.collection("transactions").createIndex({
      userId: 1,
      transactionDate: -1,
    }),
    db.collection("transactions").createIndex({
      userId: 1,
      accountId: 1,
      transactionDate: -1,
    }),
    db.collection("salarySettings").createIndex(
      { userId: 1 },
      { unique: true }
    ),
    db.collection("obligations").createIndex({
      userId: 1,
      active: 1,
      nextDueDate: 1,
    }),
    db.collection("obligationPayments").createIndex({
      userId: 1,
      obligationId: 1,
      paidAt: -1,
    }),
    db.collection("savingsGoals").createIndex({ userId: 1 }),
  ]);
}