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
  let targetURL = url
  try {
    const {origin, pathname} = new URL(targetURL)
    targetURL = `${origin}${pathname}`
  } catch (e) {
    return url
  }
  return `https://www.yuque.com/api/filetransfer/images?url=${encodeURIComponent(targetURL)}&sign=${genSign(targetURL)}`
}