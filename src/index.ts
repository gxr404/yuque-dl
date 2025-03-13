import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import Summary from './parse/Summary'
import { getKnowledgeBaseInfo } from './api'
import { fixPath } from './parse/fix'
import { ProgressBar, isValidUrl, logger } from './utils'
import { downloadArticleList } from './download/list'

import type { ICliOptions, IProgressItem } from './types'

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
