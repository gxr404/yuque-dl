import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getMarkdownImageList, removeEmojis, ProgressBar } from '../src/utils'
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