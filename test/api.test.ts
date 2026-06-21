import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { TestTools } from './helpers/TestTools'
import { server } from './mocks/server'
import { getDocsMdData, getKnowledgeBaseInfo, genCommonOptions, getDocInfoFromUrl } from '../src/api'
import type { GetHeaderParams } from '../src/types'

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

    it('should verify public password protected book', async () => {
      const encodeAppData = (jsonData: unknown) => `decodeURIComponent("${encodeURIComponent(JSON.stringify(jsonData))}"));`
      const verifyPageData = {
        timestamp: Date.now(),
        matchCondition: {
          targetType: 'Book',
          needVerifyTargetId: 79462806
        },
        space: {
          host: 'https://www.yuque.com'
        },
        imageServiceDomains: []
      }
      const bookPageData = {
        book: {
          id: 79462806,
          slug: 'locked',
          toc: [],
          name: 'locked book',
          description: ''
        },
        space: {
          host: 'https://www.yuque.com'
        },
        imageServiceDomains: []
      }

      server.use(
        http.get('https://www.yuque.com/yuque/locked', ({ request }) => {
          if (request.headers.get('cookie')?.includes('verified_books=book-cookie')) {
            return new HttpResponse(encodeAppData(bookPageData), {
              status: 200,
              headers: {
                'Content-Type': 'text/html'
              }
            })
          }
          return new HttpResponse(encodeAppData(verifyPageData), {
            status: 200,
            headers: {
              'Content-Type': 'text/html',
              'Set-Cookie': 'yuque_ctoken=test-ctoken; Path=/;'
            }
          })
        }),
        http.put('https://www.yuque.com/api/books/79462806/verify', async ({ request }) => {
          expect(request.headers.get('x-csrf-token')).toBe('test-ctoken')
          expect(request.headers.get('cookie')).toContain('yuque_ctoken=test-ctoken')
          const body = await request.json() as { password?: string }
          expect(body.password).toBeTruthy()
          expect(body.password).not.toBe('pqz7')
          return HttpResponse.json({ data: true }, {
            headers: {
              'Set-Cookie': 'verified_books=book-cookie; Path=/;'
            }
          })
        })
      )

      const options: GetHeaderParams = {
        password: 'pqz7'
      }
      const data = await getKnowledgeBaseInfo('https://www.yuque.com/yuque/locked', options)

      expect(data.bookId).toBe(79462806)
      expect(data.bookSlug).toBe('locked')
      expect(options.key).toBe('verified_books')
      expect(options.token).toBe('book-cookie')
      expect(options.cookie).toContain('verified_books=book-cookie')
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
    const cookieData = genCommonOptions({
      cookie: 'a=b; c=d'
    })
    expect(cookieData.headers?.cookie).toBe('a=b; c=d')
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
