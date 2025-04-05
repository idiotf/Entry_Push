import parse from 'node-html-parser'

await chrome.alarms.clear('select-entry-topics')
await chrome.alarms.create('select-entry-topics', {
  periodInMinutes: 1.5 / 60,
})

async function request(queryName: string, query: string, variables: object) {
  const { props: { initialProps: { csrfToken }, pageProps: { initialState: { common: { user } } } } } = await nextData
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Csrf-Token': csrfToken,
  })
  if (user) headers.set('X-Token', user.xToken)
  return fetch('https://playentry.org/graphql/' + queryName, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  }).then(v => v.json())
}

const nextData = fetch('https://playentry.org').then(v => v.text()).then(v => {
  const data = parse(v).getElementById('__NEXT_DATA__')?.textContent
  if (!data) throw new TypeError('Cannot get __NEXT_DATA__')
  return JSON.parse(data)
})
const createdTopics = new Set
chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name != 'select-entry-topics') return

  const topics = await request('SELECT_TOPICS', `
    query SELECT_TOPICS($pageParam: PageParam, $searchAfter: JSON) {
      topicList(pageParam: $pageParam, searchAfter: $searchAfter) {
        searchAfter
        list {
          id
          params
          template
          thumbUrl
          category
          target
          isRead
          created
          updated
          link {
            category
            target
            hash
            groupId
          }
          topicinfo {
            category
            targetId
          }
        }
      }
    }
  `, { pageParams: { display: 50 } }).then(v => v.data?.topicList?.list)
  if (!topics) return

  for (const topic of topics) if (!topic.isRead && !createdTopics.has(topic.id)) {
    createdTopics.add(topic.id)
    chrome.notifications.create(topic.id, {
      type: 'basic',
      iconUrl: 'https://playentry.org/android-chrome-512x512.png',
      title: (await nextData).props.pageProps._nextI18Next.initialI18nStore.ko.alarm[`topic_badge_${topic.category}`],
      message: (await nextData).props.pageProps._nextI18Next.initialI18nStore.ko.alarm[topic.template].replace(/%\d+/g, (str: string) => topic.params[str.substring(1)]),
    })
  }
})
