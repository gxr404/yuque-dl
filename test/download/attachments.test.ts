import path from 'node:path'
import { readFileSync } from 'node:fs'
import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { TestTools } from '../helpers/TestTools'
import { downloadAttachments } from '../../src/download/attachments'
import { server } from '../mocks/server'

let testTools: TestTools

describe('downloadAttachments', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })
  afterAll(() => server.close())

  beforeEach(() => {
    testTools = new TestTools()
  })

  afterEach(() => {
    server.resetHandlers()
    testTools.cleanup()
  })

  it('should work', async () => {
    const mdData = '# test \n\n[test.pdf](https://www.yuque.com/attachments/test.pdf)\n'
    const params = {
      mdData,
      savePath: testTools.cwd,
      attachmentsDir: './attachments/123456789',
      articleTitle: 'test'
    }
    const resData = await downloadAttachments(params)
    expect(readFileSync(path.join(testTools.cwd, params.attachmentsDir, 'test.pdf')).length).toBe(46219)
    expect(resData.mdData).toMatchSnapshot()
  })

  it('attachments download error', async () => {
    const mdData = '# test \n\n[error.pdf](https://www.yuque.com/attachments/error.pdf)\n'
    const params = {
      mdData,
      savePath: testTools.cwd,
      attachmentsDir: './attachments/123456789',
      articleTitle: 'test'
    }
    const requestPromise =  downloadAttachments(params)
    await expect(requestPromise).rejects.toThrow(/Request failed with status code 404/g)
  })
})
