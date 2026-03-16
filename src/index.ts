import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import Summary from './parse/Summary'
import { getDocInfoFromUrl, getKnowledgeBaseInfo } from './api'
import { fixPath } from './parse/fix'
import { ProgressBar, isValidUrl, logger } from './utils'
import { downloadArticleList } from './download/list'

import type { ICliOptions, IProgressItem } from './types'
import { downloadArticle } from './download/article'

export async function main(url: string, options: ICliOptions) {
  if (!isValidUrl(url)) {
    throw new Error('Please enter a valid URL')
  }
  const {
    bookId,
    tocList,
    bookName,
    bookDesc,
    bookSlug,
    host,
    imageServiceDomains
  } = await getKnowledgeBaseInfo(url, {
    token: options.token,
    key: options.key
  })
  if (!bookId) throw new Error('No found book id')
  if (!tocList || tocList.length === 0) throw new Error('No found toc list')
  const bookPath = path.resolve(options.distDir, bookName ? fixPath(bookName) : String(bookId))

  await mkdir(bookPath, {recursive: true})

  const total = tocList.length
  const progressBar = new ProgressBar(bookPath, total, options.incremental)
  await progressBar.init()

  // 为了检查是否有增量数据
  // 即使已下载的与progress的数量一致也需继续进行
  if (!options.incremental && progressBar.curr == total) {
    if (progressBar.bar) progressBar.bar.stop()
    logger.info(`√ 已完成: ${bookPath}`)
    return
  }

  const uuidMap = new Map<string, IProgressItem>()
  // 下载中断 重新获取下载进度数据 或者 增量下载 也需获取旧的下载进度
  if (progressBar.isDownloadInterrupted || options.incremental) {
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
    options,
    imageServiceDomains
  })

  // 生成目录
  const summary = new Summary({
    bookPath,
    bookName,
    bookDesc,
    uuidMap
  })
  await summary.genFile()
  logger.info(`√ 生成目录 ${path.resolve(bookPath, 'index.md')}`)

  if (progressBar.curr === total) {
    logger.info(`√ 已完成: ${bookPath}`)
  }
}


export async function downloadDocsFromUrls(urls: string[], options: ICliOptions) {
  // 处理 cac 库单个URL时返回字符串的情况
  const urlArray = Array.isArray(urls) ? urls : [urls]

  if (!urlArray || urlArray.length === 0) {
    throw new Error('Please provide at least one document URL')
  }

  // 验证所有URL
  for (const url of urlArray) {
    if (!isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`)
    }
  }

  const total = urlArray.length
  const distPath = path.resolve(options.distDir)
  await mkdir(distPath, { recursive: true })

  const progressBar = new ProgressBar(distPath, total, false, true)
  await progressBar.init()

  let failCount = 0
  const failedDocs: Array<{ url: string; error: string }> = []
  const successDocs: string[]  = []

  for (let i = 0; i < urlArray.length; i++) {
    const url = urlArray[i]
    let progressItem: IProgressItem | undefined
    try {
      const docInfo = await getDocInfoFromUrl(url, {
        token: options.token,
        key: options.key
      })

      const {
        docId,
        docSlug,
        docTitle,
        bookId,
        bookSlug,
        host,
        imageServiceDomains = []
      } = docInfo

      if (!docId || !bookId || !docSlug) {
        throw new Error('Failed to get document info from URL')
      }

      const fileName = fixPath(docTitle || docSlug)
      const savePath = distPath
      const saveFilePath = path.resolve(distPath, `${fileName}.md`)

      progressItem = {
        path: `${fileName}.md`,
        pathTitleList: [fileName],
        pathIdList: [String(docId)],
        toc: {
          type: 'DOC',
          title: docTitle || docSlug,
          uuid: String(docId),
          url: docSlug,
          prev_uuid: '',
          sibling_uuid: '',
          child_uuid: '',
          parent_uuid: '',
          doc_id: docId,
          level: 0,
          id: docId,
          open_window: 0,
          visible: 1
        }
      }

      const articleUrl = bookSlug ? `${host}/${bookSlug}/${docSlug}` : url
      const articleInfo = {
        bookId,
        itemUrl: docSlug,
        savePath,
        saveFilePath,
        uuid: String(docId),
        articleUrl,
        articleTitle: docTitle || docSlug,
        host,
        imageServiceDomains
      }

      await downloadArticle({
        articleInfo,
        progressBar,
        options,
        progressItem
      })

      await progressBar.updateProgress(progressItem, true)
      successDocs.push(saveFilePath)
    } catch (e) {
      if (progressItem) {
        await progressBar.updateProgress(progressItem, false)
      }
      failCount += 1
      const errorMsg = e.message || 'unknown error'
      failedDocs.push({ url, error: errorMsg })
    }
  }

  if (progressBar.bar) progressBar.bar.stop()

  successDocs.forEach(docsPath => {
    logger.info(`√ 已完成: ${docsPath}`)
  })
  if (failCount > 0) {
    failedDocs.forEach(({ url, error }) => {
      logger.error(`✕ 下载失败: ${url}`)
      logger.error(`———— ${error}`)
    })
  }
}