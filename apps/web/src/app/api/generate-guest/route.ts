// POST /api/generate-guest  { description: string }  → { code } | { error }
// AI guest-gen via `claude -p` (Claude Code CLI headless) — bikin draf guest dari deskripsi kontrak.
// ⚠️ Draf AI WAJIB di-review manusia sebelum dipakai (AI bisa salah tebak invariant).
import { execFile } from 'node:child_process'
import { writeFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const runtime = 'nodejs'
export const maxDuration = 180

// ambil kode Rust bersih dari output AI (buang markdown fence / teks pembuka)
function extractCode(out: string): string {
  const fence = out.match(/```(?:rust)?\s*([\s\S]*?)```/)
  if (fence) return fence[1].trim()
  const i = out.indexOf('use risc0_zkvm')
  if (i >= 0) return out.slice(i).trim()
  return out.trim()
}

export async function POST(request: Request) {
  let description: string
  try {
    description = (await request.json())?.description
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 })
  }
  if (!description || typeof description !== 'string') {
    return Response.json({ error: 'description (string) required' }, { status: 400 })
  }

  const repoRoot = join(process.cwd(), '..')
  const script = join(repoRoot, 'backend', 'generate-guest.sh')
  try {
    const dir = await mkdtemp(join(tmpdir(), 'veil-desc-'))
    const descFile = join(dir, 'desc.txt')
    await writeFile(descFile, description, 'utf8')

    const { stdout } = await new Promise<{ stdout: string }>((resolve, reject) => {
      execFile('bash', [script, descFile], { cwd: repoRoot, timeout: 170_000, maxBuffer: 1 << 24 },
        (err, stdout, stderr) => (err ? reject(Object.assign(err, { stdout, stderr })) : resolve({ stdout })))
    })

    const code = extractCode(stdout)
    if (!code || !code.includes('env::commit')) {
      return Response.json({ error: 'AI tidak menghasilkan guest yang valid, coba lagi / perjelas deskripsi' }, { status: 500 })
    }
    return Response.json({ code })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'generate error' }, { status: 500 })
  }
}
