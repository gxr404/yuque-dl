import path from 'node:path'
import { readFileSync } from 'node:fs'
import { http, HttpResponse } from 'msw'
import welfareHandlers from './yuque_welfare'
import base1Handlers from './knowledge_base1'


const pdfBuffer = readFileSync(path.join(__dirname, './assets/test.pdf'))

export const handlers = [
  http.get('http://localhost/404', () => {
    return new HttpResponse('Not found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }),
  http.get('https://www.yuque.com/attachments/test.pdf', () => {
    return HttpResponse.arrayBuffer(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
      },
    })
  }),
  http.get('https://www.yuque.com/attachments/error.pdf', () => {
    return new HttpResponse('Not found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }),

  ...welfareHandlers,
  ...base1Handlers
]
