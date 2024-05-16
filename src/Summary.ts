import fs from 'node:fs/promises'
import { ARTICLE_TOC_TYPE } from './constant'
import logger from './log'

import type { IProgressItem } from './ProgressBar'

interface IGenSummaryFile {
  bookPath: string,
  bookName?: string,
  bookDesc?: string,
  uuidMap: Map<string, IProgressItem>
}
interface SummaryItem {
  id: string,
  children?: SummaryItem[],
  type: 'link' | 'title',
  text: string,
  level: number,
  link?: string
}

export default class Summary {
  summaryInfo: IGenSummaryFile
  constructor(summaryInfo: IGenSummaryFile) {
    this.summaryInfo = summaryInfo
  }

  async genFile() {
    const {bookName, bookDesc, bookPath, uuidMap} = this.summaryInfo
    let header = `# ${bookName}\n\n`
    if (bookDesc) header += `> ${bookDesc}\n\n`
    let mdContent = header
    const summary: SummaryItem[] = []
    uuidMap.forEach(progressItem => {
      const toc = progressItem.toc
      const parentId = toc['parent_uuid']
      const findRes = this.findTree(summary, parentId)
      const dirNameReg = /[\\/:*?"<>|\n\r]/g
      const tocText = toc.title.replace(dirNameReg, '_').replace(/\s/, '')
      const item: SummaryItem = {
        text: tocText,
        id: toc.uuid,
        level: 1,
        type: 'link'
      }
      const tocType = toc.type.toLocaleLowerCase()
      if (tocType === ARTICLE_TOC_TYPE.TITLE || toc['child_uuid'] !=='') {
        item.type = 'title'

        if (typeof findRes !== 'boolean') {
          if (!Array.isArray(findRes.children)) findRes.children = []
          item.level = findRes.level + 1
          findRes.children.push(item)
        } else {
          item.level = 1
          summary.push(item)
        }
        // 如果是标题同时也是文档,标题加上链接
        if (tocType === ARTICLE_TOC_TYPE.DOC) {
          item.link = progressItem.path
        }
        // 如果是标题同时也是文档，标题文案下生成新链接
        // if (tocType === ARTICLE_TOC_TYPE.DOC) {
        //   if (!Array.isArray(item.children)) item.children = []
        //   item.children.unshift({
        //     text: tocText,
        //     id: toc.uuid,
        //     level: item.level,
        //     type: 'link',
        //     link: progressItem.path
        //   })
        // }
      } else {
        item.type = 'link'
        // 外链类型直接 链接到url
        item.link = tocType=== ARTICLE_TOC_TYPE.LINK ? progressItem.toc.url : progressItem.path
        if (typeof findRes !== 'boolean') {
          if (!Array.isArray(findRes.children)) findRes.children = []
          item.level = findRes.level + 1
          findRes.children.push(item)
        } else {
          item.level = 1
          summary.push(item)
        }
      }
    })
    const summaryContent = this.genSummaryContent(summary, '')
    mdContent += summaryContent
    try {
      await fs.writeFile(`${bookPath}/SUMMARY.md`, mdContent)
    } catch (err) {
      logger.error('Generate Summary Error')
    }

  }

  genSummaryContent(summary: SummaryItem[], summaryContent: string): string {
    for (const item of summary) {
      if (item.type === ARTICLE_TOC_TYPE.TITLE) {
        // 是标题同时也是文档的情况
        if (item.link) {
          const link = item.link ? item.link.replace(/\s/g, '%20') : item.link
          summaryContent += `\n${''.padStart(item.level + 1, '#')} [${item.text}](${link})\n\n`
        } else {
          summaryContent += `\n${''.padStart(item.level + 1, '#')} ${item.text}\n\n`
        }
      } else if (item.type === ARTICLE_TOC_TYPE.LINK) {
        const link = item.link ? item.link.replace(/\s/g, '%20') : item.link
        summaryContent += `- [${item.text}](${link})\n`
      }
      if (Array.isArray(item.children)) {
        summaryContent += this.genSummaryContent(item.children, '')
      }
    }
    return summaryContent
  }


  findIdItem(node: SummaryItem, id: string) {
    if (node.id === id) {
      return node
    } else if (node.children) {
      const findRes = this.findTree(node.children, id)
      if (findRes) return findRes
    }
    return false
  }
  findTree(tree: SummaryItem[], id: string): SummaryItem | boolean {
    if (!id) return false
    for (const item of tree) {
      const findRes = this.findIdItem(item, id)
      if (findRes) return findRes
    }
    return false
  }
}