
import { readFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { cac } from 'cac'
import semver from 'semver'

import { main } from './index'
import { logger, isValidUrl, ProgressBar } from './utils'
import { runServer } from './server'
import { getDocInfoFromUrl } from './api'
import { downloadArticle } from './download/article'
import { fixPath } from './parse/fix'

import type { CACHelpSection, ICliOptions, IServerCliOptions, IProgressItem } from './types'

const cli = cac('yuque-dl')

// 不能直接使用 import {version} from '../package.json'
// 否则declaration 生成的d.ts 会多一层src目录
const { version, engines } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url)).toString(),
)

function checkVersion() {
  const version = engines.node
  if (!semver.satisfies(process.version, version)) {
    logger.error(`✕ nodejs 版本需 ${version}, 当前版本为 ${process.version}`)
    process.exit(1)
  }
}

// 检查node版本
checkVersion()

cli
  .command('<url>', '语雀知识库url')
  .option('-d, --distDir <dir>', '下载的目录{CUSTOM_NEW_LINE(eg: -d download)}', {
    default: 'download',
  })
  .option('-i, --ignoreImg', '忽略图片不下载', {
    default: false
  })
  .option('--ignoreAttachments [fileExtension]','忽略附件, 可选带上忽略的附件文件后缀(多种后缀逗号分割){CUSTOM_NEW_LINE(eg: --ignoreAttachments mp4,pdf // 忽略后缀名mp4,pdf的附件)}{CUSTOM_NEW_LINE(eg: --ignoreAttachments // 忽略所有附件)}', {
    default: false
  })
  .option('-k, --key <key>', '语雀的cookie key， 默认是 "_yuque_session"， 在某些企业版本中 key 不一样')
  .option('-t, --token <token>', '语雀的cookie key 对应的值')
  .option('--toc', '是否输出文档toc目录', {
    default: false
  })
  .option('--incremental', '开启增量下载[初次下载加不加该参数没区别]', {
    default: false
  })
  .option('--convertMarkdownVideoLinks', '转化markdown视频链接为video标签', {
    default: false
  })
  .option('--hideFooter', '是否禁用页脚显示[更新时间、原文地址...]', {
    default: false
  })
  .option('--docs <urls...>', '下载单个或多个文档{CUSTOM_NEW_LINE(eg: --docs "url1" "url2")}')
  .action(async (url: string, options: ICliOptions & { docs?: string[] }) => {
    try {
      // 如果提供了 --docs 参数，则下载指定文档
      if (options.docs && options.docs.length > 0) {
        await downloadDocsFromUrls(options.docs, options)
      } else {
        // 否则按原有逻辑下载整个知识库
        await main(url, options)
      }
      process.exit(0)
    } catch (err) {
      logger.error(err.message || 'unknown exception')
      process.exit(1)
    }
  })

async function downloadDocsFromUrls(urls: string[], options: ICliOptions) {
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

  const progressBar = new ProgressBar(distPath, total, false)
  await progressBar.init()

  let successCount = 0
  let failCount = 0
  const failedDocs: Array<{ url: string; error: string }> = []

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
      successCount += 1
      logger.info(`√ 已完成: ${saveFilePath}`)
    } catch (e) {
      if (progressItem) {
        await progressBar.updateProgress(progressItem, false)
      }
      failCount += 1
      const errorMsg = e.message || 'unknown error'
      failedDocs.push({ url, error: errorMsg })
      logger.error(`✕ 下载失败: ${url}`)
      logger.error(`———— ${errorMsg}`)
    }
  }

  if (progressBar.bar) progressBar.bar.stop()

  // 输出总结
  logger.info(`\n下载完成: 成功 ${successCount}/${total}`)
  if (failCount > 0) {
    logger.error(`失败 ${failCount}/${total}:`)
    failedDocs.forEach(({ url, error }) => {
      logger.error(`———— ${url}: ${error}`)
    })
  }
}

cli
  .command('server <serverPath>', '启动web服务')
  .option('-p, --port <port>', ' --port 1234', {
    default: 5173,
  })
  .option('--host [host]', ' --host 0.0.0.0 或 --host', {
    default: 'localhost',
  })
  .option('--force', '强制重新生成.vitepress', {
    default: false,
  })
  .action(async (serverPath: string, options: IServerCliOptions) => {
    try {
      await runServer(serverPath, options)
    } catch (err) {
      logger.error(err.message || 'unknown exception')
      process.exit(1)
    }
  })

cli.help((sections: CACHelpSection[])=>{
  const optionsItem = sections.find(item => item.title === 'Options')
  if (optionsItem) {
    // 替换中文
    let optionBody = optionsItem?.body || ''
    optionBody = optionBody.replace(
      /^(\s*-h, --help\s*)(.*)$/gm,
      (_, group1) => `${group1}显示帮助信息`
    )
    optionBody = optionBody.replace(
      /^(\s*-v, --version\s*)(.*)$/gm,
      (_, group1) => `${group1}显示当前版本`
    )
    optionBody = optionBody.replace(/\(default:/gm, () => '(默认值:')

    // 自定义新行
    // {CUSTOM_NEW_LINE(context)}
    const newLineSpaceWidth = optionBody.match(/^(\s*-h, --help\s*)/gm)?.[0].length || 0
    optionBody = optionBody.replace(
      /\{CUSTOM_NEW_LINE\((.*?)\)\}/g,
      (_, group1) =>'\n'+`${''.padStart(newLineSpaceWidth, ' ')} └─ ${group1}`
    )

    optionsItem.body = optionBody
  }
})
cli.version(version)

try {
  cli.parse()
} catch (err) {
  logger.error(err.message || 'unknown exception')
  process.exit(1)
}
