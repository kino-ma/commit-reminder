import { Router } from 'itty-router'

import { handleScheduled, runReminder } from './handler'

export const router = Router()

router.get(`/${SECRET_PATH}`, async () => {
  const date = new Date()
  const contributionCount = await runReminder(date)
  const body = {
    contributionCount,
  }
  return new Response(JSON.stringify(body))
})

router.all('*', () => new Response('404, not found!', { status: 404 }))

addEventListener('fetch', (event) => {
  event.respondWith(router.handle(event.request))
})

addEventListener('scheduled', (event) => {
  event.waitUntil(handleScheduled(event))
})

console.log({ SECRET_PATH })
