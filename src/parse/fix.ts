import { removeEmojis } from '../utils'
import { getAst, getInLineCodeList, toMd } from './ast'

// 现发现 latex svg格式可以正常下载 正常显示，非svg 不能 直接那search的文案替换掉
// ![](https://cdn.nlark.com/yuque/__latex/a6cc75c5bd5731c6e361bbcaf18766e7.svg#card=math&code=999&id=JGAwA)
// "https://g.yuque.com/gr/latex?options['where'] 是否是数组，#card=math&code=options['where'] 是否是数组，"
export function fixLatex(mdData: string) {
  const latexReg =  /!\[(.*?)\]\((http.*?latex.*?)\)/gm
  const list = mdData.match(latexReg)
  let fixMaData = mdData
  const rawMaData = mdData
  try {
    list?.forEach(latexMd => {
      latexReg.lastIndex = 0
      const url = latexReg.exec(latexMd)?.[2] ?? ''
      const {pathname, search} = new URL(url)
      const isSvg = pathname.endsWith('.svg')
      // 非svg结尾的 latex链接  直接显示code内容
      if (!isSvg && search) {
        const data = decodeURIComponent(search)
        fixMaData = fixMaData.replace(latexMd, data.slice(1))
      }
    })
  } catch {
    return rawMaData
  }

  return fixMaData
}

// 根据html接口返回的图片修复 md接口返回的图片 url
export function fixMarkdownImage(imgList: string[], mdData: string, htmlData: string) {
  if (!htmlData) return mdData
  const htmlDataImgReg = /<card.*?name="image".*?value="data:(.*?)">(.*?)<\/card>/gm
  const htmlImgDataList: string[] = []
  let regExec
  let init = true
  while(init || Boolean(regExec)) {
    init = false
    regExec = htmlDataImgReg.exec(htmlData)
    if (regExec?.[1]) {
      try {
        const strData = decodeURIComponent(regExec[1])
        const cardData = JSON.parse(strData)
        htmlImgDataList.push(cardData?.src || '')
      } catch {
        htmlImgDataList.push('')
      }
    }
  }
  const replaceURLCountMap = new Map()
  imgList.forEach((imgUrl) => {
    const {origin, pathname} = new URL(imgUrl)
    const matchURL = `${origin}${pathname}`

    const targetURL = htmlImgDataList.find((item, index) => {
      const reg = new RegExp(`${matchURL}.*?`)
      const isFind = reg.test(item)
      if (isFind) htmlImgDataList.splice(index, 1)
      return isFind
    })
    // console.log(imgUrl, ' -> ',targetURL)
    if (targetURL) {
      const reg = new RegExp(imgUrl, 'g')
      const count = replaceURLCountMap.get(imgUrl) || 0
      let temp = 0
      mdData = mdData.replace(reg, (match) => {
        let res = match
        if (temp === count) {
          res = targetURL
        }
        temp = temp + 1
        return res
      })
      replaceURLCountMap.set(imgUrl, count + 1)
    }
  })
  return mdData
}


export function fixPath(dirPath: string) {
  if (!dirPath) return ''
  const dirNameReg = /[\\/:*?"<>|\n\r]/g
  return removeEmojis(dirPath.replace(dirNameReg, '_').replace(/\s/g, ''))
}


function containsHtmlTags(str: string) {
  const regex = /<([a-z][\s\S]*?)>/i
  return regex.test(str)
}

function containsMarkdownLabel(str: string) {
  const regex = /(~~|\*\*|_)/g
  return regex.test(str)
}

// fix markdown 行内代码
// case1: mdData `**123**` 且 html data  `<strong><span class="ne-text">123213</span></strong>`
//   转化为 <code>**123**</code>

/**
 * fix markdown 行内代码
 */
export function fixInlineCode(mdData: string, htmlData: string) {
  let fixMdData = mdData
  const ast = getAst(mdData)
  const inlineCodeList = getInLineCodeList(ast)
  if (inlineCodeList.length === 0) return mdData

  inlineCodeList.forEach((item) => {
    const inlineCodeNode = item.node
    const isContainsHtmlTags = containsHtmlTags(inlineCodeNode.value)
    const isContainsMarkdownLabel = containsMarkdownLabel(inlineCodeNode.value)

    // 不含html标签 和 不含markdown --> 不转为 <code> 原样输出
    if (!isContainsHtmlTags && !isContainsMarkdownLabel) return

    // htmlData中含对应转义html --> 不转为 <code> 原样输出
    const tarnsfromCode = inlineCodeNode.value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
    // 同时存在转义和未转移的情况... 比较少见 暂时不考虑。。
    // 仅存在转义的情况
    if (htmlData.includes(tarnsfromCode)) {
      return
    }

    //  TODO: 这里直接更改了ast 还需考虑
    inlineCodeNode.type = 'html' as any
    inlineCodeNode.value = `<code>${inlineCodeNode.value}</code>`
  })
  fixMdData = toMd(ast)
  return fixMdData
}
