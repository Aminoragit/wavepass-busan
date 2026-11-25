import { NextResponse } from "next/server";
import { connection, getOrCreateOperator, issueStamp, explorerTx } from "../../../lib/wavepass";
import { getVisitor, getAppState } from "../../../lib/server";
import { SPOTS } from "../../../lib/spots";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { spotId } = (await req.json()) as { spotId?: string };
    if (!spotId || !SPOTS.some(s => s.id === spotId)) {
      return NextResponse.json({ error: "unknown spot" }, { status: 400 });
    }
    const before = await getAppState();
    const spotBefore = before.spots.find(s => s.id === spotId);
    if (spotBefore?.held) {
      return NextResponse.json({ already: true, spotId });
    }
    const conn = connection();
    const operator = await getOrCreateOperator();
    const visitor = await getVisitor();
    const sig = await issueStamp(conn, operator, spotId, visitor.publicKey);
    return NextResponse.json({ ok: true, spotId, tx: sig, explorer: explorerTx(sig) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
