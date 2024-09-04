import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getMarkdownImageList, removeEmojis, ProgressBar, formateDate, isValidUrl, randUserAgent } from '../src/utils'
import { TestTools } from './helpers/TestTools'

let testTools: TestTools

describe('utils', () => {
  it('getMarkdownImageList', () => {
    const data =  getMarkdownImageList('# test\n![](http://x.jpg)\n![](./x2.jpg)\n![](http://x3.jpg)')
    expect(data).toMatchObject(['http://x.jpg', 'http://x3.jpg'])
  })
  it('getMarkdownImageList param null', () => {
    const data =  getMarkdownImageList(null as any)
    expect(data).toMatchObject([])
  })
  it('removeEmojis', () => {
    const data = removeEmojis('🤣t😅e😁s😂t😅')
    expect(data).toBe('test')
  })

  it('randUserAgent', () => {
    expect(randUserAgent({})).toBeTruthy()
    expect(randUserAgent({browser: 'safari'}).includes('Applebot')).toBeFalsy()
  })

  describe('isValidUrl',() => {
    it('should work', () => {
      expect(isValidUrl('http://localhost:51204/')).toBe(true)
      expect(isValidUrl('asdfsadf')).toBe(false)
    })
    it('set URL.canParse null',() => {
      const rawFn = URL.canParse
      ;(URL.canParse as any) = null
      expect(isValidUrl('http://localhost:51204/')).toBe(true)
      expect(isValidUrl('asdfsadf')).toBe(false)
      URL.canParse = rawFn
    })
  })

  describe('formateDate', () => {
    it('should work', () => {
      const date = formateDate('2023-10-07T06:12:28.000Z')
      expect(date).toBe('2023-10-07 14:12:28')
    })
    it('empty string', () => {
      const date = formateDate('')
      expect(date).toBe('')
    })
    it('Invalid Date', () => {
      const date = formateDate('abcde')
      expect(date).toBe('')
    })
    it('only Date', () => {
      const date = formateDate('2023-1-2')
      expect(date).toBe('2023-01-02 00:00:00')
    })
    it('only Time', () => {
      const date = formateDate('09:0:10')
      expect(date).toBe('')
    })
  })
})

describe('ProgressBar', () => {
  beforeEach(() => {
    testTools = new TestTools()
  })

  afterEach(() => {
    testTools.cleanup()
  })
  const updateItem = {
    path: "语雀知识库1",
    toc: {
      "type": "TITLE",
      "title": "语雀知识库1",
      "uuid": "6e3OzZQk2SHqApWA",
      "url": "",
      "prev_uuid": "",
      "sibling_uuid": "LhaQ85mI3D03Y4Zy",
      "child_uuid": "XZBg8vA4yir0loRp",
      "parent_uuid": "",
      "doc_id": 0,
      "level": 0,
      "id": 0,
      "open_window": 1,
      "visible": 1
    },
    pathIdList: ["6e3OzZQk2SHqApWA"],
    pathTitleList: ["语雀知识库1"]
  }
  const updateItem2 = {
    path: "语雀知识库2",
    toc: {
      "type": "TITLE",
      "title": "语雀知识库2",
      "uuid": "6e3OzZQk2SHqApWA",
      "url": "",
      "prev_uuid": "",
      "sibling_uuid": "LhaQ85mI3D03Y4Zy",
      "child_uuid": "XZBg8vA4yir0loRp",
      "parent_uuid": "",
      "doc_id": 0,
      "level": 0,
      "id": 0,
      "open_window": 1,
      "visible": 1
    },
    pathIdList: ["6e3OzZQk2SHqApWA"],
    pathTitleList: ["语雀知识库2"]
  }
  const updateItem3 = {
    path: "语雀知识库3",
    toc: {
      "type": "TITLE",
      "title": "语雀知识库3",
      "uuid": "6e3OzZQk2SHqApWA",
      "url": "",
      "prev_uuid": "",
      "sibling_uuid": "LhaQ85mI3D03Y4Zy",
      "child_uuid": "XZBg8vA4yir0loRp",
      "parent_uuid": "",
      "doc_id": 0,
      "level": 0,
      "id": 0,
      "open_window": 1,
      "visible": 1
    },
    pathIdList: ["6e3OzZQk2SHqApWA"],
    pathTitleList: ["语雀知识库3"]
  }
  it('should work', async () => {
    let pr = new ProgressBar(testTools.cwd, 3)
    await pr.init()

    await pr.updateProgress(updateItem, true)
    let prInfo = await pr.getProgress()
    // pr.updateProgress()
    expect(prInfo).toMatchObject([updateItem])
    expect(pr.curr).toBe(1)

    // 下载中断
    pr = new ProgressBar(testTools.cwd, 3)
    await pr.init()
    expect(pr.isDownloadInterrupted).toBe(true)
    expect(pr.curr).toBe(1)
    await pr.updateProgress(updateItem2, true)
    prInfo = await pr.getProgress()
    expect(prInfo).toMatchObject([updateItem, updateItem2])
    expect(pr.curr).toBe(2)

    await pr.updateProgress(updateItem3, true)
    prInfo = await pr.getProgress()
    expect(prInfo).toMatchObject([updateItem, updateItem2, updateItem3])
    expect(pr.curr).toBe(3)

    // 进度完成 再更新进度无效也不属于中断下载了
    pr = new ProgressBar(testTools.cwd, 3)
    await pr.init()
    expect(pr.isDownloadInterrupted).toBe(false)
    await pr.updateProgress(updateItem3, true)
    prInfo = await pr.getProgress()
    expect(prInfo).toMatchObject([updateItem, updateItem2, updateItem3])
    expect(pr.curr).toBe(3)
  })
})