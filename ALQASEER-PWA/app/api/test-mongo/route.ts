import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    return NextResponse.json({
      ok: true,
      dbName: db.databaseName,
      message: "MongoDB connection success",
    });
  } catch (error) {
    console.error("GET /api/test-mongo failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
