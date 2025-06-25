import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const tmpDir = path.join(__dirname, '../temp')

export function createTmpDirectory(rootDir: string) {
  const id = randomUUID()
  const dirname = path.join(rootDir, id)
  fs.mkdirSync(dirname, {
    recursive: true
  })

  return dirname
}

interface ITestToolsForkRes {
  stdout: string,
  stderr: string,
  exitCode: number | null
}

export class TestTools {
  cwd: string
  private readonly shouldCleanup: boolean

  constructor(cwd?: string) {
    if (cwd) {
      this.cwd = cwd
      this.shouldCleanup = false
    } else {
      this.cwd = createTmpDirectory(tmpDir)
      this.shouldCleanup = true
    }
  }

  cleanup() {
    if (!this.shouldCleanup) {
      return
    }

    try {
      this.rmSync(this.cwd, {
        recursive: true
      })

      const otherDirs = fs.readdirSync(tmpDir)

      if (!otherDirs.length) {
        fs.rmdirSync(tmpDir)
      }
    } catch (err) {
      console.log(err)
      // ignore
    }
  }

  mkdirSync(dir: string, options?: Parameters<typeof fs.mkdirSync>[1]) {
    return fs.mkdirSync(path.resolve(this.cwd, dir), options)
  }

  // writeFileSync(file: string, content: string) {
  //   return fs.writeFileSync(path.resolve(this.cwd, file), content)
  // }

  // readFileSync(file: string, options: Parameters<typeof fs.readFileSync>[1]) {
  //   return fs.readFileSync(path.resolve(this.cwd, file), options)
  // }

  rmSync(target: string, options?: Parameters<typeof fs.rmSync>[1]) {
    return fs.rmSync(path.resolve(this.cwd, target), options)
  }

  // exec(command: string) {
  //   return execSync(command, {
  //     cwd: this.cwd,
  //     stdio: 'pipe',
  //     encoding: 'utf-8'
  //   })
  // }

  fork(script: string, args: string[] = [], options: Parameters<typeof spawn>[2] = {}) {
    return new Promise<ITestToolsForkRes>((resolve, reject) => {
      const finalOptions = {
        cwd: this.cwd,
        stdio: [
          null,
          null,
          null
        ],
        ...options
      }
      const nodeArgs = [
        '--no-warnings',
        // '--loader',
        // pathToFileURL(path.resolve(__dirname, '..', 'node_modules', 'tsm', 'loader.mjs')).toString()
      ]
      const child = spawn(process.execPath, [
        ...nodeArgs,
        script,
        ...args
      ], finalOptions)
      let stdout = ''
      let stderr = ''
      let exitCode

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString()
      })
      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString()
      })
      child.on('close', (code) => {
        exitCode = code
        resolve({
          stdout,
          stderr,
          exitCode
        })
      })
      child.on('error', reject)
    })
  }
}
