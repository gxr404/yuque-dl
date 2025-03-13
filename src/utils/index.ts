import randUserAgentLib from 'rand-user-agent'

/** 随机生成UA */
export function randUserAgent({ browser = 'chrome', os = 'mac os', device = 'desktop' }) {
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
export function getMarkdownImageList(mdStr: string) {
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

export function removeEmojis(dirName: string) {
  return dirName.replace(/[\ud800-\udbff][\udc00-\udfff]/g, '')
}

export function isValidUrl(url: string): boolean {
  if (typeof URL.canParse === 'function') {
    return URL.canParse(url)
  }
  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}

function pad(num: number) {
  return num.toString().padStart(2, '0')
}

export function formateDate(d: string) {
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`
}

export function isValidDate(date: Date) {
  return date instanceof Date && !isNaN(date.getTime())
}

export * from './log'
export * from './ProgressBar'
