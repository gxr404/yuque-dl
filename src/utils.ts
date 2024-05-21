import randUserAgentLib from 'rand-user-agent'

function randUserAgent({ browser = 'chrome', os = 'mac os', device = 'desktop' }) {
  device = device.toLowerCase()
  browser = browser.toLowerCase()
  os = os.toLowerCase()
  let UA = randUserAgentLib(device, browser, os)

  if (browser === 'chrome') {
    while (UA.includes('Chrome-Lighthouse')
      || UA.includes('Gener8')
      || UA.includes('HeadlessChrome')
      || UA.includes('SMTBot')) {
        UA = randUserAgentLib(device, browser, os)
    }
  }
  if (browser === 'safari') {
    while (UA.includes('Applebot')) {
      UA = randUserAgentLib(device, browser, os)
    }
  }
  return UA
}

/**
 * 获取md中的img url
 */
function getMarkdownImageList(mdStr: string) {
  if (!mdStr) return []
  const mdImgReg = /!\[(.*?)\]\((.*?)\)/gm
  let list = Array.from(mdStr.match(mdImgReg) || [])
  list = list
    .map((itemUrl) => {
      itemUrl = itemUrl.replace(mdImgReg, '$2')
      // 如果出现非http开头的图片 如 "./xx.png" 则跳过
      if (!/^http.*/g.test(itemUrl)) return ''
      return itemUrl
    })
    .filter((url) => Boolean(url))
  return list
}

export {
  randUserAgent,
  getMarkdownImageList
}