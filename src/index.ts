import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import Summary from './parse/Summary'
import { getDocInfoFromUrl, getKnowledgeBaseInfo, getUserBooks, verifyPublicPassword } from './api'
import { fixPath } from './parse/fix'
import { ProgressBar, isValidUrl, logger } from './utils'
import { downloadArticleList } from './download/list'

import type { ICliOptions, IProgressItem } from './types'
import { downloadArticle } from './download/article'
import { DEFAULT_DOMAIN } from './constant'

export async function main(url: string, options: ICliOptions) {
  if (!isValidUrl(url)) {
    throw new Error('Please enter a valid URL')
  }

  // 明确传入公开密码知识库的密码
  // 验证码更新options的key和token
  if (options.password) {
    const verifyRes = await verifyPublicPassword(url, options.password, {
      token: options.token,
      key: options.key
    })
    if (!verifyRes) throw new Error('Password validation failed')
    options.key = verifyRes.key
    options.token = verifyRes.token
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

/** 批量下载多个知识库 */
export async function downloadBooksFromUrls(urls: string[], options: ICliOptions) {
  const urlArray = Array.isArray(urls) ? urls : [urls]

  if (!urlArray || urlArray.length === 0) {
    throw new Error('Please provide at least one book URL')
  }

  for (const url of urlArray) {
    if (!isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`)
    }
  }

  const totalBooks = urlArray.length
  logger.info(`批量下载 ${totalBooks} 个知识库\n`)

  const successBooks: string[] = []
  const failedBooks: Array<{ url: string; error: string }> = []

  for (let i = 0; i < urlArray.length; i++) {
    const url = urlArray[i]
    logger.info(`[${i + 1}/${totalBooks}] 下载: ${url}`)

    try {
      await main(url, options)
      successBooks.push(url)
    } catch (e) {
      const errorMsg = e.message || 'unknown error'
      logger.error(`✕ 下载失败: ${url} — ${errorMsg}`)
      failedBooks.push({ url, error: errorMsg })
    }
  }

  // 打印汇总
  logger.info(`\n${'='.repeat(50)}`)
  logger.info(`下载完成: ${successBooks.length}/${totalBooks} 个知识库成功`)
  if (failedBooks.length > 0) {
    logger.warn(`失败 ${failedBooks.length} 个:`)
    failedBooks.forEach(({ url, error }) => {
      logger.error(`  ✕ ${url}: ${error}`)
    })
  }
}

/** 下载当前用户的所有知识库 */
export async function downloadAllBooks(options: ICliOptions) {
  if (!options.token) {
    throw new Error('Token is required for downloading all books. Use -t <token>')
  }

  const books = await getUserBooks({
    token: options.token,
    key: options.key
  })

  if (books.length === 0) {
    logger.warn('未找到任何知识库')
    return
  }

  const totalBooks = books.length
  const totalDocs = books.reduce((sum, b) => sum + (b.items_count || 0), 0)
  logger.info(`找到 ${totalBooks} 个知识库，共 ${totalDocs} 篇文档\n`)

  const successBooks: string[] = []
  const failedBooks: Array<{ name: string; error: string }> = []

  for (let i = 0; i < books.length; i++) {
    const book = books[i]
    const userLogin = book.user?.login
    if (!userLogin) {
      failedBooks.push({ name: book.name, error: '无法获取用户登录名' })
      continue
    }

    const bookUrl = `${DEFAULT_DOMAIN}/${userLogin}/${book.slug}`
    logger.info(`[${i + 1}/${totalBooks}] 下载: ${book.name} (${book.items_count} 篇) → ${bookUrl}`)

    try {
      await main(bookUrl, options)
      successBooks.push(book.name)
    } catch (e) {
      const errorMsg = e.message || 'unknown error'
      logger.error(`✕ 下载失败: ${book.name} — ${errorMsg}`)
      failedBooks.push({ name: book.name, error: errorMsg })
    }
  }

  // 打印汇总
  logger.info(`\n${'='.repeat(50)}`)
  logger.info(`下载完成: ${successBooks.length}/${totalBooks} 个知识库成功`)
  if (failedBooks.length > 0) {
    logger.warn(`失败 ${failedBooks.length} 个:`)
    failedBooks.forEach(({ name, error }) => {
      logger.error(`  ✕ ${name}: ${error}`)
    })
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
