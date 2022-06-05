import { ApolloClient, InMemoryCache, gql } from '@apollo/client/core'
import { Router } from 'itty-router'

import { Slack } from './slack'

declare const GITHUB_TOKEN: string
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const SLACK_BOT_TOKEN: string
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const SLACK_SIGNING_SECRET: string
declare const SLACK_WEBHOOK_URL: string
declare const SLACK_USER_ID: string
declare const SECRET_PATH: string
declare let TODAY_COUNT: string

const MENTION = `<@${SLACK_USER_ID}>`

const TIMEZONE = 9
const START_HOUR = 22 - TIMEZONE
const START_MINUTE = 30
const END_HOUR = 23 - TIMEZONE
const END_MINUTE = 59
const CRON_FREQUENCY_MINUTE = 30

const getTimeOfToday = (hour: number, minute: number): Date => {
  const date = new Date()
  date.setHours(hour, minute)
  return date
}

const startDate = getTimeOfToday(START_HOUR, START_MINUTE)
const endDate = getTimeOfToday(END_HOUR, END_MINUTE)

const isFirstCall = (calledDate: Date): boolean => {
  const possibleLastDate = new Date(startDate.valueOf())
  possibleLastDate.setMinutes(
    possibleLastDate.getMinutes() + CRON_FREQUENCY_MINUTE,
  )
  return startDate <= calledDate && calledDate < possibleLastDate
}

const client = new ApolloClient({
  uri: 'https://api.github.com/graphql',
  cache: new InMemoryCache(),
  headers: {
    authorization: `Bearer ${GITHUB_TOKEN}`,
    'user-agent': 'apollo-js',
  },
})

const slack = new Slack(SLACK_WEBHOOK_URL)

const sendReminder = async () => {
  const text = `Contribute to GitHub at least 1 time\n${MENTION}`
  await slack.send(text)
  console.log('sent a reminder')
}
const sendLog = async (contributionCount?: number) => {
  let text: string
  if (contributionCount) {
    text = `Today's contribution(s): *${contributionCount}*`
  } else {
    text = `You have achived today's contribution goal! :tada:`
  }
  console.log(text)

  await slack.send(text)
  console.log('sent a log')
}

interface UserContribution {
  user: {
    contributionsCollection: {
      contributionCalendar: {
        weeks: {
          contributionDays: {
            contributionCount: number
            date: string
            weekday: number
          }[]
        }[]
      }
    }
  }
}

const runReminder = async (): Promise<number> => {
  const { data } = await client.query<UserContribution>({
    query: gql`
      query ($userName: String!) {
        user(login: $userName) {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                  weekday
                }
              }
            }
          }
        }
      }
    `,
    variables: {
      userName: 'kino-ma',
    },
  })

  // Sunday = 0, Monday = 1...
  const weekday = new Date().getDay()

  const { weeks } = data.user.contributionsCollection.contributionCalendar
  const thisWeek = weeks[weeks.length - 1]
  const today = thisWeek.contributionDays[weekday]
  const { contributionCount } = today

  if (contributionCount < 1) {
    await sendReminder()
  } else {
    await sendLog(contributionCount)
  }

  TODAY_COUNT = contributionCount.toString()

  return contributionCount
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function handleScheduled(event: ScheduledEvent): Promise<void> {
  const date = new Date(event.scheduledTime)

  if (date < startDate) {
    // If not to be started yet
    return
  } else if (date > endDate) {
    // If to be ended
    return
  }

  if (isFirstCall(date)) {
    TODAY_COUNT = '0'
  }

  if (Number(TODAY_COUNT) > 0) {
    return
  }

  await runReminder()
}

export const router = Router()

router.get(`/${SECRET_PATH}`, async () => {
  const contributionCount = await runReminder()
  const body = {
    contributionCount,
  }
  return new Response(JSON.stringify(body))
})

router.all('*', () => new Response('404, not found!', { status: 404 }))
