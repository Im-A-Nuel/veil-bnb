import { execFile } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

export function validateGuestSource(value) {
  const source = String(value || '').trim()
  if (source.length < 80) throw new Error('guestSource is too short')
  if (source.length > 40_000) throw new Error('guestSource exceeds 40,000 characters')
  if (!source.includes('risc0_zkvm::guest::env')) throw new Error('guestSource must use the RISC Zero guest environment')
  if (!source.includes('env::commit_slice')) throw new Error('guestSource must commit the canonical journal')
  return source
}

export function toWslPath(path) {
  const match = String(path).match(/^([A-Za-z]):[\\/](.*)$/)
  if (!match) return String(path).replaceAll('\\', '/')
  return `/mnt/${match[1].toLowerCase()}/${match[2].replaceAll('\\', '/')}`
}

function run(file, args, options) {
  return new Promise((resolve, reject) => {
    execFile(file, args, options, (error, stdout, stderr) => {
      if (error) return reject(Object.assign(error, { stdout, stderr }))
      resolve({ stdout, stderr })
    })
  })
}

export async function compileGuest(value, env = process.env) {
  const source = validateGuestSource(value)
  const temp = await mkdtemp(join(tmpdir(), 'veil-guest-'))
  const sourceFile = join(temp, 'main.rs')
  await writeFile(sourceFile, source, 'utf8')
  const script = join(root, 'scripts', 'compile-guest.sh')

  const result = process.platform === 'win32'
    ? await run('wsl.exe', [
        '-d', env.WSL_DISTRO || 'Ubuntu-Ext', '--exec', 'bash',
        toWslPath(script), toWslPath(sourceFile),
      ], { cwd: root, timeout: 600_000, maxBuffer: 16 << 20 })
    : await run('bash', [script, sourceFile], { cwd: root, timeout: 600_000, maxBuffer: 16 << 20 })

  const line = result.stdout.split('\n').findLast((item) => item.includes('"imageId"'))
  if (!line) throw new Error(result.stderr || 'compiler did not return an ImageID')
  return JSON.parse(line)
}
