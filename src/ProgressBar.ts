import fs from 'node:fs/promises'

import progress from 'progress'

import logger from './log'

import type { KnowledgeBase } from './types/KnowledgeBaseResponse'

export interface IProgressItem {
  path: string,
  toc: KnowledgeBase.Toc,
  pathIdList: string[],
  pathTitleList: string[]
}
export type IProgress = IProgressItem[]

export default class ProgressBar {
  bookPath: string = ''
  progressFilePath: string = ''
  progressInfo: IProgress = []
  curr: number = 0
  total: number = 0
  isDownloadInterrupted: boolean = false
  bar: progress|null = null
  completePromise: Promise<void> | null = null

  constructor (bookPath: string, total: number) {
    this.bookPath = bookPath
    this.progressFilePath = `${bookPath}/progress.json`
    this.total = total
  }

  async init() {
    this.progressInfo = await this.getProgress()
    this.curr = this.progressInfo.length
    let completeResolve: Function
    this.completePromise = new Promise(resolve => {
      completeResolve = resolve
    })
    if (this.curr > 0 && this.curr !== this.total) {
      this.isDownloadInterrupted = true
      logger.info('断点下载')
    }

    this.bar = new progress('downloading [:bar] :rate/bps :percent :etas', {
      width: 80,
      total: this.total,
      curr: 0,
      callback() {
        completeResolve()
      }
    })
    if (this.curr > 0) this.bar.tick(this.curr)
  }

  async getProgress(): Promise<IProgress> {
    let progressInfo = []
    try {
      const progressInfoStr = await fs.readFile(this.progressFilePath, {encoding: 'utf8'})
      progressInfo = JSON.parse(progressInfoStr)
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        await fs.writeFile(
          this.progressFilePath,
          JSON.stringify(progressInfo),
          {encoding: 'utf8'}
        )
      }
    }
    return progressInfo
  }

  async updateProgress(progressItem: IProgressItem, isSuccess: boolean) {
    // 成功才写入 progress.json 以便重新执行时重新下载
    if (isSuccess) {
      this.progressInfo.push(progressItem)
      await fs.writeFile(
        this.progressFilePath,
        JSON.stringify(this.progressInfo),
        {encoding: 'utf8'}
      )
    }
    this.curr = this.curr + 1
    if (this.bar) {
      this.bar?.tick()
    }
  }
}