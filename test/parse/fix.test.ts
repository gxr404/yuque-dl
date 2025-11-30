import { describe, expect, it } from 'vitest'
import { fixLatex, fixMarkdownImage, fixPath, fixInlineCode } from '../../src/parse/fix'
import { getMarkdownImageList } from '../../src/utils'


describe('fixLatex', () => {
  it('should work', () => {
    const searchStr = 'options[\'where\'] 是否是数组，'
    const hashStr = 'card=math&code=options[\'where\'] 是否是数组，'
    const latexMd = `![](https://g.yuque.com/gr/latex?${encodeURIComponent(searchStr)}#${encodeURIComponent(hashStr)})`
    expect(fixLatex(latexMd)).toBe(searchStr)
  })
  it('svg suffix does not require fix', () => {
    const latexMd = '![](https://cdn.nlark.com/yuque/__latex/a6cc75c5bd5731c6e361bbcaf18766e7.svg#card=math&code=999&id=JGAwA)'
    expect(fixLatex(latexMd)).toBe(latexMd)
  })
})

describe('fixMarkdownImage', () => {
  it('should work', () => {
    const mdData = `
    # Test
    ![](http://www.abc.com/3.jpg#123)
    ![](./test.jpg)
    ![](http://www.abc.com/1.jpg#123)
    ![](http://www.abc.com/2.jpg)
    ![](http://www.abc.com/1.jpg#456)
    ![](http://www.abc.com/1.jpg)
    ![](http://www.abc.com/3.jpg)
    `
    const imgInfo = {
      'src': 'http://www.abc.com/1.jpg?a=1&b=c#11',
      'alt':'image-20210325085833220'
    }
    const imgInfo2 = {
      'src':  'http://www.abc.com/1.jpg?a=2&b=c#22',
      'alt':'image-20210325085833220'
    }
    const imgInfo3 = {
      'src':  'http://www.abc.com/3.jpg?a=3&b=c#33',
      'alt':'image-20210325085833220'
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

describe('fixInlineCode', () => {

// 正常的行内代码: `123213`
// 带color的行内代码: `<font style="color:#FBDE28;">123213</font>`
// 带color的行内代码: `**<font style="color:#DF2A3F;">123213</font>**`
// 加粗的行内代码: `**123213**`
// 加粗的行内代码:`_123213_`
// 删除线的行内代码: `~~123213~~`
// 普通的删除线: ~~sdfsdaf~~
// 行内代码和普通文本混合:`~~123213~~`~~asdfsdfsdf~~
// 实际带有行内代码带有html标签: `<font style="color:#FBDE28;">123</font>`
// 实际带有行内代码带有html标签2: `**<font style="color:#FBDE28;">123</font>**`

  it('should work', () => {
    // 行内代码 无markdown无html
    const mdData = '`123213`'
    const htmlData = '<code class="ne-code"><span class="ne-text">123213</span></code>'
    expect(fixInlineCode(mdData, htmlData)).toBe('`123213`\n')
  })

  it('inlinecode contains markdown', () => {
    const mdData = '`**123213**`'
    const htmlData = '<code class="ne-code"><strong><span class="ne-text">123213</span></strong></code>'
    expect(fixInlineCode(mdData, htmlData)).toBe('<code>**123213**</code>\n')
  })

  it('inlinecode contains markdown and outputs HTML data as it is', () => {
    const mdData = '`**123213**`'
    const htmlData = '<code class="ne-code"><span class="ne-text">**123213**</span></code>'
    expect(fixInlineCode(mdData, htmlData)).toBe('`**123213**`\n')
  })

  it('inlinecode contains html', () => {
    const mdData = '`<font style="color:#FBDE28;">123</font>`'
    const htmlData = '<code class="ne-code"><span class="ne-text" style="color: #FBDE28">123</span></code>'
    expect(fixInlineCode(mdData, htmlData)).toBe('<code><font style="color:#FBDE28;">123</font></code>\n')
  })

  it('inlinecode contains html and HTML data escape', () => {
    const mdData = '`<font style="color:#FBDE28;">123</font>`'
    const htmlData = '<code class="ne-code"><span class="ne-text">&lt;font style=&quot;color:#FBDE28;&quot;&gt;123&lt;/font&gt;</span></code>'
    expect(fixInlineCode(mdData, htmlData)).toBe('`<font style="color:#FBDE28;">123</font>`\n')
  })

  it('inlinecode contains (html + markdown) ', () => {
    const mdData = '`**<font style="color:#DF2A3F;">123</font>**`'
    const htmlData = '<code class="ne-code"><strong><span class="ne-text" style="color: #DF2A3F">123</span></strong></code>'
    expect(fixInlineCode(mdData, htmlData)).toBe('<code>**<font style="color:#DF2A3F;">123</font>**</code>\n')
  })

  it('inlinecode contains (html + markdown) and html data escape', () => {
    const mdData = '`**<font style="color:#FBDE28;">123</font>**`'
    const htmlData = '<code class="ne-code"><span class="ne-text">**&lt;font style=&quot;color:#FBDE28;&quot;&gt;123&lt;/font&gt;**</span></code>'
    expect(fixInlineCode(mdData, htmlData)).toBe('`**<font style="color:#FBDE28;">123</font>**`\n')
  })


  it('inlinecode contains (html + markdown) - 2', () => {
    const mdData = '`**123213**<em>2222</em>`'
    const htmlData = '<code class="ne-code"><strong><span class="ne-text">123213</span></strong></code>'
    expect(fixInlineCode(mdData, htmlData)).toBe('<code>**123213**<em>2222</em></code>\n')
  })

  it('inlinecode contains (html + markdown) and html data escape - 2', () => {
    const mdData = '`~~_**<u><font style="color:#DF2A3F;">123213</font></u>**_~~`'
    const htmlData = '<code class="ne-code"><span class="ne-text">~~_**&lt;u&gt;&lt;font style=&quot;color:#DF2A3F;&quot;&gt;123213&lt;/font&gt;&lt;/u&gt;**_~~</span></code>'

    expect(fixInlineCode(mdData, htmlData)).toBe('`~~_**<u><font style="color:#DF2A3F;">123213</font></u>**_~~`\n')
  })

  it('inlinecode contains (html + markdown) and html data escape - 3', () => {
    const mdData = '`~~_**<u><font style="color:#DF2A3F;">123213</font></u>**_~~`'
    const htmlData = '<code class="ne-code"><em><strong><span class="ne-text" style="color: #DF2A3F; text-decoration: underline line-through">123213</span></strong></em></code>'
    expect(fixInlineCode(mdData, htmlData)).toBe('<code>~~_**<u><font style="color:#DF2A3F;">123213</font></u>**_~~</code>\n')
  })

  // it('inlinecode contains (html + markdown) and html data escape - 4', () => {
  //   const mdData = '`~~_**<u><font style="color:#DF2A3F;">123213</font></u>**_~~`\n`~~_**<u><font style="color:#DF2A3F;">123213</font></u>**_~~`\n`~~_**<u><font style="color:#DF2A3F;">123213</font></u>**_~~`'
  //   const htmlData =
  //     `<code class="ne-code"><em><strong><span class="ne-text" style="color: #DF2A3F; text-decoration: underline line-through">123213</span></strong></em></code>
  //     <code class="ne-code"><span class="ne-text">&lt;font style=&quot;color:#FBDE28;&quot;&gt;123&lt;/font&gt;</span><strong><span class="ne-text" style="color: #ED740C">sdaf</span></strong></code>
  //     <code class="ne-code"><em><strong><span class="ne-text" style="color: #DF2A3F; text-decoration: underline line-through">123213</span></strong></em></code>`

  //   expect(fixInlineCode(mdData, htmlData)).toBe('<code>~~_**<u><font style="color:#DF2A3F;">123213</font></u>**_~~</code>\n')
  // })

})
