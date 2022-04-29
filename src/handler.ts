import { ApolloClient, InMemoryCache, gql } from '@apollo/client/core'
import { Slack } from './slack'

declare const GITHUB_TOKEN: string
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const SLACK_BOT_TOKEN: string
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const SLACK_SIGNING_SECRET: string
declare const SLACK_WEBHOOK_URL: string
declare const SLACK_USER_ID: string

const MENTION = `<@${SLACK_USER_ID}>`

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
    text = `Today's contribution(s): *${contributionCount}*\n${MENTION}`
  } else {
    text = `You have achived today's contribution goal! :tada:\n${MENTION}`
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function handleRequest(_: Request): Promise<Response> {
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

  return new Response(JSON.stringify({ contributionCount }))
}
