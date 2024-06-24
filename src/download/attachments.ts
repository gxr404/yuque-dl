import * as stream from 'node:stream'
import { promisify } from 'node:util'
import { stdout, env } from "node:process"
import { createWriteStream, mkdirSync } from 'node:fs'
import path from 'node:path'
import ora from "ora"
import axios from 'axios'

import { genCommonOptions } from '../api'

const AttachmentsReg = /\[(.*?)\]\((.*?\.yuque\.com\/attachments.*?)\)/g

interface IDownloadDownloadAttachments {
  mdData: string
  savePath: string
  attachmentsDir: string
  articleTitle: string
  token?: string
  key?: string
}

interface IAttachmentsItem {
  fileName: string
  url: string
  rawMd: string
  currentFilePath: string
}

interface IDownloadFileParams {
  fileUrl: string,
  savePath: string,
  token?: string
  key?: string
}

export async function downloadAttachments(params: IDownloadDownloadAttachments) {
  const {
    mdData,
    savePath,
    attachmentsDir,
    articleTitle,
    token,
    key
  } = params
  const attachmentsList = mdData.match(AttachmentsReg) || []

  // 无附件
  if (attachmentsList.length === 0) {
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

  const attachmentsDirPath = path.resolve(savePath, attachmentsDir)

  const attachmentsDataList = attachmentsList
    .map(item => parseAttachments(item, attachmentsDirPath))
    .filter(item => item !== false) as IAttachmentsItem[]

  // 创建文件夹
  mkdirSync(attachmentsDirPath, { recursive: true })

  const promiseList = attachmentsDataList.map((item) => {
    return downloadFile({
      fileUrl: item.url,
      savePath: item.currentFilePath,
      token,
      key
    })
  })
  const downloadFileInfo = await Promise.all(promiseList)

  let resMdData = mdData
  downloadFileInfo.forEach(info => {
    const replaceInfo = attachmentsDataList.find(item => item.url === info.fileUrl)
    if (replaceInfo) {
      const replaceData = `[附件: ${replaceInfo.fileName}](${attachmentsDir}/${replaceInfo.fileName})`
      resMdData = resMdData.replace(replaceInfo.rawMd, replaceData)
    }
  })

  if (spinner) spinner.stop()

  return {
    mdData: resMdData
  }
}

function parseAttachments(mdData: string, attachmentsDirPath: string): IAttachmentsItem | false {
  AttachmentsReg.lastIndex = 0
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

const finished = promisify(stream.finished)
export async function downloadFile(params: IDownloadFileParams) {
  const {fileUrl, savePath, token, key} = params
  return axios.get(fileUrl, {
    ...genCommonOptions({token, key}),
    responseType: 'stream'
  }).then(async response => {
    if (response.status === 200) {
      const writer = createWriteStream(savePath)
      response.data.pipe(writer)
      return finished(writer)
        .then(() => ({
          fileUrl,
          savePath
        }))
    }
    throw new Error(`response status ${response.status}`)
  })
}