import { publicEncrypt, constants } from 'node:crypto'
import { env } from 'node:process'
import axios from 'axios'
import { randUserAgent } from './utils'
import { DEFAULT_COOKIE_KEY, DEFAULT_DOMAIN } from './constant'

import type {
  ArticleResponse,
  KnowledgeBase,
  GetHeaderParams,
  IKnowledgeBaseInfo,
  IDocInfo,
  IReqHeader,
  TGetKnowledgeBaseInfo,
  TGetMdData,
  TGetDocInfoFromUrl
} from './types'
import type { AxiosRequestConfig } from 'axios'

const PASSWORD_PUBLIC_KEY = `
-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCfwyOyncSrUTmkaUPsXT6UUdXx
TQ6a0wgPShvebfwq8XeNj575bUlXxVa/ExIn4nOUwx6iR7vJ2fvz5Ls750D051S7
q70sevcmc8SsBNoaMQtyF/gETPBSsyWv3ccBJFrzZ5hxFdlVUfg6tXARtEI8rbIH
su6TBkVjk+n1Pw/ihQIDAQAB
-----END PUBLIC KEY-----`

const VERIFIED_COOKIE_KEY_MAP = {
  Book: 'verified_books',
  Doc: 'verified_docs'
} as const

type IYuqueAppData = Partial<KnowledgeBase.Response> & {
  timestamp?: number
  matchCondition?: {
    targetType?: keyof typeof VERIFIED_COOKIE_KEY_MAP
    needVerifyTargetId?: number
  }
}

function getHeaders(params: GetHeaderParams): IReqHeader {
  const { key = DEFAULT_COOKIE_KEY, token, cookie } = params
  const headers: IReqHeader = {
    'user-agent': randUserAgent({
      browser: 'chrome',
      device: 'desktop'
    })
  }
  if (cookie) {
    headers.cookie = cookie
  } else if (token) {
    headers.cookie = `${key}=${token};`
  }
  return headers
}

export function genCommonOptions(params: GetHeaderParams): AxiosRequestConfig {
  const config: AxiosRequestConfig = {
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

function getKnowledgeBaseData(jsonData?: IYuqueAppData): IKnowledgeBaseInfo {
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
}

function getDocData(jsonData?: IYuqueAppData): IDocInfo {
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
}

function parseCookieHeader(cookie = '') {
  const cookieMap: Record<string, string> = {}
  cookie.split(';').forEach((item) => {
    const [rawKey, ...valueList] = item.trim().split('=')
    if (rawKey && valueList.length > 0) cookieMap[rawKey] = valueList.join('=')
  })
  return cookieMap
}

function parseSetCookie(setCookie?: string[] | string) {
  const cookieMap: Record<string, string> = {}
  const cookieList = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
  cookieList.forEach((item) => {
    const cookieItem = item.split(';')[0]
    const [key, ...valueList] = cookieItem.split('=')
    if (key && valueList.length > 0) cookieMap[key] = valueList.join('=')
  })
  return cookieMap
}

function stringifyCookie(cookieMap: Record<string, string>) {
  return Object.entries(cookieMap)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')
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

async function verifyPublicPassword(
  url: string,
  jsonData: IYuqueAppData,
  headerParams: GetHeaderParams,
  setCookie?: string[] | string
) {
  const { password } = headerParams
  const { targetType, needVerifyTargetId } = jsonData.matchCondition || {}
  if (!password || !targetType || !needVerifyTargetId) return false

  const verifiedCookieKey = VERIFIED_COOKIE_KEY_MAP[targetType]
  if (!verifiedCookieKey) return false

  const cookieMap = {
    ...parseCookieHeader(headerParams.cookie),
    ...parseCookieHeader(headerParams.token ? `${headerParams.key || DEFAULT_COOKIE_KEY}=${headerParams.token}` : ''),
    ...parseSetCookie(setCookie)
  }
  const ctoken = cookieMap.yuque_ctoken
  if (!ctoken) throw new Error('No found yuque_ctoken')

  const apiUrl = `${new URL(url).origin}/api/${targetType === 'Book' ? 'books' : 'docs'}/${needVerifyTargetId}/verify`
  const cookie = stringifyCookie(cookieMap)
  const config = genCommonOptions({
    ...headerParams,
    cookie
  })
  config.headers = {
    ...(config.headers || {}),
    'content-type': 'application/json',
    accept: 'application/json',
    'x-requested-with': 'XMLHttpRequest',
    'x-csrf-token': ctoken,
    referer: url
  }

  const { headers } = await axios.put(apiUrl, {
    password: encryptPassword(password, jsonData.timestamp)
  }, config)
  const verifiedCookieMap = {
    ...cookieMap,
    ...parseSetCookie(headers['set-cookie'])
  }
  const verifiedCookie = verifiedCookieMap[verifiedCookieKey]
  if (!verifiedCookie) throw new Error(`No found ${verifiedCookieKey}`)

  headerParams.key = verifiedCookieKey
  headerParams.token = verifiedCookie
  headerParams.cookie = stringifyCookie(verifiedCookieMap)
  return true
}

async function getPageHtml(url: string, headerParams: GetHeaderParams) {
  const { data = '', status, headers } = await axios.get<string>(url, genCommonOptions(headerParams))
  return {
    html: status === 200 ? data : '',
    headers
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
    const { html, headers } = await getPageHtml(url, headerParams)
    let jsonData = parseAppData(html)
    let info = getKnowledgeBaseData(jsonData)
    if (!info.bookId && jsonData && await verifyPublicPassword(url, jsonData, headerParams, headers['set-cookie'])) {
      jsonData = parseAppData((await getPageHtml(url, headerParams)).html)
      info = getKnowledgeBaseData(jsonData)
    }
    return info
  } catch (e) {
    throw normalizeRequestError(e)
  }
}

export const getDocsMdData: TGetMdData = (params, isMd = true) => {
  const { articleUrl, bookId, token, key, cookie, host = DEFAULT_DOMAIN } = params
  let apiUrl = `${host}/api/docs/${articleUrl}`
  const queryParams: any = {
    'book_id': String(bookId),
    'merge_dynamic_data': String(false)
  }
  if (isMd) queryParams.mode = 'markdown'
  const query = new URLSearchParams(queryParams).toString()
  apiUrl = `${apiUrl}?${query}`
  return axios.get<ArticleResponse.RootObject>(apiUrl, genCommonOptions({ token, key, cookie }))
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
    const { html, headers } = await getPageHtml(url, headerParams)
    let jsonData = parseAppData(html)
    let info = getDocData(jsonData)
    if (!info.docId && jsonData && await verifyPublicPassword(url, jsonData, headerParams, headers['set-cookie'])) {
      jsonData = parseAppData((await getPageHtml(url, headerParams)).html)
      info = getDocData(jsonData)
    }
    return info
  } catch (e) {
    throw normalizeRequestError(e)
  }
}
