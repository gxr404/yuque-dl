import path from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadDocsFromUrls } from '../src/index'
import { logger } from '../src/utils'
import type { ICliOptions } from '../src/types'
import { TestTools } from './helpers/TestTools'
import { server } from './mocks/server'
import singleDocData from './mocks/data/singleDoc.json'
import singleDocMdData from './mocks/data/singleDocMd.json'

const host = 'https://www.yuque.com'
const encodeAppData = (data: unknown) => new HttpResponse(
  `decodeURIComponent("${encodeURIComponent(JSON.stringify(data))}"));`
)

function mockProtectedDoc(slug: string, id: number, cookieKey: string) {
  const url = `${host}/yuque/testbook/${slug}`
  const token = `${slug}-cookie`
  const cookie = `${cookieKey}=${token};`
  const verificationCookies: Array<string | null> = []
  const contentCookies: Array<string | null> = []
  server.use(
    http.get(url, ({ request }) => {
      if (request.headers.get('cookie') === cookie) {
        return encodeAppData({
          ...singleDocData,
          doc: { ...singleDocData.doc, id, slug, title: slug }
        })
      }
      return encodeAppData({
        timestamp: Date.now(),
        matchCondition: { targetType: 'Doc', needVerifyTargetId: id }
      })
    }),
    http.put(`${host}/api/docs/${id}/verify`, async ({ request }) => {
      verificationCookies.push(request.headers.get('cookie'))
      const body = await request.json() as { password: string }
      if (!body.password) return new HttpResponse(null, { status: 400 })
      return HttpResponse.json({ data: true }, {
        // Keep MSW's cookie jar from authenticating requests on behalf of the downloader.
        headers: { 'Set-Cookie': `${cookie} Path=/; Max-Age=0;` }
      })
    }),
    http.get(`${host}/api/docs/${slug}`, ({ request }) => {
      contentCookies.push(request.headers.get('cookie'))
      if (request.headers.get('cookie') !== cookie) {
        return new HttpResponse(null, { status: 403 })
      }
      return HttpResponse.json(singleDocMdData)
    })
  )
  return { url, cookie, verificationCookies, contentCookies }
}

describe('password protected document downloads', () => {
  let testTools: TestTools
  let options: ICliOptions

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  beforeEach(() => {
    testTools = new TestTools()
    options = {
      distDir: testTools.cwd,
      password: 'test-password',
      ignoreImg: true,
      ignoreAttachments: true,
      toc: false,
      incremental: false,
      convertMarkdownVideoLinks: false,
      hideFooter: true
    }
  })
  afterEach(() => {
    testTools.cleanup()
    server.resetHandlers()
    vi.restoreAllMocks()
  })

  it.each(['verified_docs', 'verified_books'])('downloads a document using %s', async (cookieKey) => {
    const doc = mockProtectedDoc('locked-doc', 123456, cookieKey)
    await downloadDocsFromUrls([doc.url], options)

    expect(doc.verificationCookies).toHaveLength(1)
    expect(doc.contentCookies).toEqual([doc.cookie, doc.cookie])
    expect(readFileSync(path.join(testTools.cwd, 'locked-doc.md'), 'utf8'))
      .toContain(singleDocMdData.data.sourcecode)
  })

  it('verifies each document without changing the caller credentials', async () => {
    options.key = '_yuque_session'
    options.token = 'session-cookie'
    const originalOptions = { ...options }
    const first = mockProtectedDoc('first', 123456, 'verified_docs')
    const second = mockProtectedDoc('second', 123457, 'verified_books')

    await downloadDocsFromUrls([first.url, second.url], options)

    for (const doc of [first, second]) {
      expect(doc.verificationCookies).toEqual(['_yuque_session=session-cookie;'])
      expect(doc.contentCookies).toEqual([doc.cookie, doc.cookie])
    }
    expect(existsSync(path.join(testTools.cwd, 'first.md'))).toBe(true)
    expect(existsSync(path.join(testTools.cwd, 'second.md'))).toBe(true)
    expect(options).toEqual(originalOptions)
  })

  it('reports failed verification and continues with the next document', async () => {
    const failed = mockProtectedDoc('failed', 123456, 'verified_docs')
    const next = mockProtectedDoc('next', 123457, 'verified_docs')
    server.use(http.put(`${host}/api/docs/123456/verify`, () => HttpResponse.json({ data: false })))
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined)

    await downloadDocsFromUrls([failed.url, next.url], options)

    expect(error).toHaveBeenCalledWith('———— Password validation failed')
    expect(failed.contentCookies).toEqual([])
    expect(existsSync(path.join(testTools.cwd, 'failed.md'))).toBe(false)
    expect(existsSync(path.join(testTools.cwd, 'next.md'))).toBe(true)
  })

  it('still downloads public documents without a password', async () => {
    delete options.password
    await downloadDocsFromUrls([`${host}/yuque/testbook/testdoc`], options)
    expect(readFileSync(path.join(testTools.cwd, '测试文档.md'), 'utf8'))
      .toContain(singleDocMdData.data.sourcecode)
  })
})
