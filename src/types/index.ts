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
  /** doc 类型导出格式 */
  docExportType: DocExportType
  /** board 类型导出格式 */
  boardExportType: BoardExportType
  /** table 类型导出格式 */
  tableExportType: TableExportType
  /** sheet 类型导出格式 */
  sheetExportType: SheetExportType
  /** 语雀开发授权码 */
  ctoken?: string
}

export interface IConfig extends ICliOptions {
  /** 语雀知识库url */
  url: string
  host: string
  secondDomain: string
}
// ---------------- index

export interface ArticleInfo {
  bookId: number
  itemUrl: string
  savePath: string
  saveFilePath: string
  uuid: string
  id?: number
  articleTitle: string
  articleUrl: string
  ignoreImg: boolean
  progressItem: Record<string, any>
  host?: string
  imageServiceDomains: string[]
}
export interface DownloadArticleParams {
  /** 文章信息 */
  articleInfo: ArticleInfo
  /** 进度条实例 */
  progressBar: ProgressBar
  /** cli options */
  options: ICliOptions
}
export interface IHandleMdDataOptions {
  articleUrl: string
  articleTitle: string
  toc: boolean
  articleUpdateTime: string
}

export interface IErrArticleInfo {
  articleUrl: string
  errItem: IProgressItem
  errMsg: string
  err: any
}

export interface IDownloadArticleListParams {
  articleUrlPrefix: string
  total: number
  uuidMap: Map<string, IProgressItem>
  tocList: KnowledgeBase.Toc[]
  bookPath: string
  bookId: number
  progressBar: ProgressBar
  host?: string
  options: ICliOptions
  imageServiceDomains?: string[]
}

// ---------------- ProgressBar
export interface IProgressItem {
  path: string
  toc: KnowledgeBase.Toc
  pathIdList: string[]
  pathTitleList: string[]
}
export type IProgress = IProgressItem[]

// ---------------- Summary
export interface IGenSummaryFile {
  bookPath: string
  bookName?: string
  bookDesc?: string
  uuidMap: Map<string, IProgressItem>
}
export interface SummaryItem {
  id: string
  children?: SummaryItem[]
  type: 'link' | 'title'
  text: string
  level: number
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
  name: string
  rowCount: number
  selections: {
    row: number
    col: number
    rowCount: number
    colCount: number
    activeCol: number
    activeRow: number
  }
  rows: any
  columns: any
  filter: any
  index: 0
  colCount: 26
  mergeCells: any
  id: string
  data: SheetItemData
  vStore: any
}

// ---------------- api
export interface IKnowledgeBaseInfo {
  bookId?: number
  bookSlug?: string
  tocList?: KnowledgeBase.Toc[]
  bookName?: string
  bookDesc?: string
  host?: string
  imageServiceDomains?: string[]
}
export interface IReqHeader {
  [key: string]: string
}
export interface GetHeaderParams {
  /** token key */
  key?: string
  /** token value */
  token?: string
  /** referer  */
  host: string
}
export type TGetKnowledgeBaseInfo = (url: string) => Promise<IKnowledgeBaseInfo>

export interface GetMdDataParams {
  articleUrl: string
  bookId: number
  host?: string
  token?: string
  key?: string
}

export enum DocExportType {
  md = 'md',
  lake = 'lake',
  pdf = 'pdf',
}

export enum SheetExportType {
  lakesheet = 'lakesheet',
  xlsx = 'xlsx',
}

export enum BoardExportType {
  lakeboard = 'lakeboard',
  jpg = 'jpg',
  png = 'png',
}

export enum MindExportType {
  lakeboard = 'lakeboard',
  jpg = 'jpg',
  png = 'png',
}

export enum TableExportType {
  laketable = 'laketable',
  xlsx = 'xlsx',
}

export enum LakeType {
  lake = 'lake',
  lakeboard = 'lakeboard',
  lakesheet = 'lakesheet',
  laketable = 'laketable',
}

export interface IGetDocsMdDataRes {
  apiUrl: string
  httpStatus: number
  response?: ArticleResponse.RootObject
}
export type TGetMdData = (
  params: GetMdDataParams,
  isMd?: boolean,
) => Promise<IGetDocsMdDataRes>

export * from './ArticleResponse'
export * from './KnowledgeBaseResponse'
