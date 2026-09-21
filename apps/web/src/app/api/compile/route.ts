// POST /api/compile  { guestSource: string }  → { imageId } | { error }
// Compile service (no-install): server (yg punya toolchain) compile guest → ImageID.
// ⚠️ PoC: belum di-sandbox penuh (compile kode user = risiko RCE). Lihat backend/README.md.
import { execFile } from 'node:child_process'
import { writeFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  let guestSource: string
  try {
    const body = await request.json()
    guestSource = body?.guestSource
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 })
  }
  if (!guestSource || typeof guestSource !== 'string') {
    return Response.json({ error: 'guestSource (string) required' }, { status: 400 })
  }

  // repo root = parent of the Next.js app cwd (frontend/)
  const repoRoot = join(process.cwd(), '..')
  const script = join(repoRoot, 'backend', 'compile-guest.sh')

  try {
    const dir = await mkdtemp(join(tmpdir(), 'veil-guest-'))
    const srcFile = join(dir, 'main.rs')
    await writeFile(srcFile, guestSource, 'utf8')

    const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      execFile('bash', [script, srcFile], { cwd: repoRoot, timeout: 290_000, maxBuffer: 1 << 24 },
        (err, stdout, stderr) => (err ? reject(Object.assign(err, { stdout, stderr })) : resolve({ stdout, stderr })))
    })

    // ambil baris JSON {"imageId": ...}
    const line = stdout.split('\n').reverse().find((l) => l.includes('imageId'))
    if (!line) return Response.json({ error: 'ImageID tidak terbaca dari compiler' }, { status: 500 })
    const parsed = JSON.parse(line)
    if (!parsed.imageId) return Response.json({ error: parsed.error || 'compile gagal' }, { status: 500 })
    return Response.json({ imageId: parsed.imageId })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'compile error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
