import { writeFile } from 'node:fs/promises'
import { stdout, env } from 'node:process'
import ora, { type Ora } from 'ora'
import mdImg from 'pull-md-img'
import mdToc from 'markdown-toc'

import { getDocsMdData } from '../api'
import { ARTICLE_CONTENT_TYPE, ARTICLE_CONTENT_MAP } from '../constant'
import { fixLatex, fixMarkdownImage } from '../parse/fix'
import { parseSheet } from '../parse/sheet'
import { captureImageURL } from '../crypto'
import { getMarkdownImageList } from '../utils'

import type { DownloadArticleParams, IHandleMdDataOptions } from '../types'
import { downloadAttachments } from './attachments'


/** 下载单篇文章 */
export async function downloadArticle(params: DownloadArticleParams): Promise<boolean> {
  const { articleInfo, progressBar, options } = params
  const { token, key } = options
  const {
    bookId,
    itemUrl,
    savePath,
    saveFilePath,
    uuid,
    articleUrl,
    articleTitle,
    ignoreImg,
    host,
    imageServiceDomains
  } = articleInfo
  const reqParams = {
    articleUrl: itemUrl,
    bookId,
    token,
    host,
    key,
  }
  const { httpStatus, apiUrl, response } = await getDocsMdData(reqParams)

  const contentType = response?.data?.type?.toLocaleLowerCase() as ARTICLE_CONTENT_TYPE
  let mdData = ''

  /** 表格类型 */
  if (contentType === ARTICLE_CONTENT_TYPE.SHEET) {
    const {response} = await getDocsMdData(reqParams, false)
    try {
      const rawContent = response?.data?.content
      const content = rawContent ? JSON.parse(rawContent) : {}
      const sheetData = content?.sheet
      mdData = sheetData ? parseSheet(sheetData) : ''
      // 表格类型默认忽略图片
      // ignoreImg = true
      // TODO 表格类型中插入图表 vessels字段
    } catch(e) {
      const notSupportType = ARTICLE_CONTENT_MAP.get(contentType)
      throw new Error(`download article Error: “${notSupportType}”解析错误 ${e}`)
    }
  } else if ([
      ARTICLE_CONTENT_TYPE.BOARD,
      ARTICLE_CONTENT_TYPE.TABLE
    ].includes(contentType)) {
    // 暂时不支持的文档类型
    const notSupportType = ARTICLE_CONTENT_MAP.get(contentType)
    throw new Error(`download article Error: 暂不支持“${notSupportType}”的文档`)
  } else if (typeof response?.data?.sourcecode !== 'string') {
    throw new Error(`download article Error: ${apiUrl}, http status ${httpStatus}`)
  } else {
    mdData = response.data.sourcecode
    // fix latex
    mdData = fixLatex(mdData)
  }
  const imgList = getMarkdownImageList(mdData)
  // fix md image url
  // TODO: 待定 需不需要区分文档类型呢？
  if (imgList.length && !ignoreImg) {
    // 没图片的话不需要修复图片url 且 没有忽略图片下载
    // 获取浏览器直接访问的源数据，取出对应的html数据 对 md数据中的图片url修复
    const rawData = await getDocsMdData(reqParams, false)
    const htmlData = rawData.response?.data?.content ?? ''
    // console.log('old', mdData)
    mdData = fixMarkdownImage(imgList, mdData, htmlData)
    // console.log('new', mdData)
  }

  const handleMdDataOptions = {
    toc: options.toc,
    articleTitle,
    articleUrl
  }

  const attachmentsErrInfo = []

  // 附件下载
  try {
    progressBar.pause()
    console.log('')
    const resData = await downloadAttachments({
      mdData,
      savePath,
      attachmentsDir: `./attachments/${uuid}`,
      articleTitle,
      token,
      key
    })
    mdData = resData.mdData
  } catch (e) {
    attachmentsErrInfo.push(`附件下载失败: ${e.message || 'unknown error'}`)
  } finally {
    progressBar.continue()
  }

  // 有图片 且 未忽略图片
  if (imgList.length && !ignoreImg) {
    progressBar.pause()
    let spinnerDiscardingStdin: Ora
    console.log('')
    if (env.NODE_ENV !== 'test') {
      spinnerDiscardingStdin = ora({
        text: `下载 "${articleTitle}" 的图片中...`,
        stream: stdout
      })
      spinnerDiscardingStdin.start()
    }
    let errorInfo = []
    let data = mdData
    try {
      const mdImgRes = await mdImg.run(mdData, {
        dist: savePath,
        imgDir: `./img/${uuid}`,
        isIgnoreConsole: true,
        errorStillReturn: true,
        referer: articleUrl || '',
        transform(url: string) {
          return captureImageURL(url, imageServiceDomains)
        }
      })
      errorInfo = mdImgRes.errorInfo
      data = mdImgRes.data
    } catch(e) {
      errorInfo = [e]
    }
    mdData = data
    const stopProgress = () => {
      if (spinnerDiscardingStdin) spinnerDiscardingStdin.stop()
      progressBar.continue()
    }

    if (errorInfo.length > 0) {
      // const errMessage = `图片下载失败(失败的以远程链接保存): \n`
      // let errMessageList = ''
      // errorInfo.forEach((e, index) => {
      //   errMessageList = `${errMessageList} ———————— ${index+1}. ${e.error?.message}: ${e.url} \n`
      // })
      const e = errorInfo[0]
      let errMessage = `图片下载失败(失败的以远程链接保存): `
      errMessage = e.url ? `${errMessage}${e.error?.message} ${e.url.slice(0, 20)}...` : `${errMessage}${e.message}`
      // 图片下载 md文档按远程图片保存
      await writeFile(saveFilePath, handleMdData(mdData, handleMdDataOptions))
      stopProgress()
      // throw new Error(`${errMessage}\n${errMessageList}`)
      throw new Error(`${errMessage}`)
    }
    stopProgress()
  }

  try {
    await writeFile(saveFilePath, handleMdData(mdData, handleMdDataOptions))
    // 保存后检查附件是否下载失败， 优先图片下载错误显示 图片下载失败直接就 throw不会走到这里
    if (attachmentsErrInfo.length > 0) {
      throw new Error(attachmentsErrInfo[0])
    }
    return true
  } catch(e) {
    throw new Error(`download article Error ${articleUrl}: ${e.message}`)
  }
}

function handleMdData (rawMdData: string, options: IHandleMdDataOptions): string {
  const {articleTitle, articleUrl, toc} = options
  let mdData = rawMdData

  mdData = mdData.replace(/<br(\s?)\/>/gm, '\n')
  mdData = mdData.replace(/<a.*?>(\s*?)<\/a>/gm, '')
  const  header = articleTitle ? `# ${articleTitle}\n\n` : ''
  // toc 目录添加
  let tocData = toc ? mdToc(mdData).content : ''
  if (tocData) tocData = `${tocData}\n\n---\n\n`

  const footer = articleUrl ? `\n\n> 原文: <${articleUrl}>` : ''

  mdData = `${header}${tocData}${mdData}${footer}`
  return mdData
}