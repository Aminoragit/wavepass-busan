import { NextResponse } from "next/server";
import { getAppState } from "../../../lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getAppState();
    return NextResponse.json(state);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
