import { describe, expect, it } from 'vitest'
import { fixLatex, fixMarkdownImage, fixPath } from '../../src/parse/fix'
import { getMarkdownImageList } from '../../src/utils'


describe('fixLatex', () => {
  it('should work', () => {
    const searchStr = "options['where'] 是否是数组，"
    const hashStr = "card=math&code=options['where'] 是否是数组，"
    const latexMd = `![](https://g.yuque.com/gr/latex?${encodeURIComponent(searchStr)}#${encodeURIComponent(hashStr)})`
    expect(fixLatex(latexMd)).toBe(searchStr)
  })
  it('svg suffix does not require fix', () => {
    const latexMd = `![](https://cdn.nlark.com/yuque/__latex/a6cc75c5bd5731c6e361bbcaf18766e7.svg#card=math&code=999&id=JGAwA)`
    expect(fixLatex(latexMd)).toBe(latexMd)
  })
})

describe('fixMarkdownImage', () => {
  it('should work', () => {
    const mdData = `
    # Test
    ![](http://www.abc.com/3.jpg)
    ![](./test.jpg)
    ![](http://www.abc.com/1.jpg)
    ![](http://www.abc.com/2.jpg)
    ![](http://www.abc.com/1.jpg)
    ![](http://www.abc.com/1.jpg)
    ![](http://www.abc.com/3.jpg)
    `
    const imgInfo = {
      "src": "http://www.abc.com/1.jpg?a=1&b=c#11",
      "alt":"image-20210325085833220"
    }
    const imgInfo2 = {
      "src":  "http://www.abc.com/1.jpg?a=2&b=c#22",
      "alt":"image-20210325085833220"
    }
    const imgInfo3 = {
      "src":  "http://www.abc.com/3.jpg?a=3&b=c#33",
      "alt":"image-20210325085833220"
    }
    const imgInfoStr = encodeURIComponent(JSON.stringify(imgInfo))
    const imgInfoStr2 = encodeURIComponent(JSON.stringify(imgInfo2))
    const imgInfoStr3 = encodeURIComponent(JSON.stringify(imgInfo3))
    const htmlData = `
    <p>Test</p>
    <card type="inline" name="image" value="data:${imgInfoStr}"></card>
    <card type="inline" name="image" value="data:${imgInfoStr2}"></card>
    <card type="inline" name="image" value="data:${imgInfoStr3}"></card>
    `
    const imgList = getMarkdownImageList(mdData)
    const data = fixMarkdownImage(imgList, mdData, htmlData)
    // console.log(data)
    expect(data).toMatchSnapshot()

  })
})

describe('fixPath', () => {
  it('should work', () => {
    expect(fixPath('/xxa.12~*#)$$M/13')).toBe('_xxa.12~_#)$$M_13')
  })
})
