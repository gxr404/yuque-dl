import log4js from 'log4js'

const getLogger = () => {
  log4js.configure({
    appenders: {
      cheese: {
        type: 'console',
        layout: {
          type: 'pattern',
          pattern: '%[%c [%p]:%] %m%n'
        }
      }
    },
    categories: { default: { appenders: ['cheese'], level: 'trace' } }
  })
  return log4js.getLogger('yuque-dl')
}

export const logger = getLogger()
