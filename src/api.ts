import { env } from 'node:process'
import axios from 'axios'
import { randUserAgent } from './utils'
import { DEFAULT_DOMAIN } from './constant'
import { getConfig } from './config'

import type {
  ArticleResponse,
  KnowledgeBase,
  IReqHeader,
  TGetKnowledgeBaseInfo,
  TGetMdData,
} from './types'
import type { AxiosRequestConfig } from 'axios'

function getHeaders(): IReqHeader {
  const { key, token, url, ctoken } = getConfig()
  const headers: IReqHeader = {
    'user-agent': randUserAgent({
      browser: 'chrome',
      device: 'desktop',
    }),
    referer: url,
  }
  if (ctoken) headers['x-csrf-token'] = ctoken
  if (token) headers.cookie = `${key}=${token};`
  return headers
}

export function genCommonOptions(): AxiosRequestConfig {
  const config: AxiosRequestConfig = {
    headers: getHeaders(),
    beforeRedirect: (options) => {
      // 语雀免费非企业空间会重定向如: www.yuque.com -> gxr404.yuque.com
      // 此时axios自动重定向并不会带上cookie
      options.headers = {
        ...(options?.headers || {}),
        ...getHeaders(),
      }
    },
  }
  if (env.NODE_ENV === 'test') {
    config.proxy = false
  }
  return config
}

/** 获取知识库数据信息 */
export const getKnowledgeBaseInfo: TGetKnowledgeBaseInfo = (url) => {
  const knowledgeBaseReg = /decodeURIComponent\("(.+)"\)\);/m
  return axios
    .get<string>(url, genCommonOptions())
    .then(({ data = '', status }) => {
      if (status === 200) return data
      return ''
    })
    .then((html) => {
      const data = knowledgeBaseReg.exec(html) ?? ''
      if (!data[1]) return {}
      const jsonData: KnowledgeBase.Response = JSON.parse(
        decodeURIComponent(data[1]),
      )
      if (!jsonData.book) return {}
      const info = {
        bookId: jsonData.book.id,
        bookSlug: jsonData.book.slug,
        tocList: jsonData.book.toc || [],
        bookName: jsonData.book.name || '',
        bookDesc: jsonData.book.description || '',
        host: jsonData.defaultSpaceHost || DEFAULT_DOMAIN,
        imageServiceDomains: jsonData.imageServiceDomains || [],
      }
      return info
    })
    .catch((e) => {
      // console.log(e.message)
      const errMsg = e?.message ?? ''
      if (!errMsg) throw new Error('unknown error')
      const netErrInfoList = [
        'getaddrinfo ENOTFOUND',
        'read ECONNRESET',
        'Client network socket disconnected before secure TLS connection was established',
      ]
      const isNetError = netErrInfoList.some((netErrMsg) =>
        errMsg.startsWith(netErrMsg),
      )
      if (isNetError) {
        throw new Error('请检查网络(是否正常联网/是否开启了代理软件)')
      }
      throw new Error(errMsg)
    })
}

export const getDocsMdData: TGetMdData = (params, isMd = true) => {
  const { articleUrl, bookId } = params
  const { host } = getConfig()
  let apiUrl = `${host}/api/docs/${articleUrl}`
  const queryParams: any = {
    book_id: String(bookId),
    merge_dynamic_data: String(false),
    // plain=false
    // linebreak=true
    // anchor=true
  }
  if (isMd) queryParams.mode = 'markdown'
  const query = new URLSearchParams(queryParams).toString()
  apiUrl = `${apiUrl}?${query}`
  return axios
    .get<ArticleResponse.RootObject>(apiUrl, genCommonOptions())
    .then(({ data, status }) => {
      const res = {
        apiUrl,
        httpStatus: status,
        response: data,
      }
      return res
    })
}

export const getLakeFileExportUrl = ({
  id,
  type,
}: {
  id: number
  type: string
}) => {
  const { host } = getConfig()
  return axios
    .post(
      `${host}/api/docs/${id}/export`,
      {
        force: 0,
        type,
      },
      {
        ...genCommonOptions(),
      },
    )
    .then(({ data }) => {
      return data.data
    })
    .catch((e) => {
      throw new Error(`get file export url fail: ${e}`)
    })
}
