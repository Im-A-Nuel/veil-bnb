// GET /api/guest → download proyek prover lengkap (guest + host) sebagai tar.gz.
// Hunter: extract, then run the host with the secret and public bounty binding.
import { execFile } from 'node:child_process'
import { join } from 'node:path'

export const runtime = 'nodejs'

export async function GET() {
  const repoRoot = join(process.cwd(), '..', '..')
  try {
    const buf = await new Promise<Buffer>((resolve, reject) => {
      execFile(
        'tar',
        ['-czf', '-', '-C', repoRoot, '--exclude=zk/target', '--exclude=zk/proof.json',
         '--exclude=zk/seal.bin', '--exclude=zk/journal.hex', 'zk'],
        { encoding: 'buffer', maxBuffer: 1 << 26 },
        (err, stdout) => (err ? reject(err) : resolve(stdout as Buffer)),
      )
    })
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': 'attachment; filename="veil-prover-project.tar.gz"',
      },
    })
  } catch (e) {
    return new Response('Could not package the prover project: ' + (e instanceof Error ? e.message : ''), { status: 500 })
  }
}
