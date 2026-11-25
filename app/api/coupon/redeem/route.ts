import { NextResponse } from "next/server";
import { connection, redeemCoupon, explorerTx } from "../../../../lib/wavepass";
import { getVisitor } from "../../../../lib/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const conn = connection();
    const visitor = await getVisitor();
    const sig = await redeemCoupon(conn, visitor);
    return NextResponse.json({ ok: true, tx: sig, explorer: explorerTx(sig) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
