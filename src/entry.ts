import * as z from './type-check'
import tryAgain from './try-again'
import { host_permissions } from '../build/manifest.json'

export const entryURL = host_permissions[0]!
export const spaceEntryURL = 'https://space.playentry.org'

const propsSchema = z.object({
  initialProps: z.object({
    csrfToken: z.string(),
  }),
  pageProps: z.object({
    initialState: z.object({
      common: z.object({
        user: z.object({
          xToken: z.string(),
        }),
      }),
    }),
    _nextI18Next: z.object({
      initialI18nStore: z.object({
        ko: z.object({
          alarm: z.custom(v => {
            if (!v) throw TypeError()
            return v as Record<string, string>
          }),
        }),
      }),
    }),
  }),
})

const graphqlURL = new URL('/graphql', entryURL)
const nextDataRegex = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/

const getServerSideProps = tryAgain(async () => {
  if (!navigator.onLine) throw Error('The internet connection has been lost.')

  const res = await fetch(entryURL, { signal: AbortSignal.timeout(10_000) })
  const html = await res.text()

  const match = nextDataRegex.exec(html)
  if (!match?.[1]) throw Error('Could not find __NEXT_DATA__ script tag in HTML.')

  const nextData = JSON.parse(match[1])
  return propsSchema.parse(nextData.props)
})

let props = await getServerSideProps()
export let alarmTemplates = props.pageProps._nextI18Next.initialI18nStore.ko.alarm

const PROPS_RELOAD_DELAY = 10_000
setTimeout(async function step() {
  props = await getServerSideProps()
  alarmTemplates = props.pageProps._nextI18Next.initialI18nStore.ko.alarm
  setTimeout(step, PROPS_RELOAD_DELAY)
}, PROPS_RELOAD_DELAY)

export async function request(query: string, variables?: unknown, init?: RequestInit): Promise<unknown> {
  const csrfToken = props.initialProps.csrfToken
  const user = props.pageProps.initialState.common.user

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Csrf-Token': csrfToken,
  })
  if (user) headers.set('X-Token', user.xToken)

  const res = await fetch(graphqlURL, {
    ...init,
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(10_000),
  })
  return res.json()
}

const SELECT_TOPICS = 'query($pageParam:PageParam,$searchAfter:JSON){topicList(pageParam:$pageParam,searchAfter:$searchAfter){searchAfter,list{id,params,template,thumbUrl,category,isRead,created,link{category,target,hash,groupId}}}}'
const READ_TOPIC    = 'mutation($id:ID!){readTopic(id:$id){status,result}}'

const selectTopicsSchema = z.object({
  data: z.object({
    topicList: z.nullable(z.object({
      list: z.array(z.unknown()),
    })),
  }),
})

export const selectTopics = async () => {
  const json = await request(SELECT_TOPICS, { pageParams: { display: 50 } })
  return selectTopicsSchema.parse(json).data.topicList?.list || null
}

export const readTopic = tryAgain(async (id: string) => request(READ_TOPIC, { id }))
