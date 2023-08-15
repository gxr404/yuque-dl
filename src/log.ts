import log4js from 'log4js'

/**
 * log 初始化
 */
const getLogger = () => {
  log4js.configure({
    appenders: {
      // cheeseLog: { type: 'file', filename: 'cheese.log' },
      cheese: {
        type: 'console',
        layout: {
          // type: 'messagePassThrough',
          type: 'pattern',
          // pattern: '%[%d{yyyy-MM-dd hh:mm:ss} [%p] %c -%] %m%n'
          pattern: '%[%c [%p]:%] %m%n'
        }
      }
    },
    categories: { default: { appenders: ['cheese'], level: 'trace' } }
  })
  return log4js.getLogger('yuque-dl')
}

export default getLogger()
