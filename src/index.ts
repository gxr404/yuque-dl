import fs from 'node:fs/promises'
import path from 'node:path'

import axios from 'axios'

import config from './config'
import logger from './log'
import ProgressBar from './ProgressBar'
import type { IProgressItem } from './ProgressBar'
import type { IOptions } from './cli'
import { randUserAgent } from './utils'
import mdImg from 'pull-md-img'
import type { ArticleResponse } from './types/ArticleResponse'
import type { KnowledgeBase } from './types/KnowledgeBaseResponse'

interface IKnowledgeBaseInfo {
  bookId?: number
  tocList?: KnowledgeBase.Toc[],
  bookName?: string,
  bookDesc?: string
}

function getKnowledgeBaseInfo(url: string): Promise<IKnowledgeBaseInfo> {
  return axios.get<string>(url, {
    headers: {
      "user-agent": randUserAgent({browser: 'chrome', device: "desktop"})
    }
  }).then(({data = '', status}) => {
    if (status === 200) return data
    return ''
  }).then(html => {
    const data = html.match(config.knowledgeBaseReg) || ''
    if (!data[1]) return {}
    const jsonData: KnowledgeBase.Response = JSON.parse(decodeURIComponent(data[1]))
    const info = {
      bookId: jsonData.book.id,
      tocList: jsonData.book.toc || [],
      bookName: jsonData.book.name || '',
      bookDesc: jsonData.book.description || '',
    }
    return info
  })
}

async function main(url: string, options: IOptions) {
  const {bookId, tocList, bookName, bookDesc} = await getKnowledgeBaseInfo(url)
  if (!bookId) throw new Error('No found book id')
  if (!tocList || tocList.length === 0) throw new Error('No found toc list')

  const bookPath = `${options.distDir}/${bookId}`
  await fs.mkdir(bookPath, {recursive: true})

  const total = tocList.length
  const progressBar = new ProgressBar(bookPath, total)
  await progressBar.init()

  if (progressBar.curr === total) {
    logger.info('√ 已完成')
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


  const articleUrlPrefix = path.parse(url).dir
  let errArticleCount = 0
  let totalArticleCount = 0
  for (let i = 0; i < total; i++) {
    const item = tocList[i]
    if (typeof item.type !== 'string') continue
    if (uuidMap.get(item.uuid)) continue
    const itemType = item.type.toLocaleLowerCase()
    const dirNameReg = /[\\\/:\*\?"<>\|\n\r]/g
    // 目录
    if (itemType === 'title' || item['child_uuid'] !== '') {
      let tempItem: KnowledgeBase.Toc | undefined = item
      let pathTitleList = []
      let pathIdList = []
      while (tempItem) {
        pathTitleList.unshift(tempItem.title.replace(dirNameReg, '_'))
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
      await fs.mkdir(`${bookPath}/${pathTitleList.join('/')}`, {recursive: true})
      uuidMap.set(item.uuid, progressItem)
      progressBar.updateProgress(progressItem)
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
      const fileName = item.title.replace(dirNameReg, '_')
        const pathTitleList = [...preItem!.pathTitleList, `${fileName}.md`]
        const pathIdList = [...preItem!.pathIdList, item.uuid]
        const progressItem = {
          path: pathTitleList.join('/'),
          pathTitleList,
          pathIdList,
          toc: item
        }
        const isSuccess = await downloadArticle({
          bookId,
          itemUrl: item.url,
          savePath: `${bookPath}/${preItem!.path}`,
          saveFilePath: `${bookPath}/${progressItem.path}`,
          uuid: item.uuid,
          articleUrl: `${articleUrlPrefix}/${item.url}`,
          articleTitle: item.title
        })
        if (isSuccess) {
          uuidMap.set(item.uuid, progressItem)
          progressBar.updateProgress(progressItem)
        } else {
          errArticleCount += 1
        }
    }
  }

  await progressBar.completePromise

  logger.info(`本次执行总数${totalArticleCount}篇，✕ 失败${errArticleCount}篇`)
  logger.info('生成目录 SUMMARY.md')

  await genSummaryFile({
    bookPath,
    bookName,
    bookDesc,
    uuidMap
  })
  if (progressBar.curr === total) {
    logger.info('√ 已完成')
    return
  }

}

interface IDownloadArticleParams {
  bookId: number,
  itemUrl: string,
  savePath: string,
  saveFilePath: string,
  uuid: string,
  articleTitle: string,
  articleUrl: string
}
async function downloadArticle(params: IDownloadArticleParams): Promise<boolean> {
  const {bookId, itemUrl, savePath, saveFilePath, uuid, articleUrl, articleTitle} = params
  const apiUrl = `https://www.yuque.com/api/docs/${itemUrl}`
  const response = await axios.get<ArticleResponse.RootObject>(apiUrl, {
    headers: {
      "user-agent": randUserAgent({browser: 'chrome', device: "desktop"})
    },
    params: {
      'book_id': bookId,
      'merge_dynamic_data': false,
      mode: 'markdown'
    }
  }).then(({data, status}) => {
    if (status === 200) return data
    logger.error(`download article error: ${apiUrl} http status ${status}`)
    return null
  })
  if (!response || !response.data || !response.data.sourcecode) return false
  let mdData = response.data.sourcecode
  try {
    mdData = await mdImg.run(mdData, {
      dist: savePath,
      imgDir: `img/${uuid}`,
      isIgnoreConsole: true
    })
  } catch(err) {
    logger.error(`download article img Error (api: ${apiUrl})`)
    return false
  }

  mdData = mdData.replace(/<br(\s?)\/>/gm, '\n')
  if (articleTitle) {
    mdData = `# ${articleTitle}\n<!--page header-->\n\n${mdData}\n\n`
  }
  if (articleUrl){
    mdData += `<!--page footer-->\n- 原文: <${articleUrl}>`
  }

  try {
    await fs.writeFile(saveFilePath, mdData)
    return true
  } catch(e) {
    logger.error(`download article write file Error (api: ${apiUrl})`)
    return false
  }
}
interface IGenSummaryFile {
  bookPath: string,
  bookName?: string,
  bookDesc?: string,
  uuidMap: Map<string, IProgressItem>
}

async function genSummaryFile(params: IGenSummaryFile) {
  const {bookName, bookDesc, bookPath, uuidMap} = params
  const header = `# ${bookName}\n\n > ${bookDesc}\n\n`
  let mdContent = header
  const summary: SummaryItem[] = []
  uuidMap.forEach(progressItem => {
    const toc = progressItem.toc
    const parentId = toc['parent_uuid']
    const findRes = findTree(summary, parentId)
    if (toc.type.toLocaleLowerCase() === 'title' || toc['child_uuid'] !=='') {
      if (typeof findRes !== 'boolean') {
        if (!Array.isArray(findRes.children)) findRes.children = []
        findRes.children!.push({
          id: toc.uuid,
          type: 'title',
          level: findRes.level + 1,
          text: toc.title
        })
      } else {
        summary.push({
          id: toc.uuid,
          type: 'title',
          text: toc.title,
          level: 1
        })
      }
    } else {
      if (typeof findRes !== 'boolean') {
        if (!Array.isArray(findRes.children)) findRes.children = []
        findRes.children!.push({
          id: toc.uuid,
          type: 'link',
          level: findRes.level + 1,
          link: progressItem.path,
          text: toc.title
        })
      } else {
        summary.push({
          id: toc.uuid,
          type: 'link',
          text: toc.title,
          link: progressItem.path,
          level: 1
        })
      }
    }
  })

  let summaryContent = genSummaryContent(summary, '')
  mdContent += summaryContent
  try {
    await fs.writeFile(`${bookPath}/SUMMARY.md`, mdContent)
  } catch (err) {
    logger.error('Generate Summary Error')
  }

}

function genSummaryContent(summary: SummaryItem[], summaryContent: string): string {
  for (let i = 0; i < summary.length; i++) {
    const item = summary[i]
    if (item.type === 'title')  {
      summaryContent += `\n${''.padStart(item.level + 1, '#')} ${item.text}\n\n`
    } else if (item.type === 'link') {
      const link = item.link ? item.link.replace(/\s/g, '%20') : item.link
      summaryContent += `- [${item.text}](${link})\n`
    }
    if (Array.isArray(item.children)) {
      summaryContent += genSummaryContent(item.children, '')
    }
  }
  return summaryContent
}

interface SummaryItem {
  id: string,
  children?: SummaryItem[],
  type: string,
  text: string,
  level: number,
  link?: string
}
function findIdItem(node: SummaryItem, id: string) {
  if (node.id === id) {
    return node
  } else if (node.children) {
    const findRes = findTree(node.children, id)
    if (findRes) return findRes
  }
  return false
}
function findTree(tree: SummaryItem[], id: string): SummaryItem | boolean {
  if (!id) return false
  for (let i = 0; i< tree.length; i++) {
      const findRes = findIdItem(tree[i], id)
      if (findRes) return findRes
  }
  return false
}

export {
  getKnowledgeBaseInfo,
  main
}