import { NextResponse } from "next/server";
import { connection, getOrCreateOperator, issueCoupon, explorerTx } from "../../../../lib/wavepass";
import { getVisitor, getAppState } from "../../../../lib/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const state = await getAppState();
    if (state.stampCount < state.threshold) {
      return NextResponse.json(
        { error: `스탬프 ${state.threshold}개가 필요합니다 (현재 ${state.stampCount}개)` },
        { status: 400 },
      );
    }
    if (state.coupon.balance > 0) {
      return NextResponse.json({ already: true });
    }
    const conn = connection();
    const operator = await getOrCreateOperator();
    const visitor = await getVisitor();
    const sig = await issueCoupon(conn, operator, visitor.publicKey);
    return NextResponse.json({ ok: true, tx: sig, explorer: explorerTx(sig) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
