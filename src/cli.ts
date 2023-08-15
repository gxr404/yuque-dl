
import { readFileSync } from 'node:fs'
import { cac } from 'cac'
import { main } from './index'
import logger from './log'

const cli = cac('yuque-dl')

export interface IOptions {
  distDir: string
}

// 不能直接使用 import {version} from '../package.json'
// 否则declaration 生成的d.ts 会多一层src目录
const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url)).toString(),
)

cli
  .command('<url>', 'request url')
  .option('-d, --distDir <dir>', '下载的目录 eg: -d download', {
    default: 'download',
  })
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

// try {
//   cli.parse(process.argv, { run: false })
//   await cli.runMatchedCommand()
// } catch (error) {
//   logger.error(error.message || 'unknown exception')
//   process.exit(1)

// }