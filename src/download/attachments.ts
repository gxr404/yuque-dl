import { stdout, env } from 'node:process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import ora from 'ora'

import { downloadFile } from './common'
import { getConfig } from '../config'

const mdUrlReg = /\[(.*?)\]\((.*?)\)/g

interface IDownloadAttachments {
  mdData: string
  savePath: string
  attachmentsDir: string
  articleTitle: string
}

interface IAttachmentsItem {
  fileName: string
  url: string
  rawMd: string
  currentFilePath: string
}

export const getAttachmentRegexp = () => {
  const { secondDomain } = getConfig()
  const domainReg = secondDomain.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
  return new RegExp(
    `\\[(.*?)\\]\\((.*?\\.(yuque\\.com|${domainReg})\\/attachments.*?)\\)`,
  )
}

export async function downloadAttachments(params: IDownloadAttachments) {
  const { mdData, savePath, attachmentsDir, articleTitle } = params
  const AttachmentsReg = getAttachmentRegexp()

  const attachmentsList = (mdData.match(mdUrlReg) || []).filter((item) => {
    return AttachmentsReg.test(item)
  })

  // 无附件
  if (attachmentsList.length === 0) {
    return {
      mdData,
    }
  }

  const spinner = ora({
    text: `下载 "${articleTitle}" 的附件中...`,
    stream: stdout,
  })

  if (env.NODE_ENV !== 'test') {
    spinner.start()
  }

  const attachmentsDirPath = path.resolve(savePath, attachmentsDir)

  const attachmentsDataList = attachmentsList
    .map((item) => parseAttachments(item, attachmentsDirPath))
    .filter((item) => item !== false) as IAttachmentsItem[]

  // 创建文件夹
  mkdirSync(attachmentsDirPath, { recursive: true })
  const promiseList = attachmentsDataList.map((item) => {
    return downloadFile({
      fileUrl: item.url,
      savePath: item.currentFilePath,
      fileName: item.fileName,
    })
  })
  const downloadFileInfo = await Promise.all(promiseList).finally(spinnerStop)

  let resMdData = mdData
  downloadFileInfo.forEach((info) => {
    const replaceInfo = attachmentsDataList.find(
      (item) => item.url === info.fileUrl,
    )
    if (replaceInfo) {
      const replaceData = `[附件: ${replaceInfo.fileName}](${attachmentsDir}/${replaceInfo.fileName})`
      resMdData = resMdData.replace(replaceInfo.rawMd, replaceData)
    }
  })

  function spinnerStop() {
    if (spinner) spinner.stop()
  }
  return {
    mdData: resMdData,
  }
}

function parseAttachments(
  mdData: string,
  attachmentsDirPath: string,
): IAttachmentsItem | false {
  const AttachmentsReg = getAttachmentRegexp()
  const [, rawFileName, url] = AttachmentsReg.exec(mdData) || []
  if (!url) return false
  const fileName = rawFileName || url.split('/').at(-1)
  if (!fileName) return false
  const currentFilePath = path.join(attachmentsDirPath, fileName)
  return {
    fileName,
    url,
    rawMd: mdData,
    currentFilePath,
  }
}
