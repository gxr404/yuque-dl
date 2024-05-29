import { http, HttpResponse } from 'msw'
import welfareHandlers from './yuque_welfare'
import base1Handlers from './knowledge_base1'


export const handlers = [
  http.get('http://localhost/404', () => {
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
