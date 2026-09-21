// Reveal (versi minimal, frontend-only): enkripsi exploit ke public key creator.
// Cuma private key creator yang bisa dekripsi. Pakai TweetNaCl (X25519 box) +
// pola "sealed box" (ephemeral sender keypair → pengirim anonim).
import nacl from 'tweetnacl'

const enc = (s: string) => new TextEncoder().encode(s)
const dec = (b: Uint8Array) => new TextDecoder().decode(b)

function toB64(b: Uint8Array): string {
  let s = ''
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i])
  return btoa(s)
}
function fromB64(s: string): Uint8Array {
  const bin = atob(s.trim())
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Creator bikin keypair (public dibagi, secret disimpan rahasia). */
export function generateKeypair(): { publicKey: string; secretKey: string } {
  const kp = nacl.box.keyPair()
  return { publicKey: toB64(kp.publicKey), secretKey: toB64(kp.secretKey) }
}

/** Hunter enkripsi pesan ke public key creator → satu string base64 (eph|nonce|cipher). */
export function encryptForCreator(message: string, creatorPubB64: string): string {
  const creatorPub = fromB64(creatorPubB64)
  if (creatorPub.length !== 32) throw new Error('public key creator tidak valid')
  const eph = nacl.box.keyPair()
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const cipher = nacl.box(enc(message), nonce, creatorPub, eph.secretKey)
  const packed = new Uint8Array(eph.publicKey.length + nonce.length + cipher.length)
  packed.set(eph.publicKey, 0)
  packed.set(nonce, eph.publicKey.length)
  packed.set(cipher, eph.publicKey.length + nonce.length)
  return toB64(packed)
}

/** Creator dekripsi pakai secret key-nya. */
export function decryptAsCreator(packedB64: string, secretB64: string): string {
  const packed = fromB64(packedB64)
  const secret = fromB64(secretB64)
  if (secret.length !== 32) throw new Error('private key tidak valid')
  const ephPub = packed.slice(0, 32)
  const nonce = packed.slice(32, 32 + nacl.box.nonceLength)
  const cipher = packed.slice(32 + nacl.box.nonceLength)
  const msg = nacl.box.open(cipher, nonce, ephPub, secret)
  if (!msg) throw new Error('dekripsi gagal — kunci salah / ciphertext rusak')
  return dec(msg)
}

// ============================================================================
// LEVEL 1.5 — verifikasi sidik jari (commit-reveal binding)
//
// Guest meng-commit sha256(a_le16 || b_le16 || salt) ke journal. Creator dapat
// reveal {a,b,salt} → hitung ulang sha256 → cocokkan dgn sidik jari di journal.
// Cocok = reveal ASLI yg memenangkan bounty; beda = reveal palsu.
// ============================================================================

const toHex = (b: Uint8Array) =>
  Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
const hexToBytes = (h: string) => {
  const s = h.replace(/^0x/, '')
  const out = new Uint8Array(s.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16)
  return out
}
/** u128 → 16 byte little-endian (samakan dgn a.to_le_bytes() di guest). */
function u128ToLE16(n: bigint): Uint8Array {
  const out = new Uint8Array(16)
  let v = n
  const mask = BigInt(255)
  const eight = BigInt(8)
  for (let i = 0; i < 16; i++) {
    out[i] = Number(v & mask)
    v >>= eight
  }
  return out
}

export interface Reveal {
  a: string
  b: string
  salt: string
}

/** Parse string hasil dekripsi (isi reveal.json) → {a,b,salt}. */
export function parseReveal(text: string): Reveal {
  const o = JSON.parse(text)
  if (o.a == null || o.b == null || !o.salt) throw new Error('format reveal tidak valid (butuh a, b, salt)')
  return { a: String(o.a), b: String(o.b), salt: String(o.salt) }
}

/** Hitung sidik jari sha256(a_le16 || b_le16 || salt) → hex. (= guest) */
export async function fingerprintFromReveal(r: Reveal): Promise<string> {
  const data = new Uint8Array(64)
  data.set(u128ToLE16(BigInt(r.a)), 0)
  data.set(u128ToLE16(BigInt(r.b)), 16)
  const salt = hexToBytes(r.salt)
  if (salt.length !== 32) throw new Error('salt harus 32 byte')
  data.set(salt, 32)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toHex(new Uint8Array(digest))
}

/**
 * Ekstrak sidik jari dari journal RISC Zero.
 * Journal = commit(victim_id [u8;32]) lalu commit(fingerprint [u8;32]).
 * risc0 serialize tiap u8 jadi 1 word LE (4 byte) → 64 logical byte = 256 byte.
 * logical[i] = packed[i*4]; fingerprint = logical[32..64].
 */
export function fingerprintFromJournal(journalHex: string): string {
  const packed = hexToBytes(journalHex)
  if (packed.length < 256) throw new Error('journal terlalu pendek (bukan format Level 1.5)')
  const fp = new Uint8Array(32)
  for (let i = 0; i < 32; i++) fp[i] = packed[(32 + i) * 4]
  return toHex(fp)
}

/**
 * Verifikasi penuh: dekripsi ciphertext → parse → hitung sidik jari →
 * cocokkan dgn sidik jari yg terikat di proof (hex 32 byte).
 */
export async function verifyReveal(
  packedB64: string,
  secretB64: string,
  expectedFingerprintHex: string
): Promise<{ ok: boolean; reveal: Reveal; computed: string; expected: string }> {
  const text = decryptAsCreator(packedB64, secretB64)
  const reveal = parseReveal(text)
  const computed = await fingerprintFromReveal(reveal)
  const expected = expectedFingerprintHex.replace(/^0x/, '').toLowerCase()
  return { ok: computed === expected, reveal, computed, expected }
}
