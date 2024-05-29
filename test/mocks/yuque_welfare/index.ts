import { http, HttpResponse } from 'msw'
import { KNOWLEDGE_BASE_URL } from '../../helpers/constant'

import yuqueWelfareAppData from './appData.json' assert { type: 'json' }
import yuqueWelfareDocMdData from './docMd.json' assert { type: 'json' }

const mockData = new Map<string, any>([
  [KNOWLEDGE_BASE_URL.NORMAL, yuqueWelfareAppData],
  [KNOWLEDGE_BASE_URL.NORMAL_ARTICLE, {
    md: yuqueWelfareDocMdData
  }]
])

const handlers = [
  http.get(KNOWLEDGE_BASE_URL.NORMAL, () => {
    const jsonData = mockData.get(KNOWLEDGE_BASE_URL.NORMAL)
    const resData = encodeURIComponent(JSON.stringify(jsonData))
    return new HttpResponse(`decodeURIComponent("${resData}"));`, {
      status: 200,
      headers: {
        'Content-Type': 'text/html'
      }
    })
  }),
  http.get(KNOWLEDGE_BASE_URL.NORMAL_ARTICLE, ({ request }) => {
    const url = new URL(request.url)
    const mode = url.searchParams.get('mode')
    const jsonData = mockData.get(KNOWLEDGE_BASE_URL.NORMAL_ARTICLE)
    // https://www.yuque.com/api/docs/edu?book_id=41966892&mode=markdown&merge_dynamic_data=false
    const res = mode ? jsonData.md : {}
    return HttpResponse.json(res)
  }),
]
export default handlers