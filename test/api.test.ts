import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestTools } from './helpers/TestTools'
import { server } from './mocks/server'
import {
  getDocsMdData,
  getKnowledgeBaseInfo,
  genCommonOptions,
  getDocInfoFromUrl,
  verifyPublicPassword
} from '../src/api'

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

  describe('verifyPublicPassword', () => {
    const docUrl = 'https://password-tests.yuque.com/yuque/testbook/locked-doc'
    const verifyUrl = 'https://password-tests.yuque.com/api/docs/123456/verify'

    function mockVerification(cookies: string[]) {
      server.use(
        http.get(docUrl, () => {
          const data = {
            timestamp: Date.now(),
            matchCondition: { targetType: 'Doc', needVerifyTargetId: 123456 }
          }
          return new HttpResponse(`decodeURIComponent("${encodeURIComponent(JSON.stringify(data))}"));`)
        }),
        http.put(verifyUrl, () => {
          const headers = new Headers()
          cookies.forEach(cookie => headers.append('Set-Cookie', cookie))
          return HttpResponse.json({ data: true }, { headers })
        })
      )
    }

    it.each(['verified_docs', 'verified_books'])('accepts %s for a protected document', async (key) => {
      mockVerification(['lang=zh-cn; Path=/;', `${key}=doc-cookie; Path=/;`])
      await expect(verifyPublicPassword(docUrl, 'test-password', {}))
        .resolves.toEqual({ key, token: 'doc-cookie' })
    })

    it('prefers the document verification cookie when both are returned', async () => {
      mockVerification(['verified_books=book-cookie; Path=/;', 'verified_docs=doc-cookie; Path=/;'])
      await expect(verifyPublicPassword(docUrl, 'test-password', {}))
        .resolves.toEqual({ key: 'verified_docs', token: 'doc-cookie' })
    })

    it.each([
      { name: 'missing', cookies: [] },
      { name: 'unrelated', cookies: ['lang=zh-cn; Path=/;'] },
      { name: 'empty', cookies: ['verified_docs=; Path=/; Max-Age=0'] }
    ])('rejects $name verification cookies', async ({ cookies }) => {
      mockVerification(cookies)
      await expect(verifyPublicPassword(docUrl, 'test-password', {})).resolves.toBe(false)
    })

    it('should verify public password protected book', async () => {
      type Data = {key: string, token: string}
      const data = await verifyPublicPassword('https://www.yuque.com/yuque/locked', 'pqz7', {}) as Data
      expect(data.key).toBe('verified_books')
      expect(data.token).toBe('book-cookie')
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
