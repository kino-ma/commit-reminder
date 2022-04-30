/* eslint-disable @typescript-eslint/no-explicit-any */
export class Slack {
  webhookUrl: string
  headers = {
    'Content-Type': 'application/json',
  }

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl
  }

  async send(
    message: string,
    customOptions?: { [key: string]: any },
  ): Promise<void> {
    const bodyData = {
      text: message,
      ...customOptions,
    }
    const body = JSON.stringify(bodyData)

    const resp = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: this.headers,
      body,
    })

    if (!resp.ok) {
      console.error(await resp.text())
      throw resp
    }
  }
}
