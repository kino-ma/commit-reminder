import { ApolloClient, InMemoryCache, gql } from '@apollo/client/core'

import { getTimeOfToday } from './lib'
import { Slack } from './slack'

declare const CR_KV: KVNamespace
const LAST_LOG_DATE = 'LAST_LOG_DATE'

const MENTION = `<@${SLACK_USER_ID}>`

const TIMEZONE = 9
const START_HOUR = 22 - TIMEZONE
const START_MINUTE = 30
const END_HOUR = 23 - TIMEZONE
const END_MINUTE = 59

const client = new ApolloClient({
  uri: 'https://api.github.com/graphql',
  cache: new InMemoryCache(),
  headers: {
    authorization: `Bearer ${GITHUB_TOKEN}`,
    'user-agent': 'apollo-js',
  },
})

const slack = new Slack(SLACK_WEBHOOK_URL)

type Log = {
  name: 'log'
  contributionCount?: number
}
type Reminder = 'reminder'
type Nothing = 'nothing'

type MessageType = Log | Reminder | Nothing
type Message = {
  typ: MessageType
  date: Date
}

export const newMessage = (
  date: Date,
  contributionCount: number,
  lastSentDate: string,
): Message => {
  // send reminder
  if (contributionCount < 1) {
    return {
      typ: 'reminder',
      date,
    }
  }

  // send nothing
  if (isSameDate(lastSentDate, date)) {
    return {
      typ: 'nothing',
      date,
    }
  }

  // send log
  return {
    typ: {
      name: 'log',
      contributionCount,
    },
    date,
  }
}

const logText = ({ contributionCount }: Log): string => {
  if (contributionCount) {
    return `You have achived today's contribution goal! :tada:\nToday's contribution(s): *${contributionCount}*`
  } else {
    return `You have achived today's contribution goal! :tada:`
  }
}

export const isTimeToSend = (date: Date): boolean => {
  const startDate = getTimeOfToday(START_HOUR, START_MINUTE)
  const endDate = getTimeOfToday(END_HOUR, END_MINUTE)
  console.log(`start: ${startDate}, end: ${endDate}, date: ${date}`)
  return startDate <= date && date < endDate
}

export const isSameDate = (jstDateA: string, utcDateB: Date): boolean => {
  const jstDateB = new Date(utcDateB.valueOf())
  jstDateB.setHours(jstDateB.getHours() + TIMEZONE)

  const dateB = jstDateB.getDate().toString()

  console.log(`sameDate: ${[jstDateA, dateB]}`)
  return jstDateA === dateB
}

const send = async (message: Message): Promise<void> => {
  if (!isTimeToSend(message.date) || message.typ === 'nothing') {
    console.log(`skipping log.`)
    return
  }

  if (typeof message.typ !== 'string' && message.typ.name === 'log') {
    await sendLog(message.typ)
  } else if (message.typ === 'reminder') {
    await sendReminder(message.typ)
  }
}

const sendReminder = async (_reminder: Reminder) => {
  const text = `Contribute to GitHub at least 1 time\n${MENTION}`
  await slack.send(text)
  console.log('sent a reminder')
}

const sendLog = async (log: Log) => {
  const text = logText(log)
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

export const runReminder = async (
  date: Date,
  reallySend = true,
): Promise<number> => {
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

  if (!reallySend) {
    // If not to be started yet or to be ended
    return contributionCount
  }

  const lastSentDate = (await CR_KV.get(LAST_LOG_DATE)) ?? ''

  const msg = newMessage(date, contributionCount, lastSentDate)
  await send(msg)

  return contributionCount
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function handleScheduled(event: ScheduledEvent): Promise<void> {
  const date = new Date(event.scheduledTime)
  await runReminder(date)
}
