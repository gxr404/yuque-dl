import path from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { TestTools } from './helpers/TestTools'
import { server } from './mocks/server'
import { downloadNodeFromUrl, main } from '../src/index'
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
    await main('https://www.yuque.com/yuque/base1', {
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

  it('download node subtree should work', async () => {
    server.use(
      http.get('https://www.yuque.com/yuque/node-test', () => {
        const jsonData = {
          space: {
            host: 'https://www.yuque.com'
          },
          book: {
            id: 41966892,
            slug: 'node-test',
            name: '节点下载测试',
            description: 'node test desc',
            toc: [
              {
                type: 'TITLE',
                title: 'Root',
                uuid: '001',
                child_uuid: '002',
                parent_uuid: ''
              },
              {
                type: 'DOC',
                title: 'Target',
                uuid: '002',
                url: 'one',
                child_uuid: '003',
                parent_uuid: '001'
              },
              {
                type: 'DOC',
                title: 'Child',
                uuid: '003',
                url: 'two',
                child_uuid: '',
                parent_uuid: '002'
              },
              {
                type: 'DOC',
                title: 'Sibling',
                uuid: '004',
                url: 'two',
                child_uuid: '',
                parent_uuid: '001'
              }
            ]
          },
          imageServiceDomains: [
            'gxr404.com'
          ]
        }
        const resData = encodeURIComponent(JSON.stringify(jsonData))
        return new HttpResponse(`decodeURIComponent("${resData}"));`, {
          status: 200,
          headers: {
            'Content-Type': 'text/html'
          }
        })
      })
    )

    await downloadNodeFromUrl(
      'https://www.yuque.com/yuque/node-test',
      'https://www.yuque.com/yuque/node-test/one',
      {
        distDir: testTools.cwd,
        ignoreImg: true,
        toc: false
      } as any
    )

    const bookPath = path.join(testTools.cwd, '节点下载测试')
    expect(readFileSync(path.join(bookPath, 'Root/Target/index.md')).toString()).toMatchSnapshot()
    expect(readFileSync(path.join(bookPath, 'Root/Target/Child.md')).toString()).toMatchSnapshot()
    expect(readFileSync(path.join(bookPath, 'index.md')).toString()).toMatchSnapshot()
    expect(() => readFileSync(path.join(bookPath, 'Root/Sibling.md'))).toThrow()
  })

  it('download node subtree should fail when node url is not in toc', async () => {
    await expect(downloadNodeFromUrl(
      'https://www.yuque.com/yuque/base1',
      'https://www.yuque.com/yuque/base1/not-found',
      {
        distDir: testTools.cwd,
        ignoreImg: true,
        toc: false
      } as any
    )).rejects.toThrow('No found node in toc list: not-found')
  })
})
