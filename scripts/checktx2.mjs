import { Connection, clusterApiUrl } from "@solana/web3.js";
const conn = new Connection(clusterApiUrl("devnet"), "confirmed");
for (const sig of ["23a24LN2R8XK2KunE8UcP5UscownaVZ4QzMhoJxF1iY4QzjkY7pWQ3mq8Hh5Ks2rfHfyreE2XBwLW1vai9eQVDgS"]) {
  const st = await conn.getSignatureStatus(sig, { searchTransactionHistory: true });
  console.log(sig.slice(0, 8), JSON.stringify(st.value?.confirmationStatus), "err:", JSON.stringify(st.value?.err));
}
