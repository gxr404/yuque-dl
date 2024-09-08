import path from 'node:path'
import { readdirSync, readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestTools } from '../helpers/TestTools'
import { server } from '../mocks/server'
import { downloadArticleList } from '../../src/download/list'
import { ProgressBar } from '../../src/utils'


let testTools: TestTools

describe('downloadArticle', () => {
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
    const tocList = [
      {
        type: 'TITLE',
        title: 'Title1',
        uuid: '001',
        child_uuid: '002',
        parent_uuid: ''
      },
      {
        type: 'DOC',
        title: '文档1',
        uuid: '002',
        url: 'one',
        child_uuid: '',
        parent_uuid: '001'
      },
      {
        type: 'TITLE',
        title: 'Title2',
        uuid: '003',
        child_uuid: '004',
        parent_uuid: ''
      },
      {
        type: 'DOC',
        title: '文档2',
        uuid: '004',
        url: 'two',
        child_uuid: '',
        parent_uuid: '003'
      }
    ]
    const uuidMap = new Map()
    const pr = new ProgressBar(testTools.cwd, tocList.length)
    await pr.init()

    await downloadArticleList({
      articleUrlPrefix: 'https://www.yuque.com/yuque/base1',
      total: tocList.length,
      uuidMap,
      tocList: tocList as any,
      bookPath: testTools.cwd,
      bookId: 1111,
      host: 'https://www.yuque.com',
      imageServiceDomains: ['gxr404.com'],
      progressBar: pr,
      options: {
        ignoreImg: false
      } as any,
    })
    expect(pr.curr).toBe(tocList.length)
    let doc1Data = readFileSync(path.join(testTools.cwd, tocList[0].title, `${tocList[1].title}.md`)).toString()
    doc1Data = doc1Data.replace(/\.\/img.*?-(\d{6})\./g, (match, random) => {
      return match.replace(random, '123456')
    })
    expect(doc1Data).toMatchSnapshot()
    const imgPath = path.join(testTools.cwd, tocList[0].title, 'img', tocList[1].uuid)
    const imgList = readdirSync(imgPath)
    expect(readFileSync(path.join(imgPath, imgList[0])).length).toBe(99892)
    expect(readFileSync(path.join(imgPath, imgList[1])).length).toBe(81011)

    const doc2Data = readFileSync(path.join(testTools.cwd, tocList[2].title, `${tocList[3].title}.md`)).toString()
    expect(doc2Data).toMatchSnapshot()
  })
  it('the title is also a doc', async () => {
    const tocList = [
      {
        type: 'DOC',
        title: 'Title1_文档',
        uuid: '001',
        url: 'one',
        child_uuid: '002',
        parent_uuid: ''
      },
      {
        type: 'DOC',
        title: '文档1',
        uuid: '002',
        url: 'two',
        child_uuid: '',
        parent_uuid: '001'
      }
    ]
    const uuidMap = new Map()
    const pr = new ProgressBar(testTools.cwd, tocList.length)
    await pr.init()

    await downloadArticleList({
      articleUrlPrefix: 'https://www.yuque.com/yuque/base1',
      total: tocList.length,
      uuidMap,
      tocList: tocList as any,
      bookPath: testTools.cwd,
      bookId: 1111,
      host: 'https://www.yuque.com',
      imageServiceDomains: ['gxr404.com'],
      progressBar: pr,
      options: {
        ignoreImg: false
      } as any,
    })
    expect(pr.curr).toBe(tocList.length)

    let doc1Data = readFileSync(path.join(testTools.cwd, tocList[0].title, 'index.md')).toString()
    doc1Data = doc1Data.replace(/\.\/img.*?-(\d{6})\./g, (match, random) => {
      return match.replace(random, '123456')
    })
    expect(doc1Data).toMatchSnapshot()
    const imgPath = path.join(testTools.cwd, tocList[0].title, 'img', tocList[0].uuid)
    const imgList = readdirSync(imgPath)
    expect(readFileSync(path.join(imgPath, imgList[0])).length).toBe(99892)
    expect(readFileSync(path.join(imgPath, imgList[1])).length).toBe(81011)

    const doc2Data = readFileSync(path.join(testTools.cwd, tocList[0].title, `${tocList[1].title}.md`)).toString()
    expect(doc2Data).toMatchSnapshot()
  })

})
