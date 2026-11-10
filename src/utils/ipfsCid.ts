/**
 * Standard IPFS CID & Multiformats Encoder
 * Conforms to RFC 4648 Base32 (lowercase, unpadded) and Bitcoin Base58btc
 * Produces authentic IPFS CIDv1 (raw/dag-pb, 'bafkrei...') and CIDv0 ('Qm...')
 */

const BS58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

/**
 * Encodes byte array into lowercase Base32 without padding (RFC 4648)
 */
export function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += B32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/**
 * Encodes byte array into Base58btc (used by IPFS CIDv0)
 */
export function encodeBase58(bytes: Uint8Array): string {
  const digits: number[] = [0];

  for (let i = 0; i < bytes.length; i++) {
    for (let j = 0; j < digits.length; j++) {
      digits[j] <<= 8;
    }
    digits[0] += bytes[i];

    let carry = 0;
    for (let j = 0; j < digits.length; j++) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  // Count leading zeroes
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    digits.push(0);
  }

  return digits.reverse().map((d) => BS58_ALPHABET[d]).join("");
}

/**
 * Converts a SHA-256 digest (32 bytes) into an authentic IPFS CIDv1 Raw
 * Format: 'b' + base32(0x01 [cidv1] + 0x55 [raw] + 0x12 [sha2-256] + 0x20 [32 bytes] + 32-byte digest)
 * Result is 59 characters starting with 'bafkrei...'
 */
export function createIpfsCidV1Raw(sha256Bytes: Uint8Array): string {
  const prefix = new Uint8Array([0x01, 0x55, 0x12, 0x20]);
  const combined = new Uint8Array(prefix.length + sha256Bytes.length);
  combined.set(prefix, 0);
  combined.set(sha256Bytes, prefix.length);
  return "b" + encodeBase32(combined);
}

/**
 * Converts a SHA-256 digest (32 bytes) into an authentic IPFS CIDv0
 * Format: base58(0x12 [sha2-256] + 0x20 [32 bytes] + 32-byte digest)
 * Result is 46 characters starting with 'Qm...'
 */
export function createIpfsCidV0(sha256Bytes: Uint8Array): string {
  const prefix = new Uint8Array([0x12, 0x20]);
  const combined = new Uint8Array(prefix.length + sha256Bytes.length);
  combined.set(prefix, 0);
  combined.set(sha256Bytes, prefix.length);
  return encodeBase58(combined);
}

/**
 * Computes authentic SHA-256, IPFS CIDv1, and IPFS CIDv0 for any data in browser or node
 */
export async function computeIpfsCids(data: Uint8Array | ArrayBuffer | string): Promise<{
  cidV1: string;
  cidV0: string;
  checksum: string;
  sha256Bytes: Uint8Array;
}> {
  let bytes: Uint8Array;
  if (typeof data === "string") {
    bytes = new TextEncoder().encode(data);
  } else if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  } else {
    bytes = data;
  }

  let hashBuffer: ArrayBuffer;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    hashBuffer = await crypto.subtle.digest("SHA-256", copy.buffer);
  } else {
    // Node.js fallback
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = await import("crypto");
    const h = nodeCrypto.createHash("sha256").update(bytes).digest();
    hashBuffer = h.buffer.slice(h.byteOffset, h.byteOffset + h.byteLength);
  }

  const sha256Bytes = new Uint8Array(hashBuffer);
  const checksum = "0x" + Array.from(sha256Bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const cidV1 = createIpfsCidV1Raw(sha256Bytes);
  const cidV0 = createIpfsCidV0(sha256Bytes);

  return {
    cidV1,
    cidV0,
    checksum,
    sha256Bytes
  };
}
