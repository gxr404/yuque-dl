import { writeFile, mkdir } from 'node:fs/promises'
import mdImg from 'pull-md-img'
import ora from 'ora'
import mdToc from 'markdown-toc'
import ProgressBar from './ProgressBar'
import Summary from './Summary'
import logger from './log'
import { ARTICLE_CONTENT_TYPE, ARTICLE_TOC_TYPE, articleContentMap } from './constant'
import { getDocsMdData, getKnowledgeBaseInfo } from './api'

import type { IProgressItem } from './ProgressBar'
import type { IOptions } from './cli'
import type { KnowledgeBase } from './types/KnowledgeBaseResponse'
import { parseSheet } from './parseSheet'

interface ArticleInfo {
  bookId: number,
  itemUrl: string,
  savePath: string,
  saveFilePath: string,
  uuid: string,
  articleTitle: string,
  articleUrl: string,
  ignoreImg: boolean
  host?: string
}
interface DownloadArticleParams {
  /** 文章信息 */
  articleInfo: ArticleInfo,
  /** 进度条实例 */
  progressBar: ProgressBar,
  /** cli options */
  options: IOptions
}

/** 下载单篇文章 */
async function downloadArticle(params: DownloadArticleParams): Promise<boolean> {
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
  } = articleInfo
  const { httpStatus, apiUrl, response} = await getDocsMdData({
    articleUrl: itemUrl,
    bookId,
    token,
    host,
    key,
  })

  const contentType = response?.data?.type?.toLocaleLowerCase() as ARTICLE_CONTENT_TYPE
  let mdData = ''

  /** 表格类型 */
  if (contentType === ARTICLE_CONTENT_TYPE.SHEET) {
    const {response} = await getDocsMdData({
      articleUrl: itemUrl,
      bookId,
      token,
      host,
      key,
    }, false)
    try {
      const rawContent = response?.data?.content
      const content = rawContent ? JSON.parse(rawContent) : {}
      const sheetData = content?.sheet
      mdData = sheetData ? parseSheet(sheetData) : ''
      // 表格类型默认忽略图片
      // ignoreImg = true
      // TODO 表格类型中插入图表 vessels字段
    } catch(e) {
      const notSupportType = articleContentMap.get(contentType)
      throw new Error(`download article Error: “${notSupportType}”解析错误 ${e}`)
    }
  } else if ([
      ARTICLE_CONTENT_TYPE.BOARD,
      ARTICLE_CONTENT_TYPE.TABLE
    ].includes(contentType)) {
    // 暂时不支持的文档类型
    const notSupportType = articleContentMap.get(contentType)
    throw new Error(`download article Error: 暂不支持“${notSupportType}”的文档`)
  } else if (typeof response?.data?.sourcecode !== 'string') {
    throw new Error(`download article Error: ${apiUrl}, http status ${httpStatus}`)
  } else {
    mdData = response.data.sourcecode
  }

  if (!ignoreImg) {
    progressBar.pause()
    console.log('')
    const spinnerDiscardingStdin = ora({
      text: `下载 "${articleTitle}" 的图片中...`
    })
    spinnerDiscardingStdin.start()
    try {
      mdData = await mdImg.run(mdData, {
        dist: savePath,
        imgDir: `./img/${uuid}`,
        isIgnoreConsole: true
      })
    } catch(e) {
      let errMessage = `download article image Error: ${e.message}`
      if (e.error && e.url) {
        errMessage = `download article image Error ${e.url}: ${e.error?.message}`
      }
      throw new Error(errMessage)
    } finally {
      spinnerDiscardingStdin.stop()
      progressBar.continue()
    }
  }

  mdData = mdData.replace(/<br(\s?)\/>/gm, '\n')
  mdData = mdData.replace(/<a.*?>(\s*?)<\/a>/gm, '')

  const  header = articleTitle ? `# ${articleTitle}\n\n` : ''
  // toc 目录添加
  let toc = !options.ignoreToc ? mdToc(mdData).content : ''
  if (toc) toc = `${toc}\n\n---\n\n`

  const footer = articleUrl ? `\n\n> 原文: <${articleUrl}>` : ''

  mdData = `${header}${toc}${mdData}${footer}`

  try {
    await writeFile(saveFilePath, mdData)
    return true
  } catch(e) {
    throw new Error(`download article Error ${articleUrl}: ${e.message}`)
  }
}

function removeEmojis(dirName:string){
  return dirName.replace(/[\ud800-\udbff][\udc00-\udfff]/g, '')
}

function fixPath(dirPath: string) {
  if (!dirPath) return ''
  const dirNameReg = /[\\/:*?"<>|\n\r]/g
  return removeEmojis(dirPath.replace(dirNameReg, '_').replace(/\s/g, ''))
}

interface IDownloadArticleListParams {
  articleUrlPrefix: string,
  total: number,
  uuidMap: Map<string, IProgressItem>,
  tocList: KnowledgeBase.Toc[],
  bookPath: string,
  bookId: number,
  progressBar: ProgressBar,
  host?: string
  options: IOptions
}
async function downloadArticleList(params: IDownloadArticleListParams) {
  const {
    articleUrlPrefix,
    total,
    uuidMap,
    tocList,
    bookPath,
    bookId,
    progressBar,
    host,
    options
  } = params
  let errArticleCount = 0
  let totalArticleCount = 0
  let warnArticleCount = 0
  const errArticleInfo = []
  const warnArticleInfo = []
  for (let i = 0; i < total; i++) {
    const item = tocList[i]
    if (typeof item.type !== 'string') continue
    if (uuidMap.get(item.uuid)) continue

    const itemType = item.type.toLocaleLowerCase()
    // title目录类型/link外链类型
    if (itemType === ARTICLE_TOC_TYPE.TITLE
      || item['child_uuid'] !== ''
      || itemType === ARTICLE_TOC_TYPE.LINK
    ) {
      let tempItem: KnowledgeBase.Toc | undefined = item
      const pathTitleList = []
      const pathIdList = []
      while (tempItem) {
        pathTitleList.unshift(fixPath(tempItem.title))
        pathIdList.unshift(tempItem.uuid)
        if (uuidMap.get(tempItem['parent_uuid'])) {
          tempItem = uuidMap.get(tempItem['parent_uuid'])!.toc
        } else {
          tempItem = undefined
        }
      }
      const progressItem = {
        path: pathTitleList.join('/'),
        pathTitleList,
        pathIdList,
        toc: item
      }
      // 外链类型不创建目录
      if (itemType === ARTICLE_TOC_TYPE.LINK) {
        warnArticleCount += 1
        warnArticleInfo.push(progressItem)
      } else {
        await mkdir(`${bookPath}/${pathTitleList.join('/')}`, {recursive: true})
      }
      uuidMap.set(item.uuid, progressItem)
      await progressBar.updateProgress(progressItem, itemType !== ARTICLE_TOC_TYPE.LINK)
    } else if (item.url) {
      totalArticleCount += 1
      let preItem: Omit<IProgressItem, 'toc'> = {
        path: '',
        pathTitleList: [],
        pathIdList: []
      }
      if (uuidMap.get(item['parent_uuid'])) {
        preItem = uuidMap.get(item['parent_uuid'])!
      }
      const fileName = fixPath(item.title)
      const pathTitleList = [...preItem.pathTitleList, `${fileName}.md`]
      const pathIdList = [...preItem.pathIdList, item.uuid]
      const progressItem = {
        path: pathTitleList.join('/'),
        pathTitleList,
        pathIdList,
        toc: item
      }
      let isSuccess = true
      const articleUrl = `${articleUrlPrefix}/${item.url}`
      try {
        const articleInfo = {
          bookId,
          itemUrl: item.url,
          savePath: `${bookPath}/${preItem.path}`,
          saveFilePath: `${bookPath}/${progressItem.path}`,
          uuid: item.uuid,
          articleUrl,
          articleTitle: item.title,
          ignoreImg: options.ignoreImg,
          host,
        }
        await downloadArticle({
          articleInfo,
          progressBar,
          options
        })
      } catch(e) {
        isSuccess = false
        errArticleCount += 1
        errArticleInfo.push({
          articleUrl,
          errItem: progressItem,
          errMsg: e.message,
          err: e
        })

      }
      uuidMap.set(item.uuid, progressItem)
      await progressBar.updateProgress(progressItem, isSuccess)
    }
  }

  // 文章下载中警告打印
  if (warnArticleCount > 0) {
    logger.warn('该知识库存在以下外链文章')
    for (const warnInfo of warnArticleInfo) {
      logger.warn(`———— ✕ ${warnInfo.path} ${warnInfo.toc.url}`)
    }
  }

  // 文章下载中失败打印
  if (errArticleCount > 0) {
    logger.error(`本次执行总数${totalArticleCount}篇，✕ 失败${errArticleCount}篇`)
    for (const errInfo of errArticleInfo) {
      logger.error(`${errInfo.errItem.path} ———— ${errInfo.articleUrl}`)
      logger.error(`———— ✕ ${errInfo.errMsg}`)
    }
    logger.error(`o(╥﹏╥)o 由于网络波动或链接失效以上下载失败，可重新执行命令重试(PS:不会影响已下载成功的数据)`)
  }
}

async function main(url: string, options: IOptions) {
  const {
    bookId,
    tocList,
    bookName,
    bookDesc,
    bookSlug,
    host,
  } = await getKnowledgeBaseInfo(url, {
    token: options.token,
    key: options.key
  })
  if (!bookId) throw new Error('No found book id')
  if (!tocList || tocList.length === 0) throw new Error('No found toc list')

  const bookPath = `${options.distDir}/${bookName ? fixPath(bookName) : bookId}`
  await mkdir(bookPath, {recursive: true})

  const total = tocList.length
  const progressBar = new ProgressBar(bookPath, total)
  await progressBar.init()

  if (progressBar.curr === total) {
    if (progressBar.bar) progressBar.bar.stop()
    logger.info(`√ 已完成: ${process.cwd()}/${bookPath}`)
    return
  }
  const uuidMap = new Map<string, IProgressItem>()
  // 下载中断 重新获取下载进度数据
  if (progressBar.isDownloadInterrupted) {
    progressBar.progressInfo.forEach(item => {
      uuidMap.set(
        item.toc.uuid,
        item
      )
    })
  }
  const articleUrlPrefix = url.replace(new RegExp(`(.*?/${bookSlug}).*`), '$1')
  // 下载文章列表
  await downloadArticleList({
    articleUrlPrefix,
    total,
    uuidMap,
    tocList,
    bookPath,
    bookId,
    progressBar,
    host,
    options
  })

  // 生成目录
  const summary = new Summary({
    bookPath,
    bookName,
    bookDesc,
    uuidMap
  })
  await summary.genFile()
  const userPath = process.cwd()
  logger.info(`√ 生成目录 ${userPath}/${bookPath}/SUMMARY.md`)

  if (progressBar.curr === total) {
    logger.info(`√ 已完成: ${userPath}/${bookPath}`)
  }
  process.exit(0)
}

export {
  downloadArticle,
  main
}