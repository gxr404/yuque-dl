import axios from 'axios'
import { randUserAgent } from './utils'

import type { ArticleResponse } from './types/ArticleResponse'
import type { KnowledgeBase } from './types/KnowledgeBaseResponse'
import { DEFAULT_COOKIE_KEY, DEFAULT_DOMAIN } from './constant'


interface IKnowledgeBaseInfo {
  bookId?: number
  bookSlug?: string
  tocList?: KnowledgeBase.Toc[],
  bookName?: string,
  bookDesc?: string,
  host?: string
}

interface IReqHeader {
  [key: string]: string
}

interface GetHeaderParams {
  key?:string,
  token?: string
}
function getHeaders(params: GetHeaderParams): IReqHeader {
  const { key = DEFAULT_COOKIE_KEY, token } = params
  const headers: IReqHeader = {
    "user-agent": randUserAgent({
      browser: 'chrome',
      device: "desktop"
    })
  }
  if (token) headers.cookie = `${key}=${token};`
  return headers
}

interface CookieInfo {
  key?:string,
  token?: string
}

type TGetKnowledgeBaseInfo = (url: string, {key, token}: CookieInfo) => Promise<IKnowledgeBaseInfo>
/** 获取知识库数据信息 */
export const getKnowledgeBaseInfo: TGetKnowledgeBaseInfo = (url, {key, token}) => {
  const knowledgeBaseReg = /decodeURIComponent\("(.+)"\)\);/m
  return axios.get<string>(url, {
    headers: getHeaders({key, token})
  }).then(({data = '', status}) => {
    if (status === 200) return data
    return ''
  }).then(html => {
    const data = knowledgeBaseReg.exec(html) ?? ''
    if (!data[1]) return {}
    const jsonData: KnowledgeBase.Response = JSON.parse(decodeURIComponent(data[1]))
    if (!jsonData.book) return {}
    const info = {
      bookId: jsonData.book.id,
      bookSlug: jsonData.book.slug,
      tocList: jsonData.book.toc || [],
      bookName: jsonData.book.name || '',
      bookDesc: jsonData.book.description || '',
      host: jsonData.space?.host || DEFAULT_DOMAIN,
    }
    return info
  })
}

interface GetMdDataParams {
  articleUrl: string,
  bookId: number,
  host?: string
  token?: string,
  key?: string
}
interface IGetDocsMdDataRes {
  apiUrl: string,
  httpStatus: number,
  response?: ArticleResponse.RootObject
}
type TGetMdData = (params: GetMdDataParams) => Promise<IGetDocsMdDataRes>
export const getDocsMdData: TGetMdData = (params) => {
  const { articleUrl, bookId, token, key, host = DEFAULT_DOMAIN } = params
  let apiUrl = `${host}/api/docs/${articleUrl}`
  const queryParams = {
    'book_id': String(bookId),
    'merge_dynamic_data': String(false),
    mode: 'markdown'
  }
  const query = new URLSearchParams(queryParams).toString()
  apiUrl = `${apiUrl}?${query}`
  return axios.get<ArticleResponse.RootObject>(apiUrl, {
    headers: getHeaders({token, key}),
  }).then(({data, status}) => {
    const res = {
      apiUrl,
      httpStatus: status,
      response: data
    }
    return res
  })
}
