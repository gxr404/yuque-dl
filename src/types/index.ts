import { ArticleResponse } from './ArticleResponse'
import { KnowledgeBase } from './KnowledgeBaseResponse'
import { ProgressBar } from '../utils/ProgressBar'

export interface ICliOptions {
  /** 目标目录 */
  distDir: string
  /** 是否忽略图片 */
  ignoreImg: boolean
  /** 私有知识库 token */
  token?: string
  /** 自定义token key(企业所有部署) */
  key?: string
  /** 是否忽略markdown中toc的生成 */
  toc: boolean
  /** 是否增量下载 */
  incremental: boolean
  /** 转化markdown视频链接为video标签 */
  convertMarkdownVideoLinks: boolean
  /** 是否禁用页脚 */
  hideFooter: boolean
}

export interface IServerCliOptions {
  host: boolean | string
  port: number
  force: boolean
}

export interface ISidebarItemDir {
  text: string,
  index?: number,
  collapsed: string
  items: ISidebarItem[]
}

export interface ISidebarItemLink {
  text: string
  index?: number,
  link: string,
}

export type ISidebarItem = ISidebarItemDir | ISidebarItemLink

// ---------------- index

export interface ArticleInfo {
  bookId: number,
  itemUrl: string,
  savePath: string,
  saveFilePath: string,
  uuid: string,
  articleTitle: string,
  articleUrl: string,
  ignoreImg: boolean,
  host?: string,
  imageServiceDomains: string[]
}
export interface DownloadArticleParams {
  /** 文章信息 */
  articleInfo: ArticleInfo,
  /** 进度条实例 */
  progressBar: ProgressBar,
  /** cli options */
  options: ICliOptions,
  /** 单篇文档进度信息 */
  progressItem: IProgressItem,
  /** 第二次下载时前一次的单篇文档进度信息 */
  oldProgressItem?: IProgressItem
}

export interface DownloadArticleRes {
  needDownload: boolean,
  isUpdateDownload: boolean,
  isDownloadFinish: boolean
}

export interface IHandleMdDataOptions {
  articleUrl: string
  articleTitle: string
  toc: boolean
  articleUpdateTime: string
  convertMarkdownVideoLinks: boolean
  hideFooter: boolean
}


export interface IErrArticleInfo {
  articleUrl: string,
  errItem: IProgressItem,
  errMsg: string,
  err: any
}

export interface IUpdateDownloadItem {
  progressItem: IProgressItem,
  articleInfo: ArticleInfo
}

export interface IDownloadArticleListParams {
  articleUrlPrefix: string,
  total: number,
  uuidMap: Map<string, IProgressItem>,
  tocList: KnowledgeBase.Toc[],
  bookPath: string,
  bookId: number,
  progressBar: ProgressBar,
  host?: string
  options: ICliOptions,
  imageServiceDomains?: string[]
}

// ---------------- ProgressBar
export interface IProgressItem {
  path: string,
  toc: KnowledgeBase.Toc,
  pathIdList: string[],
  pathTitleList: string[],
  createAt?: string,
  contentUpdatedAt?: string,
  publishedAt?: string,
  firstPublishedAt?: string
}
export type IProgress = IProgressItem[]


// ---------------- Summary
export interface IGenSummaryFile {
  bookPath: string,
  bookName?: string,
  bookDesc?: string,
  uuidMap: Map<string, IProgressItem>
}
export interface SummaryItem {
  id: string,
  children?: SummaryItem[],
  type: 'link' | 'title',
  text: string,
  level: number,
  link?: string
}


// ---------------- parseSheet

export interface SheetItemData {
  [key: string]: {
    [key: string]: {
      v: string
    }
  }
}

export interface SheetItem {
  name: string,
  rowCount: number,
  selections: {
    row: number,
    col: number,
    rowCount: number,
    colCount: number,
    activeCol: number,
    activeRow: number
  },
  rows: any,
  columns: any,
  filter: any,
  index: 0,
  colCount: 26,
  mergeCells: any,
  id: string,
  data: SheetItemData,
  vStore: any
}

// ---------------- api
export interface IKnowledgeBaseInfo {
  bookId?: number
  bookSlug?: string
  tocList?: KnowledgeBase.Toc[],
  bookName?: string,
  bookDesc?: string,
  host?: string,
  imageServiceDomains?: string[]
}
export interface IReqHeader {
  [key: string]: string
}
export interface GetHeaderParams {
  /** token key */
  key?:string,
  /** token value */
  token?: string
}
export type TGetKnowledgeBaseInfo = (url: string, headerParams: GetHeaderParams) => Promise<IKnowledgeBaseInfo>

export interface GetMdDataParams {
  articleUrl: string,
  bookId: number,
  host?: string
  token?: string,
  key?: string
}
export interface IGetDocsMdDataRes {
  apiUrl: string,
  httpStatus: number,
  response?: ArticleResponse.RootObject
}
export type TGetMdData = (params: GetMdDataParams, isMd?: boolean) => Promise<IGetDocsMdDataRes>

export * from './ArticleResponse'
export * from './KnowledgeBaseResponse'