import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  connection,
  getOrCreateOperator,
  ensureOperatorFunded,
  issueStamp,
  countStamps,
  ensureCouponMint,
  issueCoupon,
  redeemCoupon,
  explorerTx,
  explorerAddress,
} from "../lib/wavepass.js";

const conn = connection();
const operator = await getOrCreateOperator();
console.log("operator:", operator.publicKey.toBase58());
const balance = await ensureOperatorFunded(conn, operator);
console.log("operator balance (SOL):", balance / LAMPORTS_PER_SOL);

// A persistent demo visitor wallet (kept in .local so reruns accumulate
// stamps), funded by a small transfer from the operator — the public RPC
// faucet is closed, so visitors never airdrop directly.
import { promises as fs } from "node:fs";
async function getOrCreateVisitor(): Promise<Keypair> {
  const file = ".local/visitor-keypair.json";
  try {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await fs.readFile(file, "utf8"))));
  } catch {
    const kp = Keypair.generate();
    await fs.mkdir(".local", { recursive: true });
    await fs.writeFile(file, JSON.stringify(Array.from(kp.secretKey)));
    return kp;
  }
}
const visitor = await getOrCreateVisitor();
console.log("visitor:", visitor.publicKey.toBase58());
if ((await conn.getBalance(visitor.publicKey)) < 0.05 * LAMPORTS_PER_SOL) {
  const { SystemProgram } = await import("@solana/web3.js");
  const { sendTx } = await import("../lib/send.js");
  await sendTx(
    conn,
    () => [
      SystemProgram.transfer({
        fromPubkey: operator.publicKey,
        toPubkey: visitor.publicKey,
        lamports: 0.1 * LAMPORTS_PER_SOL,
      }),
    ],
    [operator],
  );
  console.log("visitor funded with 0.1 SOL from operator");
}

// Check in at two spots -> two stamp tokens on devnet
for (const spotId of ["haeundae", "gamcheon"]) {
  const sig = await issueStamp(conn, operator, spotId, visitor.publicKey);
  console.log(`stamp issued [${spotId}]:`, explorerTx(sig));
}

const stamps = await countStamps(conn, visitor.publicKey);
console.log("stamps held:", stamps);

// Coupon mint + issue + redeem (burn)
const couponMint = await ensureCouponMint(conn, operator);
console.log("coupon mint:", explorerAddress(couponMint.toBase58()));
const issueSig = await issueCoupon(conn, operator, visitor.publicKey);
console.log("coupon issued:", explorerTx(issueSig));
const redeemSig = await redeemCoupon(conn, visitor);
console.log("coupon redeemed (burned):", explorerTx(redeemSig));

console.log("SMOKE OK");
