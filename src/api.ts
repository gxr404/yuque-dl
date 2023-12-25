import axios from 'axios'
import { randUserAgent } from './utils'

import type { ArticleResponse } from './types/ArticleResponse'
import type { KnowledgeBase } from './types/KnowledgeBaseResponse'


interface IKnowledgeBaseInfo {
  bookId?: number
  bookSlug?: string
  tocList?: KnowledgeBase.Toc[],
  bookName?: string,
  bookDesc?: string
}

interface IReqHeader {
  [key: string]: string
}

function getHeaders(token?: string) :IReqHeader {
  const headers: IReqHeader = {
    "user-agent": randUserAgent({
      browser: 'chrome',
      device: "desktop"
    })
  }
  if (token) headers.cookie = `_yuque_session=${token}`
  return headers
}

type TGetKnowledgeBaseInfo = (url: string, token?: string) => Promise<IKnowledgeBaseInfo>
/** 获取知识库数据信息 */
export const getKnowledgeBaseInfo: TGetKnowledgeBaseInfo = (url, token) => {
  const knowledgeBaseReg = /decodeURIComponent\("(.+)"\)\);/m
  return axios.get<string>(url, {
    headers: getHeaders(token)
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
    }
    return info
  })
}

interface GetMdDataParams {
  articleUrl: string,
  bookId: number,
  token?: string
}
interface IGetDocsMdDataRes {
  apiUrl: string,
  httpStatus: number,
  response?: ArticleResponse.RootObject
}
type TGetMdData = (params: GetMdDataParams) => Promise<IGetDocsMdDataRes>
export const getDocsMdData: TGetMdData = (params) => {
  const { articleUrl, bookId, token } = params
  let apiUrl = `https://www.yuque.com/api/docs/${articleUrl}`
  const queryParams = {
    'book_id': String(bookId),
    'merge_dynamic_data': String(false),
    mode: 'markdown'
  }
  const query = new URLSearchParams(queryParams).toString()
  apiUrl = `${apiUrl}?${query}`
  return axios.get<ArticleResponse.RootObject>(apiUrl, {
    headers: getHeaders(token),
  }).then(({data, status}) => {
    const res = {
      apiUrl,
      httpStatus: status,
      response: data
    }
    return res
  })
}
