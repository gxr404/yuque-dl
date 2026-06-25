import { publicEncrypt, constants } from 'node:crypto'
import { env } from 'node:process'
import axios from 'axios'
import { parseSetCookie, randUserAgent } from './utils'
import {
  DEFAULT_COOKIE_KEY,
  DEFAULT_DOMAIN,
  PASSWORD_PUBLIC_KEY,
  VERIFIED_COOKIE_KEY_MAP
} from './constant'

import type {
  ArticleResponse,
  KnowledgeBase,
  GetHeaderParams,
  IReqHeader,
  TGetKnowledgeBaseInfo,
  TGetMdData,
  TGetDocInfoFromUrl
} from './types'
import type { AxiosRequestConfig } from 'axios'


type IYuqueAppData = Partial<KnowledgeBase.Response> & {
  timestamp?: number
  matchCondition?: {
    targetType?: keyof typeof VERIFIED_COOKIE_KEY_MAP
    needVerifyTargetId?: number
  }
}

function getHeaders(params: GetHeaderParams): IReqHeader {
  const { key = DEFAULT_COOKIE_KEY, token } = params
  const headers: IReqHeader = {
    'user-agent': randUserAgent({
      browser: 'chrome',
      device: 'desktop'
    })
  }
  if (token) headers.cookie = `${key}=${token};`
  return headers
}

export function genCommonOptions(params: GetHeaderParams): AxiosRequestConfig {
  const config: AxiosRequestConfig = {
    // 语雀免费非企业空间会重定向如: www.yuque.com -> gxr404.yuque.com
    // 此时axios自动重定向并不会带上cookie
    headers: getHeaders(params),
    beforeRedirect: (options) => {
      options.headers = {
        ...(options?.headers || {}),
        ...getHeaders(params)
      }
    }
  }
  if (env.NODE_ENV === 'test') {
    config.proxy = false
  }
  return config
}

function parseAppData(html: string): IYuqueAppData | undefined {
  const appDataReg = /decodeURIComponent\("(.+)"\)\);/m
  const data = appDataReg.exec(html) ?? ''
  if (!data[1]) return undefined
  return JSON.parse(decodeURIComponent(data[1]))
}


function encryptPassword(password: string, timestamp = Date.now()) {
  const serverTimeOffset = Date.now() - timestamp
  const passwordText = `${Date.now() - serverTimeOffset}:${password}`
  const chunks = passwordText.match(/.{1,100}/g) || []
  return chunks
    .map(chunk => publicEncrypt({
      key: PASSWORD_PUBLIC_KEY,
      padding: constants.RSA_PKCS1_PADDING
    }, Buffer.from(chunk)).toString('base64'))
    .join(':')
}

export async function verifyPublicPassword(
  url: string,
  password: string,
  headerParams: GetHeaderParams
) {
  const { html } = await getPageHtml(url, headerParams)
  const jsonData = parseAppData(html)
  const { targetType, needVerifyTargetId } = jsonData?.matchCondition || {}
  if (!targetType || !needVerifyTargetId) return false

  const verifiedCookieKey = VERIFIED_COOKIE_KEY_MAP[targetType]
  if (!verifiedCookieKey) return false

  const apiUrl = `${new URL(url).origin}/api/${targetType === 'Book' ? 'books' : 'docs'}/${needVerifyTargetId}/verify`
  const config = genCommonOptions(headerParams)
  if (!config.headers) {config.headers = {}}
  config.headers.referer = url
  const { headers: resHeaders } = await axios.put(apiUrl, {
    password: encryptPassword(password, jsonData?.timestamp)
  }, config)

  const cookieList = Reflect.get(resHeaders, 'set-cookie')
  // cookieList 可能是字符串也可能是数组
  if (!cookieList) return false
  if (Array.isArray(cookieList) && cookieList.length === 0) return false

  const verifiedCookie = Reflect.get(parseSetCookie(cookieList), verifiedCookieKey)
  return {
    key: verifiedCookieKey,
    token: verifiedCookie
  }
}

async function getPageHtml(url: string, headerParams: GetHeaderParams) {
  const { data = '', status, headers } = await axios.get<string>(url, genCommonOptions(headerParams))
  return {
    html: status === 200 ? data : '',
    resHeaders: headers,
    status
  }
}

function normalizeRequestError(e: any) {
  const errMsg = e?.message ?? ''
  if (!errMsg) return new Error('unknown error')
  const netErrInfoList = [
    'getaddrinfo ENOTFOUND',
    'read ECONNRESET',
    'Client network socket disconnected before secure TLS connection was established'
  ]
  const isNetError = netErrInfoList.some(netErrMsg => errMsg.startsWith(netErrMsg))
  if (isNetError) {
    return new Error('Please check the network connection or proxy settings')
  }
  return new Error(errMsg)
}

export const getKnowledgeBaseInfo: TGetKnowledgeBaseInfo = async (url, headerParams) => {
  try {
    const { html } = await getPageHtml(url, headerParams)
    const jsonData = parseAppData(html)
    if (!jsonData?.book) return {}
    return {
      bookId: jsonData.book.id,
      bookSlug: jsonData.book.slug,
      tocList: jsonData.book.toc || [],
      bookName: jsonData.book.name || '',
      bookDesc: jsonData.book.description || '',
      host: jsonData.space?.host || DEFAULT_DOMAIN,
      imageServiceDomains: jsonData.imageServiceDomains || []
    }
  } catch (e) {
    throw normalizeRequestError(e)
  }
}

export const getDocsMdData: TGetMdData = (params, isMd = true) => {
  const { articleUrl, bookId, token, key, host = DEFAULT_DOMAIN } = params
  let apiUrl = `${host}/api/docs/${articleUrl}`
  const queryParams: any = {
    'book_id': String(bookId),
    'merge_dynamic_data': String(false)
    // plain=false
    // linebreak=true
    // anchor=true
  }
  if (isMd) queryParams.mode = 'markdown'
  const query = new URLSearchParams(queryParams).toString()
  apiUrl = `${apiUrl}?${query}`
  return axios.get<ArticleResponse.RootObject>(apiUrl, genCommonOptions({ token, key }))
    .then(({ data, status }) => {
      const res = {
        apiUrl,
        httpStatus: status,
        response: data
      }
      return res
    })
}

export const getDocInfoFromUrl: TGetDocInfoFromUrl = async (url, headerParams) => {
  try {
    const { html } = await getPageHtml(url, headerParams)
    const jsonData = parseAppData(html)
    if (!jsonData?.doc) return {}
    return {
        docId: jsonData.doc.id,
        docSlug: jsonData.doc.slug,
        docTitle: jsonData.doc.title || '',
        bookId: jsonData.doc.book_id,
        bookSlug: jsonData.book?.slug || '',
        bookName: jsonData.book?.name || '',
        host: jsonData.space?.host || DEFAULT_DOMAIN,
        imageServiceDomains: jsonData.imageServiceDomains || []
      }
  } catch (e) {
    throw normalizeRequestError(e)
  }
}