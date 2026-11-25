import { promises as fs } from "node:fs";
import path from "node:path";
import { Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount, getMint } from "@solana/spl-token";
import {
  connection,
  getOrCreateOperator,
  loadState,
} from "./wavepass";
import { SPOTS, COUPON_THRESHOLD, type Spot } from "./spots";

/**
 * Server-side demo state for the WavePass web app.
 * The visitor wallet is custodied by the server for the hackathon demo
 * (a production version would use a browser wallet adapter instead).
 */

const VISITOR_FILE = path.join(process.cwd(), ".local", "visitor-keypair.json");

export async function getVisitor(): Promise<Keypair> {
  try {
    const raw = await fs.readFile(VISITOR_FILE, "utf8");
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  } catch {
    const kp = Keypair.generate();
    await fs.mkdir(path.dirname(VISITOR_FILE), { recursive: true });
    await fs.writeFile(VISITOR_FILE, JSON.stringify(Array.from(kp.secretKey)));
    return kp;
  }
}

export interface SpotState extends Spot {
  mint: string | null;
  held: boolean;
  totalIssued: number;
}

export interface AppState {
  visitor: string;
  operator: string;
  spots: SpotState[];
  stampCount: number;
  threshold: number;
  coupon: { mint: string | null; balance: number };
  totalStampsIssued: number;
}

export async function getAppState(): Promise<AppState> {
  const conn = connection();
  const operator = await getOrCreateOperator();
  const visitor = await getVisitor();
  const state = await loadState();

  const spots: SpotState[] = [];
  let totalStampsIssued = 0;
  for (const spot of SPOTS) {
    const rec = state.spotMints[spot.id];
    let held = false;
    let supply = 0;
    if (rec) {
      const mintPk = new PublicKey(rec.address);
      try {
        const mintInfo = await getMint(conn, mintPk);
        supply = Number(mintInfo.supply);
      } catch { /* mint not created yet */ }
      try {
        const ata = await getAssociatedTokenAddress(mintPk, visitor.publicKey);
        const account = await getAccount(conn, ata);
        held = account.amount > 0n;
      } catch { /* no stamp yet */ }
    }
    totalStampsIssued += supply;
    spots.push({ ...spot, mint: rec?.address ?? null, held, totalIssued: supply });
  }

  let couponBalance = 0;
  if (state.couponMint) {
    try {
      const ata = await getAssociatedTokenAddress(
        new PublicKey(state.couponMint.address),
        visitor.publicKey,
      );
      const account = await getAccount(conn, ata);
      couponBalance = Number(account.amount);
    } catch { /* no coupon yet */ }
  }

  return {
    visitor: visitor.publicKey.toBase58(),
    operator: operator.publicKey.toBase58(),
    spots,
    stampCount: spots.filter(s => s.held).length,
    threshold: COUPON_THRESHOLD,
    coupon: { mint: state.couponMint?.address ?? null, balance: couponBalance },
    totalStampsIssued,
  };
}
