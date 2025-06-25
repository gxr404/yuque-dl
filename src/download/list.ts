import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import { ARTICLE_CONTENT_TYPE, ARTICLE_TOC_TYPE } from '../constant'
import { logger } from '../utils'
import { fixPath } from '../parse/fix'
import { downloadArticle } from './article'

import type {
  KnowledgeBase,
  IProgressItem,
  IErrArticleInfo,
  IDownloadArticleListParams,
  IUpdateDownloadItem
} from '../types'


export async function downloadArticleList(params: IDownloadArticleListParams) {
  const {
    articleUrlPrefix,
    total,
    uuidMap,
    tocList,
    bookPath,
    bookId,
    progressBar,
    host,
    options,
    imageServiceDomains = []
  } = params
  let errArticleCount = 0
  let totalArticleCount = 0
  let warnArticleCount = 0
  const errArticleInfo: IErrArticleInfo[] = []
  const warnArticleInfo = []
  const updateDownloadList: IUpdateDownloadItem[] = []
  for (let i = 0; i < total; i++) {
    const item = tocList[i]
    if (typeof item.type !== 'string') continue
    // if (uuidMap.get(item.uuid)) continue

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
        path: pathTitleList.map(fixPath).join('/'),
        pathTitleList,
        pathIdList,
        toc: item
      }
      // 外链类型不创建目录
      if (itemType === ARTICLE_TOC_TYPE.LINK) {
        warnArticleCount += 1
        warnArticleInfo.push(progressItem)
      } else {
        await mkdir(`${bookPath}/${pathTitleList.map(fixPath).join('/')}`, {recursive: true})
      }
      uuidMap.set(item.uuid, progressItem)
      // 即是文档也是title则创建文件夹后不更新进度直接进行文档处理
      if (itemType === ARTICLE_CONTENT_TYPE.DOC) {
        await docHandle(item)
      } else {
        await progressBar.updateProgress(progressItem, itemType !== ARTICLE_TOC_TYPE.LINK)
      }
    } else if (item.url) {
      await docHandle(item)
    }
  }
  async function docHandle(item: KnowledgeBase.Toc) {
    totalArticleCount += 1
    let preItem: Omit<IProgressItem, 'toc'> = {
      path: '',
      pathTitleList: [],
      pathIdList: []
    }
    const itemType = item.type.toLocaleLowerCase()
    if (uuidMap.get(item['parent_uuid'])) {
      preItem = uuidMap.get(item['parent_uuid'])!
    }
    const fileName = fixPath(item.title)
    const pathTitleList = [...preItem.pathTitleList, fileName]
    const pathIdList = [...preItem.pathIdList, item.uuid]
    let mdPath = [...preItem.pathTitleList, `${fileName}.md`].map(fixPath).join('/')
    let savePath = preItem.pathTitleList.map(fixPath).join('/')
    // 是标题也是文档
    if (itemType === ARTICLE_CONTENT_TYPE.DOC && item['child_uuid']) {
      mdPath = [...preItem.pathTitleList, fileName, 'index.md'].map(fixPath).join('/')
      savePath = pathTitleList.map(fixPath).join('/')
    }
    const progressItem = {
      path: mdPath,
      savePath,
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
        // savePath与saveFilePath区别在于 saveFilePath带有最后的 xx.md
        savePath: path.resolve(bookPath, progressItem.savePath),
        saveFilePath: path.resolve(bookPath, progressItem.path),
        uuid: item.uuid,
        articleUrl,
        articleTitle: item.title,
        host,
        imageServiceDomains
      }
      const { isUpdateDownload } = await downloadArticle({
        articleInfo,
        progressBar,
        options,
        progressItem,
        oldProgressItem: uuidMap.get(item.uuid)
      })
      if (isUpdateDownload) {
        updateDownloadList.push({
          progressItem,
          articleInfo
        })
      }
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
      logger.error(`《${errInfo.errItem.path}》: ${errInfo.articleUrl}`)
      errInfo.errMsg.split('\n').forEach(errMsg => {
        logger.error(`———— ✕ ${errMsg}`)
      })
    }
    logger.error('o(╥﹏╥)o 由于网络波动或链接失效以上下载失败，可重新执行命令重试(PS:不会影响已下载成功的数据)')
  }
  // 打印更新下载/增量下载
  if (updateDownloadList.length > 0) {
    logger.info('以下文档有更新: ')
    updateDownloadList.forEach(item => {
      logger.info(`———— √ ${item.articleInfo.saveFilePath}`)
    })
  }
}