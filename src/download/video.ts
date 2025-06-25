import { stdout, env } from 'node:process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import ora from 'ora'
import axios from 'axios'

import { genCommonOptions } from '../api'
import { getAst, getLinkList, ILinkItem, toMd } from '../parse/ast'
import { downloadFile } from './common'
import type { Video } from '../types/Video'


export async function downloadVideo(params: Video.IDownloadVideo) {
  const {
    mdData,
    htmlData,
    savePath,
    attachmentsDir,
    articleTitle,
    token,
    key,
    ignoreAttachments
  } = params
  const astTree = getAst(mdData)
  const linkList = getLinkList(astTree)
  let videoLinkList = linkList.filter(link => /_lake_card.*?videoId/.test(link.node.url))
  let htmlAudioLinkList = getVideoList(htmlData, 'audio')
  let htmlVideoLinkList = getVideoList(htmlData, 'video')

  // 无音视频
  if (
    videoLinkList.length === 0 &&
    htmlAudioLinkList.length === 0 &&
    htmlVideoLinkList.length === 0
  ) {
    return { mdData }
  }

  // 指定忽略附件后缀名
  if (typeof ignoreAttachments === 'string') {
    const ingoreExtList = ignoreAttachments.split(',')
    videoLinkList = videoLinkList.filter(link => {
      const nodeUrl = link.node.url
      const extIndex = nodeUrl.lastIndexOf('.')
      if (extIndex === -1) return true
      const currentExt = nodeUrl.slice(extIndex + 1)
      return !ingoreExtList.find(ext => ext === currentExt)
    })
    htmlAudioLinkList = htmlAudioLinkList.filter((item) => {
      const extIndex = item.audioId.lastIndexOf('.')
      if (extIndex === -1) return true
      const currentExt = item.audioId.slice(extIndex + 1)
      return !ingoreExtList.find(ext => ext === currentExt)
    })
    htmlVideoLinkList = htmlVideoLinkList.filter((item) => {
      const extIndex = item.videoId.lastIndexOf('.')
      if (extIndex === -1) return true
      const currentExt = item.videoId.slice(extIndex + 1)
      return !ingoreExtList.find(ext => ext === currentExt)
    })
    if (
      videoLinkList.length === 0 &&
      htmlAudioLinkList.length === 0 &&
      htmlVideoLinkList.length === 0
    ) {
      return { mdData }
    }
  }

  const spinner = ora({
    text: `下载 "${articleTitle}" 的音视频中...`,
    stream: stdout
  })


  if (env.NODE_ENV !== 'test') {
    spinner.start()
  }

  // 创建文件夹
  const attachmentsDirPath = path.resolve(savePath, attachmentsDir)
  mkdirSync(attachmentsDirPath, { recursive: true })

  let resMdData = mdData

  try {
    // markdown数据中的 视频
    if (videoLinkList.length > 0) {
      const realVideoList = await getRealVideoInfo(videoLinkList, params, attachmentsDirPath)
      const promiseList = realVideoList.map((item) => {
        const dlFileParams = {
          fileUrl: item.videoInfo.video,
          savePath: item.currentFilePath,
          token,
          key,
          fileName: item.videoInfo.name
        }
        return downloadFile(dlFileParams)
      })
      const downloadFileInfo = await Promise.all(promiseList)

      downloadFileInfo.forEach(info => {
        const replaceInfo = realVideoList.find(item => item.videoInfo.video === info.fileUrl)
        if (replaceInfo) {
          // TODO: 这里直接更改了ast 还需考虑
          replaceInfo.astNode.node.url = `${attachmentsDir}${path.sep}${replaceInfo.fileName}`
          replaceInfo.astNode.node.children = [
            {
              'type': 'text',
              'value': `音视频附件: ${replaceInfo.videoInfo.name}`,
            }
          ]
        }
      })
      resMdData = toMd(astTree)
    }

    // html中的 音频 视频
    if (htmlAudioLinkList.length > 0 || htmlVideoLinkList.length > 0) {
      const realAudioList = await getRealHtmlVudioInfo(htmlAudioLinkList, params, attachmentsDirPath, 'audio')
      const realVideoList = await getRealHtmlVudioInfo(htmlVideoLinkList, params, attachmentsDirPath, 'video')
      const allList = [
        ...realAudioList,
        ...realVideoList
      ]

      const promiseList = allList.map(async (item) => {
        const fileName =  item.type === 'audio' ? item.videoInfo.fileName :  item.videoInfo.name
        const dlFileParams = {
          fileUrl: item.type === 'audio' ? item.videoInfo.audio : item.videoInfo.video,
          savePath: item.currentFilePath,
          token,
          key,
          fileName
        }
        return {
          ...(await downloadFile(dlFileParams)),
          id: item.videoInfo.id,
          fileName
        }
      })
      const downloadFileInfo = await Promise.all(promiseList)

      downloadFileInfo.forEach(info => {
        const astLinkNode = linkList.find(link => new RegExp(`#${info.id}`,'gm').test(link.node.url))
        if (astLinkNode) {
          // TODO: 这里直接更改了ast 还需考虑
          astLinkNode.node.url = `${attachmentsDir}${path.sep}${info.fileName}`
          astLinkNode.node.children = [
            {
              'type': 'text',
              'value': `音视频附件: ${info.fileName}`,
            }
          ]
        }
      })
      resMdData = toMd(astTree)
    }

  } finally {
    spinnerStop()
  }

  function spinnerStop() {
    if (spinner) spinner.stop()
  }
  return {
    mdData: resMdData
  }

}

// https://www.yuque.com/laoge776/ahq486/msa2ntf95o1646xw?_lake_card=%7B%22status%22%3A%22done%22%2C%22name%22%3A%22%E6%B5%8B%E8%AF%95%E7%94%A8%E8%A7%86%E9%A2%91.mp4%22%2C%22size%22%3A18058559%2C%22taskId%22%3A%22u0b9ed581-9b65-4f26-8a3d-6a583b056d3%22%2C%22taskType%22%3A%22upload%22%2C%22url%22%3Anull%2C%22cover%22%3Anull%2C%22videoId%22%3A%22inputs%2Fprod%2Fyuque%2F2024%2F43922322%2Fmp4%2F1723723211560-602e1f77-e869-4e89-9388-00d10e2fa782.mp4%22%2C%22download%22%3Afalse%2C%22__spacing%22%3A%22both%22%2C%22id%22%3A%22DuH55%22%2C%22margin%22%3A%7B%22top%22%3Atrue%2C%22bottom%22%3Atrue%7D%2C%22card%22%3A%22video%22%7D#DuH55
// to
// {"status":"done","name":"测试用视频.mp4","size":18058559,"taskId":"u0b9ed581-9b65-4f26-8a3d-6a583b056d3","taskType":"upload","url":null,"cover":null,"videoId":"inputs/prod/yuque/2024/43922322/mp4/1723723211560-602e1f77-e869-4e89-9388-00d10e2fa782.mp4","download":false,"__spacing":"both","id":"DuH55","margin":{"top":true,"bottom":true},"card":"video"}
// { videoId: xxx }

function perParseVideoInfo(url: string) {
  try {
    const urlObj = new URL(url)
    const encodeData = urlObj.searchParams.get('_lake_card') ?? ''
    const dataStr = decodeURIComponent(encodeData)
    const data = JSON.parse(dataStr)
    return {
      name: data?.name as string || '',
      videoId: data?.videoId as string || ''
    }
  } catch (e) {
    return false
  }
}

function getVideoApi(params: Video.IGetVideoApiParams) {
  let apiUrl = 'https://www.yuque.com/api/video'
  const { videoId, token, key } = params
  const searchParams = new URLSearchParams()
  searchParams.set('video_id', videoId)
  apiUrl = `${apiUrl}?${searchParams.toString()}`
  return axios
    .get<Video.IGetVideoApiResponse>(apiUrl, genCommonOptions({token, key}))
    .then(({data, status}) => {
      const res = data.data
      if (status === 200 && res.status === 'success') {
        return res.info
      }
      return false as const
    }).catch(() => {
      // console.log(e)
      return false as const
    })
}

async function getRealVideoInfo(
  videoLinkList: ILinkItem[],
  downloadVideoParams: Video.IDownloadVideo,
  attachmentsDirPath: string
) {
  const {key, token} = downloadVideoParams
  const parseVideoInfoPromiseList = videoLinkList.map(async link => {
    const videoInfo = perParseVideoInfo(link.node.url)
    if (!videoInfo) return false
    const res = await getVideoApi({
      videoId: videoInfo.videoId,
      key,
      token
    })
    if (!res) return false
    const fileName =  videoInfo.name ?? videoInfo.videoId.split('/').at(-1) ?? videoInfo.videoId
    return {
      videoInfo: {
        ...videoInfo,
        ...res
      },
      astNode: link,
      fileName,
      currentFilePath: path.join(attachmentsDirPath, fileName)
    }
  })
  const parseVideoInfoList = await Promise.all(parseVideoInfoPromiseList)
  const realVideoInfoList = parseVideoInfoList.filter(truthy)
  return realVideoInfoList
}

type Truthy<T> = T extends false | '' | 0 | null | undefined ? never : T; // from lodash

function truthy<T>(value: T): value is Truthy<T> {
  return !!value
}

const audioReg = /name="audio" value="data:(.*?audioId.*?)".*?><\/card>/gm
const videoReg = /name="video" value="data:(.*?videoId.*?)".*?><\/card>/gm

function getVideoList(htmlData: string, type: 'video' | 'audio'): Video.IGetVideoItem[] {
  const reg = type === 'video' ? videoReg : audioReg
  const list = htmlData.match(reg) || []
  try {
    const audioList = list
      .map(item => item.replace(reg, '$1'))
      .map(item => JSON.parse(decodeURIComponent(item)))
    return audioList as Video.IGetVideoItem[]
  } catch (e) {
    return []
  }
}

async function getRealHtmlVudioInfo(
  videoLinkList: Video.IGetVideoItem[],
  downloadVideoParams: Video.IDownloadVideo,
  attachmentsDirPath: string,
  type: 'video' | 'audio'
) {
  const {key, token} = downloadVideoParams
  const parseVideoInfoPromiseList = videoLinkList.map(async videoItem => {

    const res = await getVideoApi({
      videoId: type === 'audio' ? videoItem.audioId : videoItem.videoId,
      key,
      token
    })
    if (!res) return false
    const fileName = (type === 'audio' ? videoItem?.fileName : videoItem.name) ?? videoItem.id
    return {
      videoInfo: {
        ...videoItem,
        ...res
      },
      type,
      fileName,
      currentFilePath: path.join(attachmentsDirPath, fileName)
    }
  })
  const parseVideoInfoList = await Promise.all(parseVideoInfoPromiseList)
  const realVideoInfoList = parseVideoInfoList.filter(truthy)
  return realVideoInfoList
}
