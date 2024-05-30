import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { http, HttpResponse } from 'msw'
import { KNOWLEDGE_BASE_URL } from '../../helpers/constant'

import appData from './appData.json' assert { type: 'json' }
import docMdData from './docMd.json' assert { type: 'json' }
import doc2MdData from './doc2Md.json' assert { type: 'json' }
import boardData from './boardData.json' assert { type: 'json' }
import tableData from './tableData.json' assert { type: 'json' }
import sheetData from './sheetData.json' assert { type: 'json' }


const __dirname = path.dirname(fileURLToPath(import.meta.url))
const img1buffer = readFileSync(path.join(__dirname, '../assets/1.jpeg'))
const img2buffer = readFileSync(path.join(__dirname, '../assets/2.jpeg'))

const mockData = new Map<string, any>([
  [KNOWLEDGE_BASE_URL.BASE1, appData]
])

const handlers = [
  http.get(KNOWLEDGE_BASE_URL.BASE1, () => {
    const jsonData = mockData.get(KNOWLEDGE_BASE_URL.BASE1)
    const resData = encodeURIComponent(JSON.stringify(jsonData))
    return new HttpResponse(`decodeURIComponent("${resData}"));`, {
      status: 200,
      headers: {
        'Content-Type': 'text/html'
      }
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
    const res = mode ? doc2MdData : {}
    return HttpResponse.json(res)
  }),
  http.get('https://gxr404.com/1.jpeg', () => {
    return HttpResponse.arrayBuffer(img1buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
      },
    })
  }),
  http.get('https://gxr404.com/2.jpeg', () => {
    return HttpResponse.arrayBuffer(img2buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
      },
    })
  }),
  http.get('https://www.yuque.com/api/docs/board', () => {
    return HttpResponse.json(boardData)
  }),
  http.get('https://www.yuque.com/api/docs/table', () => {
    return HttpResponse.json(tableData)
  }),
  http.get('https://www.yuque.com/api/docs/sheet', () => {
    return HttpResponse.json(sheetData)
  }),
  http.get('https://www.yuque.com/api/docs/sheetError', () => {
    const temp = structuredClone(sheetData)
    temp.data.content = 'error'
    return HttpResponse.json(temp)
  }),
  http.get("https://www.yuque.com/api/filetransfer/images", ()=>{
    return HttpResponse.arrayBuffer(img1buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
      },
    })
  }),

  http.get('https://www.yuque.com/api/docs/tokenAndKey', ({request}) => {
    return HttpResponse.json({
      "data": {
        "type": "Doc",
        "sourcecode": request.headers.get('cookie')
      }
    })
  }),

  http.get('https://www.yuque.com/api/docs/sourcecodeNull', () => {
    return HttpResponse.json({
      "data": {
        "type": "Doc",
      }
    })
  }),
]

  // /** 画板 */
  // BOARD = 'board',
  // /** 数据表 */
  // TABLE = 'table',
  // /** 表格 */
  // SHEET = 'sheet',
  // /** 文档 */
  // DOC = 'doc'
export default handlers