import { describe, expect, it } from 'vitest'
import { captureImageURL, genSign } from '../src/crypto'


describe('captureImageURL', () => {
  const imageServiceDomains = ['www.abc.com', 'www.efg.com']
  it('Ignored within the image server', () => {
    const imgUrl = 'https://www.abc.com/1.jpg'
    const data = captureImageURL(imgUrl, imageServiceDomains)
    expect(data).toBe(imgUrl)
    const imgUrl2 = 'https://www.efg.com/1.jpg'
    const data2 = captureImageURL(imgUrl2, imageServiceDomains)
    expect(data2).toBe(imgUrl2)
  })
  // 不在图片服务器的域名需做转发到filetransfer
  it('should work', () => {
    const imgUrl = 'https://www.baidu2.com/logo.jpg'
    const data = captureImageURL(imgUrl, imageServiceDomains)
    expect(data).toBe(`https://www.yuque.com/api/filetransfer/images?url=${encodeURIComponent(imgUrl)}&sign=${genSign(imgUrl)}`)
  })
})
