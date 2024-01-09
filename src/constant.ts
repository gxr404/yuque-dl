/** 语雀toc菜单类型 */
enum ARTICLE_TOC_TYPE {
  // title目录类型
  TITLE = 'title',
  // link外链类型
  LINK = 'link',
  // 内部文档
  DOC = 'doc'
}

/** 语雀档类型 */
enum ARTICLE_CONTENT_TYPE {
  /** 画板 */
  BOARD = 'board',
  /** 数据表 */
  TABLE = 'table',
  /** 表格 */
  SHEET = 'sheet',
  /** 文档 */
  DOC = 'doc'
}

const articleContentMap = new Map<ARTICLE_CONTENT_TYPE, string>([
  [ARTICLE_CONTENT_TYPE.BOARD, '画板类型'],
  [ARTICLE_CONTENT_TYPE.TABLE, '数据表类型'],
  [ARTICLE_CONTENT_TYPE.SHEET, '表格类型'],
  [ARTICLE_CONTENT_TYPE.DOC, '文档类型'],
])

/** 默认语雀cookie KEY */
const DEFAULT_COOKIE_KEY = '_yuque_session'
/** 默认语雀域名 */
const DEFAULT_DOMAIN = 'https://www.yuque.com'

export {
  ARTICLE_TOC_TYPE,
  ARTICLE_CONTENT_TYPE,
  articleContentMap,
  DEFAULT_COOKIE_KEY,
  DEFAULT_DOMAIN
}