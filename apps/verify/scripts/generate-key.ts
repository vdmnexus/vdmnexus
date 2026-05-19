import bs58 from "bs58";
import nacl from "tweetnacl";

const kp = nacl.sign.keyPair();
const secret = bs58.encode(kp.secretKey);
const pub = bs58.encode(kp.publicKey);

console.log("Generated a fresh Ed25519 keypair (tweetnacl format).");
console.log();
console.log("NEXUS_VERIFY_OPERATOR_SECRET_KEY:");
console.log(secret);
console.log();
console.log("Public key (will be served at /api/verify/operator-key):");
console.log(pub);
console.log();
console.log("Put the secret in Vercel env for the verify project (and in");
console.log("apps/verify/.env.local for local dev). Never commit it.");
