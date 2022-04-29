import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  useQuery,
  gql,
} from '@apollo/client'

declare var GITHUB_TOKEN: string
console.log({ GITHUB_TOKEN })

const client = new ApolloClient({
  uri: 'https://api.github.com/graphql',
  cache: new InMemoryCache(),
  headers: {
    authorization: `Bearer ${GITHUB_TOKEN}`,
    'user-agent': 'apollo-js',
  },
})

export async function handleRequest(request: Request): Promise<Response> {
  const { data } = await client.query({
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

  return new Response(JSON.stringify(data))
}
