// GET /api/prover → download prebuilt prover (binary host) buat hunter tanpa toolchain.
// Catatan: tetap butuh Docker (Groth16). Linux x86_64.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const runtime = 'nodejs'

export async function GET() {
  const path = join(process.cwd(), '..', 'zk', 'target', 'release', 'host')
  try {
    const bin = await readFile(path)
    return new Response(bin, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="veil-prover"',
      },
    })
  } catch {
    return new Response('prover belum di-build (jalankan: cd zk && cargo build --release)', { status: 404 })
  }
}
