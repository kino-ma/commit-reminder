import { router, handleScheduled } from './handler'

addEventListener('fetch', (event) => {
  event.respondWith(router.handle(event.request))
})

addEventListener('scheduled', (event) => {
  event.waitUntil(handleScheduled(event))
})
