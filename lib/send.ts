import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

/**
 * Resilient transaction sender for slow networks.
 *
 * The default sendAndConfirm in web3.js gives up when the blockhash expires,
 * even though the transaction often lands seconds later. Here we send the
 * raw transaction and then POLL its status; only if it truly never landed
 * do we rebuild with a fresh blockhash and retry. Instruction builders must
 * be deterministic across attempts (same account addresses) so a retry can
 * never double-apply an effect that already landed.
 */
export async function sendTx(
  conn: Connection,
  buildInstructions: () => Promise<TransactionInstruction[]> | TransactionInstruction[],
  signers: Keypair[],
  attempts = 3,
): Promise<string> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
    const tx = new Transaction({ feePayer: signers[0].publicKey, blockhash, lastValidBlockHeight });
    tx.add(...(await buildInstructions()));
    tx.sign(...signers);
    const sig = await conn.sendRawTransaction(tx.serialize(), { maxRetries: 5 });
    const landed = await pollStatus(conn, sig, 90_000);
    if (landed === "ok") return sig;
    if (landed === "error") {
      // Surface the on-chain failure instead of blindly retrying.
      const st = await conn.getSignatureStatus(sig, { searchTransactionHistory: true });
      throw new Error(`transaction failed on-chain: ${JSON.stringify(st.value?.err)} (sig ${sig})`);
    }
    lastError = new Error(`transaction ${sig} did not land within the polling window`);
  }
  throw lastError instanceof Error ? lastError : new Error("transaction did not land");
}

async function pollStatus(
  conn: Connection,
  sig: string,
  timeoutMs: number,
): Promise<"ok" | "error" | "timeout"> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const st = await conn.getSignatureStatus(sig, { searchTransactionHistory: true });
      if (st.value?.err) return "error";
      if (st.value && (st.value.confirmationStatus === "confirmed" || st.value.confirmationStatus === "finalized")) {
        return "ok";
      }
    } catch {
      /* transient RPC error; keep polling */
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  return "timeout";
}
