import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TestTools } from './helpers/TestTools'
import { KNOWLEDGE_BASE_URL } from './helpers/constant'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cliPath = path.join(__dirname, '../bin/index.js')

let testTools: TestTools

const mdImgReg = /!\[.*?\]\(https*.*?\)/g

describe('yuque-dl CLI', () => {

  beforeEach(() => {
    testTools = new TestTools()
  })

  afterEach(() => {
    testTools.cleanup()
  })

  it('should work', async () => {
    const { stdout, exitCode, stderr } = await testTools.fork(cliPath, [
      KNOWLEDGE_BASE_URL.NORMAL,
      '-d', '.'
    ])
    expect(exitCode).toBe(0)
    expect(stdout).toContain('√ 已完成')
    const imgDir = path.join(testTools.cwd, '语雀公益计划/语雀·大学生公益计划/img')
    const indexMdPath = path.join(testTools.cwd, '语雀公益计划/语雀·大学生公益计划/index.md')
    expect(fs.existsSync(imgDir)).toBeTruthy()
    const data = fs.readFileSync(indexMdPath).toString()
    expect(data.match(mdImgReg)).toBeFalsy()
    expect(stderr).toBeFalsy()
  })

  it('ignore img should work ', async () => {
    const { stdout, exitCode } = await testTools.fork(cliPath, [
      KNOWLEDGE_BASE_URL.NORMAL,
      '-d', '.',
      '-i'
    ])
    expect(exitCode).toBe(0)
    expect(stdout).toContain('√ 已完成')
    const imgDir = path.join(testTools.cwd, '语雀公益计划/语雀·大学生公益计划/img')
    expect(fs.existsSync(imgDir)).toBeFalsy()
    const indexMdPath = path.join(testTools.cwd, '语雀公益计划/语雀·大学生公益计划/index.md')
    const data = fs.readFileSync(indexMdPath).toString()
    expect(data).toMatchSnapshot()
  })
})
