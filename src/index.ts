import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
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
import { captureImageURL } from './crypto'
import { getMarkdownImageList } from './utils'

interface ArticleInfo {
  bookId: number,
  itemUrl: string,
  savePath: string,
  saveFilePath: string,
  uuid: string,
  articleTitle: string,
  articleUrl: string,
  ignoreImg: boolean,
  host?: string,
  imageServiceDomains: string[]
}
interface DownloadArticleParams {
  /** 文章信息 */
  articleInfo: ArticleInfo,
  /** 进度条实例 */
  progressBar: ProgressBar,
  /** cli options */
  options: IOptions
}

interface IErrArticleInfo {
  articleUrl: string,
  errItem: IProgressItem,
  errMsg: string,
  err: any
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
    mdData = fixMdImg(imgList, mdData, htmlData)
    // console.log('new', mdData)
  }

  // 有图片 且 未忽略图片
  if (imgList.length && !ignoreImg) {
    progressBar.pause()
    console.log('')
    const spinnerDiscardingStdin = ora({
      text: `下载 "${articleTitle}" 的图片中...`
    })
    spinnerDiscardingStdin.start()

    const { data, errorInfo } = await mdImg.run(mdData, {
      dist: savePath,
      imgDir: `./img/${uuid}`,
      isIgnoreConsole: true,
      errorStillReturn: true,
      referer: articleUrl || '',
      transform(url: string) {
        return captureImageURL(url, imageServiceDomains)
      }
    })
    mdData = data
    const stopProgress = () => {
      spinnerDiscardingStdin.stop()
      progressBar.continue()
    }
    if (errorInfo.length > 0) {
      // const e = errorInfo[0]
      const errMessage = `图片下载失败(失败的以远程链接保存): \n`
      let errMessageList = ''
      errorInfo.forEach((e, index) => {
        errMessageList = `${errMessageList} ———————— ${index+1}. ${e.error?.message}: ${e.url} \n`
      })
      // 图片下载 md文档按远程图片保存
      await writeFile(saveFilePath, handleMdData(mdData))
      stopProgress()
      throw new Error(`${errMessage}\n${errMessageList}`)
    }
    stopProgress()
  }

  function handleMdData (rawMdData: string): string {
    let mdData = rawMdData
    mdData = mdData.replace(/<br(\s?)\/>/gm, '\n')
    mdData = mdData.replace(/<a.*?>(\s*?)<\/a>/gm, '')

    const  header = articleTitle ? `# ${articleTitle}\n\n` : ''
    // toc 目录添加
    let toc = !options.ignoreToc ? mdToc(mdData).content : ''
    if (toc) toc = `${toc}\n\n---\n\n`

    const footer = articleUrl ? `\n\n> 原文: <${articleUrl}>` : ''

    mdData = `${header}${toc}${mdData}${footer}`
    return mdData
  }

  try {
    await writeFile(saveFilePath, handleMdData(mdData))
    return true
  } catch(e) {
    throw new Error(`download article Error ${articleUrl}: ${e.message}`)
  }
}

// 现发现 latex svg格式可以正常下载 正常显示，非svg 不能 直接那search的文案替换掉
// ![](https://cdn.nlark.com/yuque/__latex/a6cc75c5bd5731c6e361bbcaf18766e7.svg#card=math&code=999&id=JGAwA)
// "https://g.yuque.com/gr/latex?options['where'] 是否是数组，#card=math&code=options['where'] 是否是数组，"
function fixLatex(mdData: string) {
  const latexReg =  /!\[(.*?)\]\((http.*?latex.*?)\)/gm
  const list = mdData.match(latexReg)
  let fixMaData = mdData
  const rawMaData = mdData
  try {
    list?.forEach(latexMd => {
      latexReg.lastIndex = 0
      const url = latexReg.exec(latexMd)?.[2] || ''
      const {pathname, search} = new URL(url)
      const isSvg = pathname.endsWith('.svg')
      // 非svg结尾的 latex链接  直接显示code内容
      if (!isSvg && search) {
        const data = decodeURIComponent(search)
        fixMaData = fixMaData.replace(latexMd, data.slice(1))
      }
    })
  } catch (e) {
    return rawMaData
  }

  return fixMaData
}

// 根据html接口返回的图片修复 md接口返回的图片 url
function fixMdImg(imgList: string[], mdData: string, htmlData: string) {
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
  imgList.forEach((imgUrl) => {
    const {origin, pathname} = new URL(imgUrl)
    const matchURL = `${origin}${pathname}`
    const targetURL = htmlImgDataList.find(item => {
      const reg = new RegExp(`${matchURL}.*?`)
      return reg.test(item)
    })
    if (targetURL) {
      mdData = mdData.replace(imgUrl, targetURL)
    }
  })
  return mdData
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
  options: IOptions,
  imageServiceDomains?: string[]
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
    options,
    imageServiceDomains = []
  } = params
  let errArticleCount = 0
  let totalArticleCount = 0
  let warnArticleCount = 0
  const errArticleInfo: IErrArticleInfo[] = []
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
      mdPath = [...preItem.pathTitleList, fileName, `index.md`].map(fixPath).join('/')
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
        ignoreImg: options.ignoreImg,
        host,
        imageServiceDomains
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
  const progressBar = new ProgressBar(bookPath, total)
  await progressBar.init()

  if (progressBar.curr === total) {
    if (progressBar.bar) progressBar.bar.stop()
    logger.info(`√ 已完成: ${bookPath}`)
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
  logger.info(`√ 生成目录 ${path.resolve(bookPath, 'SUMMARY.md')}`)

  if (progressBar.curr === total) {
    logger.info(`√ 已完成: ${bookPath}`)
  }
  process.exit(0)
}

export {
  downloadArticle,
  main
}