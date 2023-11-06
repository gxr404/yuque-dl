import { writeFile, mkdir } from 'node:fs/promises'
import mdImg from 'pull-md-img'
import ora from 'ora'
import ProgressBar from './ProgressBar'
import Summary from './Summary'
import logger from './log'
import { ARTICLE_CONTENT_TYPE, ARTICLE_TOC_TYPE, articleContentMap } from './constant'
import { getDocsMdData, getKnowledgeBaseInfo } from './api'

import type { IProgressItem } from './ProgressBar'
import type { IOptions } from './cli'
import type { KnowledgeBase } from './types/KnowledgeBaseResponse'

interface IDownloadArticleParams {
  bookId: number,
  itemUrl: string,
  savePath: string,
  saveFilePath: string,
  uuid: string,
  articleTitle: string,
  articleUrl: string,
  ignoreImg: boolean
}

/** 下载单篇文章 */
async function downloadArticle(params: IDownloadArticleParams, progressBar: ProgressBar, token?: string): Promise<boolean> {
  const {
    bookId,
    itemUrl,
    savePath,
    saveFilePath,
    uuid,
    articleUrl,
    articleTitle,
    ignoreImg
  } = params

  const { httpStatus, apiUrl, response} = await getDocsMdData({
    articleUrl: itemUrl,
    bookId,
    token
  })
  const contentType = response?.data?.type?.toLocaleLowerCase() as ARTICLE_CONTENT_TYPE
  // 暂时不支持的文档类型
  if ([
    ARTICLE_CONTENT_TYPE.BOARD,
    ARTICLE_CONTENT_TYPE.SHEET,
    ARTICLE_CONTENT_TYPE.TABLE
  ].includes(contentType)) {
    const notSupportType = articleContentMap.get(contentType)
    throw new Error(`download article Error: 暂不支持“${notSupportType}”的文档`)
  } else if (typeof response?.data?.sourcecode !== 'string') {
    throw new Error(`download article Error: ${apiUrl}, http status ${httpStatus}`)
  }

  let mdData = response.data.sourcecode
  if (!ignoreImg) {
    progressBar.pause()
    console.log('')
    const spinnerDiscardingStdin = ora({
      text: `下载 "${articleTitle}" 的图片中...`
    })
    spinnerDiscardingStdin.start();
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

  if (articleTitle) {
    mdData = `# ${articleTitle}\n<!--page header-->\n\n${mdData}\n\n`
  }
  if (articleUrl){
    mdData += `<!--page footer-->\n- 原文: <${articleUrl}>`
  }

  try {
    await writeFile(saveFilePath, mdData)
    return true
  } catch(e) {
    throw new Error(`download article Error ${articleUrl}: ${e.message}`)
  }
}

function fixPath(dirPath: string) {
  if (!dirPath) return ''
  const dirNameReg = /[\\/:*?"<>|\n\r]/g
  return dirPath.replace(dirNameReg, '_').replace(/\s/, '')
}

interface IDownloadArticleListParams {
  articleUrlPrefix: string,
  total: number,
  uuidMap: Map<string, IProgressItem>,
  tocList: KnowledgeBase.Toc[],
  bookPath: string,
  bookId: number,
  progressBar: ProgressBar,
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
    options
  } = params
  let errArticleCount = 0
  let totalArticleCount = 0
  let warnArticleCount = 0
  let errArticleInfo = []
  let warnArticleInfo = []
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
      let pathTitleList = []
      let pathIdList = []
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
        await downloadArticle({
          bookId,
          itemUrl: item.url,
          savePath: `${bookPath}/${preItem.path}`,
          saveFilePath: `${bookPath}/${progressItem.path}`,
          uuid: item.uuid,
          articleUrl,
          articleTitle: item.title,
          ignoreImg: options.ignoreImg
        }, progressBar, options.token)
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
    bookSlug
  } = await getKnowledgeBaseInfo(url, options.token)
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