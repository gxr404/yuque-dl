import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { http, HttpResponse } from 'msw'
import { toArrayBuffer } from './utils'

// import data
import appData from './data/appData.json' assert { type: 'json' }
import docMdData from './data/docMd.json' assert { type: 'json' }
import docMdData2 from './data/docMd2.json' assert { type: 'json' }
import boardData from './data/boardData.json' assert { type: 'json' }
import tableData from './data/tableData.json' assert { type: 'json' }
import sheetData from './data/sheetData.json' assert { type: 'json' }
import attachmentsDocMdData from './data/attachments.json' assert { type: 'json' }
import yuqueWelfareAppData from './data/welfare/appData.json' assert { type: 'json' }
import yuqueWelfareDocMdData from './data/welfare/docMd.json' assert { type: 'json' }

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const img1buffer = readFileSync(path.join(__dirname, './assets/1.jpeg'))
const img2buffer = readFileSync(path.join(__dirname, './assets/2.jpeg'))
const pdfBuffer = readFileSync(path.join(__dirname, './assets/test.pdf'))

const header = {
  img: {
    'Content-Type': 'image/jpeg',
  },
  pdf: {
    'Content-Type': 'application/pdf',
  },
  plain:  {
    'Content-Type': 'text/plain',
  },
  text: {
    'Content-Type': 'text/html'
  }
}

const NotFoundRes = {
  status: 404,
  headers: header.plain
}

export const handlers = [
  http.get('http://localhost/404', () => new HttpResponse('Not found', NotFoundRes)),
  http.get('https://www.yuque.com/attachments/test.pdf', () => {
    return HttpResponse.arrayBuffer(toArrayBuffer(pdfBuffer), { headers: header.pdf })
  }),
  http.get('https://www.yuque.com/attachments/error.pdf', () => new HttpResponse('Not found', NotFoundRes)),
  http.get('https://gxr404.com/1.jpeg', () => HttpResponse.arrayBuffer(toArrayBuffer(img1buffer), { headers: header.img })),
  http.get('https://gxr404.com/2.jpeg', () => HttpResponse.arrayBuffer(toArrayBuffer(img2buffer), { headers: header.img })),
  http.get('https://www.yuque.com/yuque/base1', () => {
    const jsonData = appData
    const resData = encodeURIComponent(JSON.stringify(jsonData))
    return new HttpResponse(`decodeURIComponent("${resData}"));`, {
      status: 200,
      headers: header.text
    })
  }),
  http.get('https://www.yuque.com/api/docs/one', ({ request }) => {
    const url = new URL(request.url)
    const mode = url.searchParams.get('mode')
    const res = mode ? docMdData : {}
    return HttpResponse.json(res)
  }),
  http.get('https://www.yuque.com/api/docs/two', ({ request }) => {
    const url = new URL(request.url)
    const mode = url.searchParams.get('mode')
    // https://www.yuque.com/api/docs/edu?book_id=41966892&mode=markdown&merge_dynamic_data=false
    const res = mode ? docMdData2 : {}
    return HttpResponse.json(res)
  }),
  http.get('https://www.yuque.com/api/docs/board', () => HttpResponse.json(boardData)),
  http.get('https://www.yuque.com/api/docs/table', () => HttpResponse.json(tableData)),
  http.get('https://www.yuque.com/api/docs/sheet', () => HttpResponse.json(sheetData)),
  http.get('https://www.yuque.com/api/docs/sheetError', () => {
    const temp = structuredClone(sheetData)
    temp.data.content = 'error'
    return HttpResponse.json(temp)
  }),
  http.get('https://www.yuque.com/api/filetransfer/images', () => {
    return HttpResponse.arrayBuffer(toArrayBuffer(img1buffer), { headers: header.img })
  }),
  http.get('https://www.yuque.com/api/docs/tokenAndKey', ({request}) => {
    return HttpResponse.json({
      'data': {
        'type': 'Doc',
        'sourcecode': request.headers.get('cookie')
      }
    })
  }),
  http.get('https://www.yuque.com/api/docs/sourcecodeNull', () => {
    return HttpResponse.json({
      'data': {
        'type': 'Doc',
      }
    })
  }),
  http.get('https://www.yuque.com/api/docs/attachments', () => HttpResponse.json(attachmentsDocMdData)),

  // ====================== welfareHandlers ======================
  http.get('https://www.yuque.com/yuque/welfare', () => {
    const jsonData = yuqueWelfareAppData
    const resData = encodeURIComponent(JSON.stringify(jsonData))
    return new HttpResponse(`decodeURIComponent("${resData}"));`, {
      status: 200,
      headers: header.text
    })
  }),
  http.get('https://www.yuque.com/api/docs/edu', ({ request }) => {
    const url = new URL(request.url)
    const mode = url.searchParams.get('mode')
    const jsonData = {
      md: yuqueWelfareDocMdData
    }
    // https://www.yuque.com/api/docs/edu?book_id=41966892&mode=markdown&merge_dynamic_data=false
    const res = mode ? jsonData.md : {}
    return HttpResponse.json(res)
  }),
]
