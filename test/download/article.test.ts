import path from 'node:path'
import { readdirSync, readFileSync } from 'node:fs'
import { vi, afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestTools } from '../helpers/TestTools'
import { server } from '../mocks/server'
import { downloadArticle } from '../../src/download/article'

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
    const articleInfo = {
      savePath: testTools.cwd,
      saveFilePath: path.join(testTools.cwd, 'test.md'),
      host: 'https://www.yuque.com',
      ignoreImg: false,
      uuid: 'img_dir_uuid',
      articleTitle: 'downloadArticle Title',
      articleUrl: 'https://www.yuque.com/yuque/base1/one',
      itemUrl: 'one',
      bookId: 1111,
      imageServiceDomains: ['gxr404.com']
    }
    await downloadArticle({
      articleInfo,
      progressBar: {
        pause: vi.fn(),
        continue: vi.fn()
      } as any,
      options: {
        token: 'options token',
        key: 'options key'
      } as any
    })

    let doc1Data = readFileSync(articleInfo.saveFilePath).toString()
    doc1Data = doc1Data.replace(/\.\/img.*?-(\d{6})\./g, (match, random) => {
      return match.replace(random, '123456')
    })
    expect(doc1Data).toMatchSnapshot()
    const imgList = readdirSync(`${articleInfo.savePath}/img/${articleInfo.uuid}`)
    expect(readFileSync(`${articleInfo.savePath}/img/${articleInfo.uuid}/${imgList[0]}`).length).toBe(99892)
    expect(readFileSync(`${articleInfo.savePath}/img/${articleInfo.uuid}/${imgList[1]}`).length).toBe(81011)
  })

  it('sourcecode null should work', async () => {
    const articleInfo = {
      savePath: testTools.cwd,
      saveFilePath: path.join(testTools.cwd, 'test.md'),
      host: 'https://www.yuque.com',
      ignoreImg: false,
      uuid: 'img_dir_uuid',
      articleTitle: 'downloadArticle Title',
      articleUrl: 'https://www.yuque.com/yuque/base1/one',
      itemUrl: 'sourcecodeNull',
      bookId: 1111,
      imageServiceDomains: ['gxr404.com']
    }
    let isValidate = false
    try {
      await downloadArticle({
        articleInfo,
        progressBar: {
          pause: vi.fn(),
          continue: vi.fn()
        } as any,
        options: {
          token: 'options token',
          key: 'options key'
        } as any
      })
    } catch(e) {
      isValidate = true
      expect(e.message).toMatch( /download article Error: .*?, http status 200/g)
    }
    expect(isValidate).toBeTruthy()
  })


  it('board type', async () => {
    const articleInfo = {
      savePath: testTools.cwd,
      saveFilePath: path.join(testTools.cwd, 'test.md'),
      host: 'https://www.yuque.com',
      ignoreImg: false,
      uuid: 'img_dir_uuid',
      articleTitle: 'downloadArticle Title',
      articleUrl: 'https://www.yuque.com/yuque/base1/one',
      itemUrl: 'board',
      bookId: 1111,
      imageServiceDomains: ['gxr404.com']
    }
    let isValidate = false
    try {
      await downloadArticle({
        articleInfo,
        progressBar: {
          pause: vi.fn(),
          continue: vi.fn()
        } as any,
        options: {
          token: 'options token',
          key: 'options key'
        } as any
      })
    } catch (e) {
      expect(e.message).toBe('download article Error: 暂不支持“画板类型”的文档')
      isValidate = true
    }
    expect(isValidate).toBeTruthy()
  })

  it('table type', async () => {
    const articleInfo = {
      savePath: testTools.cwd,
      saveFilePath: path.join(testTools.cwd, 'test.md'),
      host: 'https://www.yuque.com',
      ignoreImg: false,
      uuid: 'img_dir_uuid',
      articleTitle: 'downloadArticle Title',
      articleUrl: 'https://www.yuque.com/yuque/base1/one',
      itemUrl: 'table',
      bookId: 1111,
      imageServiceDomains: ['gxr404.com']
    }
    let isValidate = false
    try {
      await downloadArticle({
        articleInfo,
        progressBar: {
          pause: vi.fn(),
          continue: vi.fn()
        } as any,
        options: {
          token: 'options token',
          key: 'options key'
        } as any
      })
    } catch (e) {
      expect(e.message).toBe('download article Error: 暂不支持“数据表类型”的文档')
      isValidate = true
    }
    expect(isValidate).toBeTruthy()
  })

  it('sheet type', async () => {
    const articleInfo = {
      savePath: testTools.cwd,
      saveFilePath: path.join(testTools.cwd, 'test.md'),
      host: 'https://www.yuque.com',
      ignoreImg: false,
      uuid: 'img_dir_uuid',
      articleTitle: 'downloadArticle Title',
      articleUrl: 'https://www.yuque.com/yuque/base1/one',
      itemUrl: 'sheet',
      bookId: 1111,
      imageServiceDomains: ['gxr404.com']
    }
    await downloadArticle({
      articleInfo,
      progressBar: {
        pause: vi.fn(),
        continue: vi.fn()
      } as any,
      options: {
        token: 'options token',
        key: 'options key'
      } as any
    })

    let doc1Data = readFileSync(articleInfo.saveFilePath).toString()
    doc1Data = doc1Data.replace(/\.\/img.*?-(\d{6})\./g, (match, random) => {
      return match.replace(random, '123456')
    })
    expect(doc1Data).toMatchSnapshot()
    const imgList = readdirSync(`${articleInfo.savePath}/img/${articleInfo.uuid}`)
    expect(readFileSync(`${articleInfo.savePath}/img/${articleInfo.uuid}/${imgList[0]}`).length).toBe(99892)
  })

  it('sheet type parse error', async () => {
    const articleInfo = {
      savePath: testTools.cwd,
      saveFilePath: path.join(testTools.cwd, 'test.md'),
      host: 'https://www.yuque.com',
      ignoreImg: false,
      uuid: 'img_dir_uuid',
      articleTitle: 'downloadArticle Title',
      articleUrl: 'https://www.yuque.com/yuque/base1/one',
      itemUrl: 'sheetError',
      bookId: 1111,
      imageServiceDomains: ['gxr404.com']
    }
    let isValidate = false
    try {
      await downloadArticle({
        articleInfo,
        progressBar: {
          pause: vi.fn(),
          continue: vi.fn()
        } as any,
        options: {
          token: 'options token',
          key: 'options key'
        } as any
      })
    } catch (e) {
      isValidate = true
      expect(e.message).toMatch(/download article Error: “表格类型”解析错误 SyntaxError: Unexpected token/)
    }
    expect(isValidate).toBeTruthy()
  })

  it('custom key token', async () => {
    const articleInfo = {
      savePath: testTools.cwd,
      saveFilePath: path.join(testTools.cwd, 'test.md'),
      host: 'https://www.yuque.com',
      ignoreImg: false,
      uuid: 'img_dir_uuid',
      articleTitle: 'downloadArticle Title',
      articleUrl: 'https://www.yuque.com/yuque/base1/one',
      itemUrl: 'tokenAndKey',
      bookId: 1111,
      imageServiceDomains: ['gxr404.com']
    }
    await downloadArticle({
      articleInfo,
      progressBar: {
        pause: vi.fn(),
        continue: vi.fn()
      } as any,
      options: {
        token: 'MyToken',
        key: 'MyKey'
      } as any
    })
    const docData = readFileSync(articleInfo.saveFilePath).toString()
    expect(docData).toMatchSnapshot()
  })

  it('uuid contains special characters', async () => {
    const articleInfo = {
      savePath: testTools.cwd,
      saveFilePath: path.join(testTools.cwd, 'test.md'),
      host: 'https://www.yuque.com',
      ignoreImg: false,
      uuid: 'img:dir/uuid',
      articleTitle: 'downloadArticle Title',
      articleUrl: 'https://www.yuque.com/api/docs/attachments',
      itemUrl: 'attachments',
      bookId: 1111,
      imageServiceDomains: ['gxr404.com']
    }
    await downloadArticle({
      articleInfo,
      progressBar: {
        pause: vi.fn(),
        continue: vi.fn()
      } as any,
      options: {
        token: 'MyToken',
        key: 'MyKey'
      } as any
    })
    let doc1Data = readFileSync(articleInfo.saveFilePath).toString()
    doc1Data = doc1Data.replace(/\.\/img.*?-(\d{6})\./g, (match, random) => {
      return match.replace(random, '123456')
    })
    expect(doc1Data).toMatchSnapshot()
  })
})
