import crypto from 'node:crypto'
import { IMAGE_SING_KEY } from '../constant'

function isCaptureImageURL(url: string, imageServiceDomains: string[]) {
  try {
    const {host, pathname} = new URL(url)
    if (imageServiceDomains.includes(host)) return false

    return Boolean(pathname)
  } catch(e) {
    return false
  }
}

function genSign(url: string) {
  const hash = crypto.createHash('sha256')
  hash.update(`${IMAGE_SING_KEY}${url}`)
  return hash.digest('hex')
}

export function captureImageURL(url: string, imageServiceDomains: string[] = []) {
  if (!isCaptureImageURL(url, imageServiceDomains)) return url
  // try {
  //   const {origin, pathname, hash} = new URL(targetURL)
  //   // 存在多个 https://xxx/xxx#id=111&...#id=222&...
  //   // 仅取一个则移除最后一个
  //   const hastArr = hash.split('#')
  //   hastArr.splice(hastArr.length-1, 1)
  //   targetURL = `${origin}${pathname}${hastArr.join('#')}`

  // } catch (e) {
  //   return url
  // }
  return `https://www.yuque.com/api/filetransfer/images?url=${encodeURIComponent(url)}&sign=${genSign(url)}`
}