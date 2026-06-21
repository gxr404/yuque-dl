import * as stream from 'node:stream'
import { promisify } from 'node:util'
import { createWriteStream } from 'node:fs'
import axios from 'axios'

import { genCommonOptions } from '../api'

interface IDownloadFileParams {
  fileUrl: string,
  savePath: string,
  token?: string
  key?: string,
  fileName: string
}

const finished = promisify(stream.finished)
export async function downloadFile(params: IDownloadFileParams) {
  const {fileUrl, savePath, token, key, fileName} = params
  return axios.get(fileUrl, {
    ...genCommonOptions({token, key}),
    responseType: 'stream'
  }).then(async response => {
    if (response.request?.path?.startsWith('/login')) {
      throw new Error(`"${fileName}" need token`)
    } else if (response.status === 200) {
      const writer = createWriteStream(savePath)
      response.data?.pipe(writer)
      return finished(writer)
        .then(() => ({
          fileUrl,
          savePath
        }))
    }
    throw new Error(`response status ${response.status}`)
  })
}
