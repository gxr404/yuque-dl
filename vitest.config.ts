import { defineConfig } from 'vitest/config'

export default defineConfig({

  test: {
    testTimeout: 60 * 1000,
    onConsoleLog (log) {
      if (log.includes('yuque-dl [INFO]')) return false
      // if (/下载 "(.*?)" 的图片中/gm.test(log)) return false
      if (/^\s+$/gm.test(log)) return false
    },
  },
})
