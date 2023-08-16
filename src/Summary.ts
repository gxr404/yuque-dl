import fs from 'node:fs/promises'

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
  type: string,
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
      const dirNameReg = /[\\\/:\*\?"<>\|\n\r]/g
      const tocText = toc.title.replace(dirNameReg, '_').replace(/\s/, '')
      const item: SummaryItem = {
        text: tocText,
        id: toc.uuid,
        level: 1,
        type: ''
      }
      if (toc.type.toLocaleLowerCase() === 'title' || toc['child_uuid'] !=='') {
        item.type = 'title'

        if (typeof findRes !== 'boolean') {
          if (!Array.isArray(findRes.children)) findRes.children = []
          item.level = findRes.level + 1,
          findRes.children!.push(item)
        } else {
          item.level = 1
          summary.push(item)
        }
      } else {
        item.type = 'link'
        item.link = progressItem.path
        if (typeof findRes !== 'boolean') {
          if (!Array.isArray(findRes.children)) findRes.children = []
          item.level = findRes.level + 1,
          findRes.children!.push(item)
        } else {
          item.level = 1
          summary.push(item)
        }
      }
    })

    let summaryContent = this.genSummaryContent(summary, '')
    mdContent += summaryContent
    try {
      await fs.writeFile(`${bookPath}/SUMMARY.md`, mdContent)
    } catch (err) {
      logger.error('Generate Summary Error')
    }

  }

  genSummaryContent(summary: SummaryItem[], summaryContent: string): string {
    for (let i = 0; i < summary.length; i++) {
      const item = summary[i]
      if (item.type === 'title')  {
        summaryContent += `\n${''.padStart(item.level + 1, '#')} ${item.text}\n\n`
      } else if (item.type === 'link') {
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
    for (let i = 0; i< tree.length; i++) {
        const findRes = this.findIdItem(tree[i], id)
        if (findRes) return findRes
    }
    return false
  }
}