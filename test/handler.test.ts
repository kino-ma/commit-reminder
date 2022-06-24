import { isTimeToSend } from '../src/handler'

describe('logic', () => {
  test('determine whether to send reminder', async () => {
    // 18:00. not to send
    const dateNotToSend = new Date()
    dateNotToSend.setHours(18)

    let x = isTimeToSend(dateNotToSend)
    expect(x).toBeFalsy()

    // 23:30. to send
    const dateToSend = new Date()
    dateNotToSend.setHours(23, 30)

    x = isTimeToSend(dateToSend)
    expect(x).toBeTruthy()
  })
})
