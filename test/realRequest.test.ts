import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TestTools } from './helpers/TestTools'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cliPath = path.join(__dirname, '../bin/index.js')

let testTools: TestTools

// const mdImgReg = /!\[.*?\]\(https*.*?\)/g
// const problematicList = []

describe.skip('real request', () => {

  beforeEach(() => {
    testTools = new TestTools()
  })

  afterEach(() => {
    // testTools.cleanup()
  })

  it('should work', async () => {
    const url = ''
    const { stdout, exitCode, stderr } = await testTools.fork(cliPath, [
      url,
      '-d', '.'
    ])
    expect(exitCode).toBe(0)
    expect(stdout).toContain('√ 已完成')
    console.log(stderr)
    // const imgDir = path.join(testTools.cwd, '语雀公益计划/语雀·大学生公益计划/img')
    // const indexMdPath = path.join(testTools.cwd, '语雀公益计划/语雀·大学生公益计划/index.md')
    // expect(fs.existsSync(imgDir)).toBeTruthy()
    // const data = fs.readFileSync(indexMdPath).toString()
    // expect(data.match(mdImgReg)).toBeFalsy()
    // expect(stderr).toBeFalsy()
  })

})
