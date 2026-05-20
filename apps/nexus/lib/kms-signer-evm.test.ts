/**
 * Tests for kms-signer-evm.
 *
 * Run via: pnpm --filter nexus test:kms-evm
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spkiToEvmAddress, derToRS } from "./kms-signer-evm";

// Standard 23-byte SPKI prefix for an secp256k1 (SECG P256K1) public
// key, ending with the 0x04 uncompressed-point marker. Mirrors what
// AWS KMS returns from GetPublicKey for an ECC_SECG_P256K1 key.
const SECP256K1_SPKI_PREFIX = Uint8Array.from([
  0x30, 0x56, 0x30, 0x10, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
  0x01, 0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x0a, 0x03, 0x42, 0x00, 0x04,
]);

function buildSpki(xHex: string, yHex: string): Uint8Array {
  const xy = hexToBytes(xHex + yHex);
  assert.equal(xy.length, 64, "X || Y must be 64 bytes");
  const out = new Uint8Array(SECP256K1_SPKI_PREFIX.length + xy.length);
  out.set(SECP256K1_SPKI_PREFIX, 0);
  out.set(xy, SECP256K1_SPKI_PREFIX.length);
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const stripped = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (stripped.length % 2 !== 0) throw new Error("odd-length hex");
  const out = new Uint8Array(stripped.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(stripped.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

// Known secp256k1 test vector: privkey = 1 → public key is the
// generator G. Ethereum address derived from G is a very well-known
// constant used in many test suites.
//   G.x = 79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798
//   G.y = 483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8
//   addr = 0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf
test("spkiToEvmAddress: derives ETH address for privkey=1 (G)", () => {
  const spki = buildSpki(
    "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
    "483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8"
  );
  const { address, publicKeyXY } = spkiToEvmAddress(spki);
  assert.equal(address, "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf");
  assert.equal(publicKeyXY.length, 64);
});

// Second vector: privkey = 2 → pubkey 2·G.
//   x = c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5
//   y = 1ae168fea63dc339a3c58419466ceaeef7f632653266d0e1236431a950cfe52a
//   addr = 0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF
test("spkiToEvmAddress: derives ETH address for privkey=2 (2·G)", () => {
  const spki = buildSpki(
    "c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5",
    "1ae168fea63dc339a3c58419466ceaeef7f632653266d0e1236431a950cfe52a"
  );
  const { address } = spkiToEvmAddress(spki);
  assert.equal(address, "0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF");
});

test("spkiToEvmAddress: rejects wrong SPKI length", () => {
  assert.throws(() => spkiToEvmAddress(new Uint8Array(64)), /SPKI length/);
});

test("spkiToEvmAddress: rejects missing 0x04 uncompressed marker", () => {
  const bad = buildSpki(
    "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
    "483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8"
  );
  bad[23] = 0x03; // compressed-point marker — KMS should never emit this
  assert.throws(() => spkiToEvmAddress(bad), /uncompressed/);
});

test("derToRS: parses a vanilla 70-byte DER ECDSA signature", () => {
  // Hand-built DER signature: r = 0x01..., s = 0x02...
  // 30 44 02 20 <32 r bytes> 02 20 <32 s bytes>
  const rBytes = Uint8Array.from(
    Array.from({ length: 32 }, (_, i) => (i === 31 ? 0x01 : 0x00))
  );
  const sBytes = Uint8Array.from(
    Array.from({ length: 32 }, (_, i) => (i === 31 ? 0x02 : 0x00))
  );
  const der = new Uint8Array(70);
  der[0] = 0x30;
  der[1] = 0x44;
  der[2] = 0x02;
  der[3] = 0x20;
  der.set(rBytes, 4);
  der[36] = 0x02;
  der[37] = 0x20;
  der.set(sBytes, 38);

  const { r, s } = derToRS(der);
  assert.equal(r, 1n);
  assert.equal(s, 2n);
});

test("derToRS: parses DER with leading-zero r (high bit set)", () => {
  // r is 33 bytes: 00 followed by a value with high bit set.
  // 30 45 02 21 00 <32 r bytes, top bit set> 02 20 <32 s bytes>
  const der = Uint8Array.from([
    0x30, 0x45,
    0x02, 0x21, 0x00,
    0x80, ...new Uint8Array(31), // r = 0x80…00
    0x02, 0x20,
    ...new Uint8Array(31), 0x05, // s = 0x00…05
  ]);
  const { r, s } = derToRS(der);
  assert.equal(
    r,
    0x8000000000000000000000000000000000000000000000000000000000000000n
  );
  assert.equal(s, 5n);
});
