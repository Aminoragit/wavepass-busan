import { promises as fs } from "node:fs";
import path from "node:path";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createBurnInstruction,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";
import { sendTx } from "./send";

/**
 * WavePass on-chain core (Solana devnet).
 *
 * Model:
 * - Each Busan spot has its own SPL token mint (decimals = 0). One token in a
 *   visitor's wallet = one verified check-in "stamp" for that spot.
 * - A separate coupon mint represents tokenized local-shop vouchers. Coupons
 *   are minted to visitors who reach the stamp threshold and are BURNED on
 *   redemption, so a coupon can never be spent twice.
 * - The operator keypair (demo issuer) is the mint authority. In production
 *   this role maps to the city / merchant consortium issuer.
 *
 * All writes go through lib/send.ts (poll-based confirmation), because the
 * default sendAndConfirm reports false expiries on slow networks.
 */

const LOCAL_DIR = path.join(process.cwd(), ".local");
const OPERATOR_FILE = path.join(LOCAL_DIR, "operator-keypair.json");
const STATE_FILE = path.join(LOCAL_DIR, "wavepass-state.json");

export function connection(): Connection {
  return new Connection(clusterApiUrl("devnet"), {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 180_000,
  });
}

export async function getOrCreateOperator(): Promise<Keypair> {
  try {
    const raw = await fs.readFile(OPERATOR_FILE, "utf8");
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  } catch {
    const kp = Keypair.generate();
    await fs.mkdir(LOCAL_DIR, { recursive: true });
    await fs.writeFile(OPERATOR_FILE, JSON.stringify(Array.from(kp.secretKey)));
    return kp;
  }
}

export async function ensureOperatorFunded(
  conn: Connection,
  operator: Keypair,
): Promise<number> {
  // The public RPC faucet is closed on devnet; top-ups go through
  // https://faucet.solana.com. This just reports the current balance.
  return conn.getBalance(operator.publicKey);
}

interface MintRecord {
  address: string;
  secret: number[];
}

interface WavePassState {
  spotMints: Record<string, MintRecord>;
  couponMint?: MintRecord;
}

export async function loadState(): Promise<WavePassState> {
  try {
    const parsed = JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
    if (parsed && typeof parsed === "object" && "spotMints" in parsed) {
      return parsed as WavePassState;
    }
  } catch {
    /* fall through to empty state */
  }
  return { spotMints: {} };
}

async function saveState(state: WavePassState): Promise<void> {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

async function ensureMint(
  conn: Connection,
  operator: Keypair,
  record: MintRecord | undefined,
  persist: (rec: MintRecord) => Promise<void>,
): Promise<PublicKey> {
  const mintKp = record
    ? Keypair.fromSecretKey(Uint8Array.from(record.secret))
    : Keypair.generate();
  if (!record) {
    await persist({
      address: mintKp.publicKey.toBase58(),
      secret: Array.from(mintKp.secretKey),
    });
  }
  const existing = await conn.getAccountInfo(mintKp.publicKey);
  if (!existing) {
    const rent = await getMinimumBalanceForRentExemptMint(conn);
    await sendTx(
      conn,
      () => [
        SystemProgram.createAccount({
          fromPubkey: operator.publicKey,
          newAccountPubkey: mintKp.publicKey,
          space: MINT_SIZE,
          lamports: rent,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(mintKp.publicKey, 0, operator.publicKey, null),
      ],
      [operator, mintKp],
    );
  }
  return mintKp.publicKey;
}

/** Create (or reuse) the stamp mint for a spot. Returns the mint address. */
export async function ensureSpotMint(
  conn: Connection,
  operator: Keypair,
  spotId: string,
): Promise<PublicKey> {
  const state = await loadState();
  return ensureMint(conn, operator, state.spotMints[spotId], async rec => {
    const s = await loadState();
    s.spotMints[spotId] = rec;
    await saveState(s);
  });
}

/** Instructions to create the visitor's token account for a mint, if needed. */
async function ataCreateIfNeeded(
  conn: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
) {
  const ata = await getAssociatedTokenAddress(mint, owner);
  const info = await conn.getAccountInfo(ata);
  return {
    ata,
    instructions: info
      ? []
      : [createAssociatedTokenAccountInstruction(payer, ata, owner, mint)],
  };
}

/** Issue one stamp token for `spotId` to the visitor. Returns tx signature. */
export async function issueStamp(
  conn: Connection,
  operator: Keypair,
  spotId: string,
  visitor: PublicKey,
): Promise<string> {
  const mint = await ensureSpotMint(conn, operator, spotId);
  const { ata, instructions } = await ataCreateIfNeeded(conn, operator.publicKey, mint, visitor);
  return sendTx(
    conn,
    () => [...instructions, createMintToInstruction(mint, ata, operator.publicKey, 1)],
    [operator],
  );
}

/** Which spots the visitor holds stamps for (read-only). */
export async function countStamps(
  conn: Connection,
  visitor: PublicKey,
): Promise<{ spotId: string; held: boolean }[]> {
  const state = await loadState();
  const result: { spotId: string; held: boolean }[] = [];
  for (const [spotId, rec] of Object.entries(state.spotMints)) {
    let held = false;
    try {
      const ata = await getAssociatedTokenAddress(new PublicKey(rec.address), visitor);
      const account = await getAccount(conn, ata);
      held = account.amount > 0n;
    } catch {
      held = false;
    }
    result.push({ spotId, held });
  }
  return result;
}

/** Create (or reuse) the coupon mint. Returns the mint address. */
export async function ensureCouponMint(
  conn: Connection,
  operator: Keypair,
): Promise<PublicKey> {
  const state = await loadState();
  return ensureMint(conn, operator, state.couponMint, async rec => {
    const s = await loadState();
    s.couponMint = rec;
    await saveState(s);
  });
}

/** Issue one coupon to a visitor. Returns tx signature. */
export async function issueCoupon(
  conn: Connection,
  operator: Keypair,
  visitor: PublicKey,
): Promise<string> {
  const mint = await ensureCouponMint(conn, operator);
  const { ata, instructions } = await ataCreateIfNeeded(conn, operator.publicKey, mint, visitor);
  return sendTx(
    conn,
    () => [...instructions, createMintToInstruction(mint, ata, operator.publicKey, 1)],
    [operator],
  );
}

/**
 * Redeem a coupon: the coupon token is BURNED from the visitor's account,
 * so the same voucher can never be redeemed twice. Returns tx signature.
 */
export async function redeemCoupon(
  conn: Connection,
  visitor: Keypair,
): Promise<string> {
  const state = await loadState();
  if (!state.couponMint) throw new Error("coupon mint not created yet");
  const mint = new PublicKey(state.couponMint.address);
  const ata = await getAssociatedTokenAddress(mint, visitor.publicKey);
  const account = await getAccount(conn, ata);
  if (account.amount < 1n) throw new Error("no coupon to redeem");
  return sendTx(conn, () => [createBurnInstruction(ata, mint, visitor.publicKey, 1)], [visitor]);
}

export function explorerTx(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export function explorerAddress(addr: string): string {
  return `https://explorer.solana.com/address/${addr}?cluster=devnet`;
}

export { LAMPORTS_PER_SOL };
