import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/server/db";

export async function GET() {
  try {
    await connectDb();
    await mongoose.connection.db?.admin().ping();
    return NextResponse.json({ status: "ok", db: "up" });
  } catch (err) {
    console.error("Health check failed:", err);
    return NextResponse.json({ status: "error", db: "down" }, { status: 503 });
  }
}
