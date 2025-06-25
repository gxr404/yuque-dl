import { stdout, env } from 'node:process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import ora from 'ora'

import { downloadFile } from './common'
import type { Attachments } from '../types/Attachments'

const mdUrlReg = /\[(.*?)\]\((.*?)\)/g
const AttachmentsReg = /\[(.*?)\]\((.*?\.yuque\.com\/attachments.*?)\)/

export async function downloadAttachments(params: Attachments.IDownloadAttachments) {
  const {
    mdData,
    savePath,
    attachmentsDir,
    articleTitle,
    token,
    key,
    ignoreAttachments
  } = params

  const attachmentsList = (mdData.match(mdUrlReg) || []).filter(item => AttachmentsReg.test(item))
  // 无附件
  if (attachmentsList.length === 0) {
    return {
      mdData
    }
  }

  const attachmentsDirPath = path.resolve(savePath, attachmentsDir)
  let attachmentsDataList = attachmentsList
    .map(item => parseAttachments(item, attachmentsDirPath))
    .filter(item => item !== false) as Attachments.IAttachmentsItem[]

  // 指定忽略附件后缀名
  if (typeof ignoreAttachments === 'string') {
    const ingoreExtList = ignoreAttachments.split(',')
    attachmentsDataList = attachmentsDataList.filter((item) => {
      const extIndex = item.url.lastIndexOf('.')
      if (extIndex === -1) return true
      const currentExt = item.url.slice(extIndex+1)
      return !ingoreExtList.find(ext => ext === currentExt)
    })
  }

  // 过滤掉忽略的附件后缀后 无附件
  if (attachmentsDataList.length === 0) {
    return {
      mdData
    }
  }

  const spinner = ora({
    text: `下载 "${articleTitle}" 的附件中...`,
    stream: stdout
  })

  if (env.NODE_ENV !== 'test') {
    spinner.start()
  }

  // 创建文件夹
  mkdirSync(attachmentsDirPath, { recursive: true })
  const promiseList = attachmentsDataList.map((item) => {
    return downloadFile({
      fileUrl: item.url,
      savePath: item.currentFilePath,
      token,
      key,
      fileName: item.fileName
    })
  })
  const downloadFileInfo = await Promise.all(promiseList).finally(spinnerStop)

  let resMdData = mdData
  downloadFileInfo.forEach(info => {
    const replaceInfo = attachmentsDataList.find(item => item.url === info.fileUrl)
    if (replaceInfo) {
      const replaceData = `[附件: ${replaceInfo.fileName}](${attachmentsDir}/${replaceInfo.fileName})`
      resMdData = resMdData.replace(replaceInfo.rawMd, replaceData)
    }
  })

  function spinnerStop() {
    if (spinner) spinner.stop()
  }
  return {
    mdData: resMdData
  }
}

function parseAttachments(mdData: string, attachmentsDirPath: string): Attachments.IAttachmentsItem | false {
  const [, rawFileName, url] = AttachmentsReg.exec(mdData) || []
  if (!url) return false
  const fileName = rawFileName || url.split('/').at(-1)
  if (!fileName) return false
  const currentFilePath = path.join(attachmentsDirPath, fileName)
  return {
    fileName,
    url,
    rawMd: mdData,
    currentFilePath
  }
}
