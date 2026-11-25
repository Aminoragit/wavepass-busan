import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";
const conn = new Connection(clusterApiUrl("devnet"), "confirmed");
const bal = await conn.getBalance(new PublicKey("3zm6XhK9oTauL6wUJvhkKK1e4zEpzS7EUPjoU2DSpNTD"));
console.log("operator balance (SOL):", bal / LAMPORTS_PER_SOL);
