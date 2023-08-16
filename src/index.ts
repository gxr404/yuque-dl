import { writeFile, mkdir } from 'node:fs/promises'

import axios from 'axios'
import mdImg from 'pull-md-img'

import ProgressBar from './ProgressBar'
import Summary from './Summary'
import logger from './log'
import { randUserAgent } from './utils'

import type { ArticleResponse } from './types/ArticleResponse'
import type { KnowledgeBase } from './types/KnowledgeBaseResponse'
import type { IProgressItem } from './ProgressBar'
import type { IOptions } from './cli'

interface IKnowledgeBaseInfo {
  bookId?: number
  bookSlug?: string
  tocList?: KnowledgeBase.Toc[],
  bookName?: string,
  bookDesc?: string
}
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

/** 获取知识库数据信息 */
function getKnowledgeBaseInfo(url: string): Promise<IKnowledgeBaseInfo> {
  const knowledgeBaseReg = /decodeURIComponent\(\"(.+)\"\)\);/m
  return axios.get<string>(url, {
    headers: {
      "user-agent": randUserAgent({browser: 'chrome', device: "desktop"})
    }
  }).then(({data = '', status}) => {
    if (status === 200) return data
    return ''
  }).then(html => {
    const data = html.match(knowledgeBaseReg) || ''
    if (!data[1]) return {}
    const jsonData: KnowledgeBase.Response = JSON.parse(decodeURIComponent(data[1]))
    if (!jsonData.book) return {}
    const info = {
      bookId: jsonData.book.id,
      bookSlug: jsonData.book.slug,
      tocList: jsonData.book.toc || [],
      bookName: jsonData.book.name || '',
      bookDesc: jsonData.book.description || '',
    }
    return info
  })
}

/** 下载单篇文章 */
async function downloadArticle(params: IDownloadArticleParams): Promise<boolean> {
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

  let apiUrl = `https://www.yuque.com/api/docs/${itemUrl}`
  const apiParams = {
    'book_id': String(bookId),
    'merge_dynamic_data': String(false),
    mode: 'markdown'
  }
  const query = new URLSearchParams(apiParams).toString();
  apiUrl = `${apiUrl}?${query}`

  const response = await axios.get<ArticleResponse.RootObject>(apiUrl, {
    headers: {"user-agent": randUserAgent({browser: 'chrome', device: "desktop"})}
  }).then(({data, status}) => {
    if (status === 200) {
      const apiRes = data
      if (!apiRes || !apiRes.data || !apiRes.data.sourcecode) {
        throw new Error(`download article Error: ${apiUrl}`)
      }
      return apiRes
    }
    throw new Error(`download article Error: ${apiUrl} http status ${status}`)
  }).catch(e => {
    throw new Error(`download article Error: ${apiUrl} ${e.message}`)
  })

  let mdData = response.data.sourcecode
  if (!ignoreImg) {
    try {
      mdData = await mdImg.run(mdData, {
        dist: savePath,
        imgDir: `img/${uuid}`,
        isIgnoreConsole: true
      })
    } catch(e) {
      let errMessage = `download article image Error: ${e.message}`
      if (e.error && e.url) {
        errMessage = `download article image Error ${e.url}: ${e.error?.message}`
      }
      throw new Error(errMessage)
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
  const dirNameReg = /[\\\/:\*\?"<>\|\n\r]/g
  return dirPath.replace(dirNameReg, '_').replace(/\s/, '')
}

async function main(url: string, options: IOptions) {
  const {bookId, tocList, bookName, bookDesc, bookSlug} = await getKnowledgeBaseInfo(url)
  if (!bookId) throw new Error('No found book id')
  if (!tocList || tocList.length === 0) throw new Error('No found toc list')

  const bookPath = `${options.distDir}/${bookName ? fixPath(bookName) : bookId}`
  await mkdir(bookPath, {recursive: true})

  const total = tocList.length
  const progressBar = new ProgressBar(bookPath, total)
  await progressBar.init()

  if (progressBar.curr === total) {
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
  let errArticleCount = 0
  let totalArticleCount = 0
  let errArticleInfo = []
  for (let i = 0; i < total; i++) {
    const item = tocList[i]
    if (typeof item.type !== 'string') continue
    if (uuidMap.get(item.uuid)) continue
    const itemType = item.type.toLocaleLowerCase()

    // 目录
    if (itemType === 'title' || item['child_uuid'] !== '') {
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
      await mkdir(`${bookPath}/${pathTitleList.join('/')}`, {recursive: true})
      uuidMap.set(item.uuid, progressItem)
      progressBar.updateProgress(progressItem, true)
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
      const pathTitleList = [...preItem!.pathTitleList, `${fileName}.md`]
      const pathIdList = [...preItem!.pathIdList, item.uuid]
      const progressItem = {
        path: pathTitleList.join('/'),
        pathTitleList,
        pathIdList,
        toc: item
      }
      let isSuccess = true
      try {
        await downloadArticle({
          bookId,
          itemUrl: item.url,
          savePath: `${bookPath}/${preItem!.path}`,
          saveFilePath: `${bookPath}/${progressItem.path}`,
          uuid: item.uuid,
          articleUrl: `${articleUrlPrefix}/${item.url}`,
          articleTitle: item.title,
          ignoreImg: options.ignoreImg
        })
      } catch(e) {
        isSuccess = false
        errArticleCount += 1
        errArticleInfo.push(progressItem)
        progressBar.bar?.interrupt(`✕ ${e.message}`)
      }
      uuidMap.set(item.uuid, progressItem)
      progressBar.updateProgress(progressItem, isSuccess)
    }
  }

  // 等待进度条打印完毕
  await progressBar.completePromise?.finally(() => console.log(''))

  // 文章下载中失败打印
  if (errArticleCount > 0) {
    logger.info(`本次执行总数${totalArticleCount}篇，✕ 失败${errArticleCount}篇`)
    for (let i = 0; i < errArticleInfo.length; i++) {
      logger.error(`✕ ${errArticleInfo[i].path}`)
    }
    logger.info(`o(╥﹏╥)o 由于网络波动或链接失效以上下载失败，可重新执行命令重试(不会影响已下载成功的数据)~~`)
  }

  // 生成目录
  const summary = new Summary({
    bookPath,
    bookName,
    bookDesc,
    uuidMap
  })
  await summary.genFile()
  logger.info('√ 生成目录 SUMMARY.md')

  if (progressBar.curr === total) {
    logger.info(`√ 已完成: ${process.cwd()}/${bookPath}`)
    return
  }

}

export {
  getKnowledgeBaseInfo,
  downloadArticle,
  main
}