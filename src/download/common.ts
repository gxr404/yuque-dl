import * as stream from 'node:stream'
import { promisify } from 'node:util'
import { createWriteStream } from 'node:fs'
import axios from 'axios'

import { genCommonOptions, getLakeFileExportUrl } from '../api'
import { LakeType } from '../types'

interface IDownloadFileParams {
  fileUrl: string
  savePath: string
  fileName: string
}

const finished = promisify(stream.finished)
export async function downloadFile(params: IDownloadFileParams) {
  const { fileUrl, savePath, fileName } = params
  return axios
    .get(fileUrl, {
      ...genCommonOptions(),
      responseType: 'stream',
    })
    .then(async (response) => {
      if (response.request?.path?.startsWith('/login')) {
        throw new Error(`"${fileName}" need token`)
      } else if (response.status === 200) {
        const writer = createWriteStream(savePath)
        response.data?.pipe(writer)
        return finished(writer).then(() => ({
          fileUrl,
          savePath,
        }))
      }
      throw new Error(`response status ${response.status}`)
    })
}

type exportLakeFileProps = {
  id: number
  type: LakeType
  articleTitle: string
  savePath: string
}

export const exportLakeFile = async ({
  id,
  type,
  articleTitle,
  savePath,
}: exportLakeFileProps) => {
  try {
    const data = await getLakeFileExportUrl({
      id,
      type,
    })
    if (data.url) {
      await downloadFile({
        fileUrl: data.url,
        fileName: `${articleTitle}.${type}`,
        savePath: `${savePath}/${articleTitle}.${type}`,
      })
    }
  } catch (e) {
    throw new Error(`export board Error: ${e}`)
  }
}
