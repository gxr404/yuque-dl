#!/usr/bin/env node

function run() {
  return import('../dist/es/cli.js').catch((e) => {
    const lowVersionError = [
      'Not supported',
      'No such built-in module: node:fs/promises',
      'Only file and data URLs are supported by the default ESM loader',
      // at Loader.moduleStrategy (internal/modules/esm/translators.js:145:18)
      'Unexpected token \'??=\''
    ]
    if (lowVersionError.includes(e.message)) {
      console.error('\x1b[31m%s\x1b[0m', '✕ nodejs版本过低')
      return
    }
    throw e
  })
}
run()