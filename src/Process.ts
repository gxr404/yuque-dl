import fs from 'node:fs/promises'
import progress from 'progress'

import logger from './log'
import type { KnowledgeBase } from './types/KnowledgeBaseResponse'

export interface IProcessItem {
  path: string,
  toc: KnowledgeBase.Toc,
  pathIdList: string[],
  pathTitleList: string[]
}
export type IProcess = IProcessItem[]

export default class Progress {
  bookPath: string = ''
  processFilePath: string = ''
  processInfo: IProcess = []
  curr: number = 0
  total: number = 0
  isDownloadInterrupted: boolean = false
  bar: progress|null = null
  completePromise: Promise<void> | null = null

  constructor (bookPath: string, total: number) {
    this.bookPath = bookPath
    this.processFilePath = `${bookPath}/process.json`
    this.total = total
  }

  async init() {
    this.processInfo = await this.getProgress()
    this.curr = this.processInfo.length
    let completeResolve: Function
    this.completePromise = new Promise(resolve => {
      completeResolve = resolve
    })
    if (this.curr > 0 && this.curr !== this.total) {
      this.isDownloadInterrupted = true
      logger.info('断点下载')
    }

    this.bar = new progress('[:bar] :rate/bps :percent :etas', {
      // width: 20,
      total: this.total,
      curr: this.curr,
      callback() {
        completeResolve()
      }
    })

  }

  async getProgress(): Promise<IProcess> {
    let processInfo = []
    try {
      const processInfoStr = await fs.readFile(this.processFilePath, {encoding: 'utf8'})
      processInfo = JSON.parse(processInfoStr)
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        await fs.writeFile(
          this.processFilePath,
          JSON.stringify(processInfo),
          {encoding: 'utf8'}
        )
      }
    }
    return processInfo
  }

  async updateProgress(progressItem: IProcessItem) {
    this.processInfo.push(progressItem)
    await fs.writeFile(
      this.processFilePath,
      JSON.stringify(this.processInfo),
      {encoding: 'utf8'}
    )
    this.curr = this.curr + 1
    if (this.bar) {
      this.bar?.tick()
    }
  }
}