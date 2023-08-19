
import { readFileSync } from 'node:fs'
import { cac } from 'cac'

import logger from './log'
import { main } from './index'

const cli = cac('yuque-dl')

export interface IOptions {
  distDir: string,
  ignoreImg: boolean,
  token: string
}

// 不能直接使用 import {version} from '../package.json'
// 否则declaration 生成的d.ts 会多一层src目录
const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url)).toString(),
)

cli
  .command('<url>', '语雀知识库url')
  .option('-d, --distDir <dir>', '下载的目录 eg: -d download', {
    default: 'download',
  })
  .option('-i, --ignoreImg', '忽略图片不下载', {
    default: false
  })
  .option('-t, --token <token>', '语雀的cookie "_yuque_session"')
  .action(async (url, options: IOptions) => {
    try {
      await main(url, options)
    } catch (err) {
      logger.error(err.message || 'unknown exception')
    }
  })

cli.help()
cli.version(version)

try {
  cli.parse()
} catch (err) {
  logger.error(err.message || 'unknown exception')
  process.exit(1)
}
