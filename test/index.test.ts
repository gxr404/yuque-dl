import path from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestTools } from './helpers/TestTools'
import { server } from './mocks/server'
import { KNOWLEDGE_BASE_URL } from './helpers/constant'
import { main } from '../src/index'
import { readdirSync, readFileSync } from 'node:fs'


let testTools: TestTools

describe('main', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })
  afterAll(() => server.close())

  beforeEach(() => {
    testTools = new TestTools()
  })

  afterEach(() => {
    testTools.cleanup()
    server.resetHandlers()
  })
  it('should work', async () => {
    await main(KNOWLEDGE_BASE_URL.BASE1, {
      distDir: testTools.cwd,
      ignoreImg: false,
      toc: false
    })
    const summaryPath = path.join(testTools.cwd, '知识库TEST1/index.md')
    expect(readFileSync(summaryPath).toString()).toMatchSnapshot()
    const doc2 = path.join(testTools.cwd, '知识库TEST1/Title2/文档2.md')
    expect(readFileSync(doc2).toString()).toMatchSnapshot()
    const progressJSON = path.join(testTools.cwd, '知识库TEST1/progress.json')
    expect(readFileSync(progressJSON).toString()).toMatchSnapshot()
    let doc1Data = readFileSync(path.join(testTools.cwd, '知识库TEST1/Title1/文档1.md')).toString()
    doc1Data = doc1Data.replace(/\.\/img.*?-(\d{6})\./g, (match, random) => {
      return match.replace(random, '123456')
    })
    expect(doc1Data).toMatchSnapshot()
    const imgDir = path.join(testTools.cwd, '知识库TEST1/Title1/img/002')
    const imgList = readdirSync(imgDir)
    const img1 = path.join(testTools.cwd, `知识库TEST1/Title1/img/002/${imgList[0]}`)
    expect(readFileSync(img1).length).toBe(99892)
    const img2 = path.join(testTools.cwd, `知识库TEST1/Title1/img/002/${imgList[1]}`)
    expect(readFileSync(img2).length).toBe(81011)
  })
})
