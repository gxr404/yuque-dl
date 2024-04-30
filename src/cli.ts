
import { readFileSync } from 'node:fs'
import { cac } from 'cac'
import semver from 'semver'

import logger from './log'
import { main } from './index'

const cli = cac('yuque-dl')

export interface IOptions {
  distDir: string
  ignoreImg: boolean
  token?: string
  key?: string
  ignoreToc: boolean
}

// 不能直接使用 import {version} from '../package.json'
// 否则declaration 生成的d.ts 会多一层src目录
const { version, engines } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url)).toString(),
)

function checkVersion() {
  const version = engines.node
  if (!semver.satisfies(process.version, version)) {
    logger.error(`✕ nodejs 版本需 ${version}, 当前版本为 ${process.version}`)
    process.exit(1)
  }
}

// 检查node版本
checkVersion()

cli
  .command('<url>', '语雀知识库url')
  .option('-d, --dist-dir <dir>', '下载的目录 eg: -d download', {
    default: 'download',
  })
  .option('-i, --ignore-img', '忽略图片不下载', {
    default: false
  })
  .option('-k, --key <key>', '语雀的cookie key， 默认是 "_yuque_session"， 在某些企业版本中 key 不一样')
  .option('-t, --token <token>', '语雀的cookie key 对应的值')
  .option('--ignore-toc', '默认输出toc目录,添加此参数则不输出toc目录', {
    default: false
  })
  .action(async (url: string, options: IOptions) => {
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
