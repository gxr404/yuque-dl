import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestTools } from './helpers/TestTools'
import { server } from './mocks/server'
import { getDocsMdData, getKnowledgeBaseInfo, genCommonOptions, getDocInfoFromUrl } from '../src/api'

let testTools: TestTools

describe('api', () => {
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

  describe('getKnowledgeBaseInfo', () => {
    it('should work', async () => {
      const data = await getKnowledgeBaseInfo('https://www.yuque.com/yuque/welfare', {
        token: 'token',
        key: 'key'
      })
      expect(data.bookId).toBe(41966892)
      expect(data.bookSlug).toBe('welfare')
      expect(data.tocList?.length).toBe(2)
      expect(data.bookName).toBe('🤗 语雀公益计划')
      expect(data.bookDesc).toBe('')
      expect(data.imageServiceDomains?.length).toBe(70)
    })

    it('404 should throw Error', async () => {
      const requestPromise = getKnowledgeBaseInfo('http://localhost/404', {})
      await expect(requestPromise).rejects.toThrow('Request failed with status code 404')
    })
  })

  describe('getDocsMdData', () => {
    it('should work', async () => {
      const params = {
        articleUrl: 'edu',
        bookId: 41966892,
      }
      const data = await getDocsMdData(params)
      expect(data.apiUrl).toBe('https://www.yuque.com/api/docs/edu?book_id=41966892&merge_dynamic_data=false&mode=markdown')
      expect(data.httpStatus).toBe(200)
      expect(data.response?.data.sourcecode).toBeTruthy()
    })
  })

  it('genCommonOptions should work', async () => {
    const data = genCommonOptions({
      key: 'test_key',
      token: 'test_token'
    })
    expect(data.headers?.cookie).toMatchObject('test_key=test_token;')
    const redirectObj = {} as any
    if (data.beforeRedirect) {
      data.beforeRedirect(redirectObj, null as any)
    }
    expect(redirectObj?.headers?.cookie).toMatchObject('test_key=test_token;')
  })

  describe('getDocInfoFromUrl', () => {
    it('should work', async () => {
      const data = await getDocInfoFromUrl('https://www.yuque.com/yuque/testbook/testdoc', {
        token: 'token',
        key: 'key'
      })
      expect(data.docId).toBe(123456)
      expect(data.docSlug).toBe('testdoc')
      expect(data.docTitle).toBe('测试文档')
      expect(data.bookId).toBe(41966892)
      expect(data.bookSlug).toBe('testbook')
      expect(data.bookName).toBe('测试知识库')
      expect(data.host).toBe('https://www.yuque.com')
      expect(data.imageServiceDomains?.length).toBe(2)
    })

    it('should return empty object when response has no doc field', async () => {
      const data = await getDocInfoFromUrl('https://www.yuque.com/yuque/base1', {})
      expect(data).toEqual({})
    })

    it('should throw error on 404', async () => {
      const requestPromise = getDocInfoFromUrl('https://www.yuque.com/yuque/testbook/notfound', {})
      await expect(requestPromise).rejects.toThrow('Request failed with status code 404')
    })

    it('should throw error on network error', async () => {
      const requestPromise = getDocInfoFromUrl('http://localhost/404', {})
      await expect(requestPromise).rejects.toThrow()
    })
  })
})
