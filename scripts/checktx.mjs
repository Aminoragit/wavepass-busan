import { Connection, clusterApiUrl } from "@solana/web3.js";
const conn = new Connection(clusterApiUrl("devnet"), "confirmed");
const sig = "F5PrEbZ5dJ8qbRXqbTWBsMWJbeWyLQM9AtCz62iE4VG1WFqeqirYzb2pmJaurZcHMBfQ9fF25ZCGLiMhhVqdSQv";
const st = await conn.getSignatureStatus(sig, { searchTransactionHistory: true });
console.log(JSON.stringify(st.value));
