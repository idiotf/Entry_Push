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

const entryURL = 'https://playentry.org'
const spaceEntryURL = 'https://space.playentry.org'

const nextData = fetch(entryURL).then(v => v.text()).then(v => {
  const data = parse(v).getElementById('__NEXT_DATA__')?.textContent
  if (!data) throw new TypeError('Cannot get __NEXT_DATA__')
  return JSON.parse(data)
})
const createdTopics: Record<string, any> = {}
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

  for (const topic of topics) if (!topic.isRead && !createdTopics.hasOwnProperty(topic.id)) {
    createdTopics[topic.id] = topic
    chrome.notifications.create(topic.id, {
      type: topic.thumbUrl ? 'image' : 'basic',
      iconUrl: 'https://playentry.org/android-chrome-512x512.png',
      title: (await nextData).props.pageProps._nextI18Next.initialI18nStore.ko.alarm[`topic_badge_${topic.category}`],
      message: (await nextData).props.pageProps._nextI18Next.initialI18nStore.ko.alarm[topic.template].replace(/%\d+/g, (str: string) => topic.params[str.substring(1)]),
      imageUrl: topic.thumbUrl ? new URL(topic.thumbUrl, entryURL).toString() : void 0,
    })
  }
})

chrome.notifications.onClicked.addListener(async id => {
  const alarm = createdTopics[id]
  if (!alarm) return
  await request('READ_TOPICS', `
    mutation READ_TOPIC($id: ID!) {
      readTopic(id: $id) {  
        status
        result
      }
    }
  `, { id })
  const url = createAlarmLink(alarm)
  if (url) chrome.tabs.create({ url })
})

interface Alarm {
  link: {
    category: keyof typeof commonAlarmURL | 'etc'
    target: string
    hash: string
    groupId: string
  }
}

const commonAlarmURL = {
  project:    new URL('/project', entryURL),
  user:       new URL('/profile', entryURL),
  lecture:    new URL('/study/lecture', entryURL),
  curriculum: new URL('/study/curriculum', entryURL),
  suggestion: new URL('/suggestion', entryURL),
  qna:        new URL('/community/qna', entryURL),
  notice:     new URL('/community/notice', entryURL),
  tips:       new URL('/community/tips', entryURL),
  free:       new URL('/community/entrystory', entryURL),
  staff:      new URL('/project', entryURL),
  reflect:    new URL('/reflect', entryURL),
  discovery:  new URL('/discovery', entryURL),

  space_explore: new URL('/explore', spaceEntryURL),
  space_world:   new URL('/world', spaceEntryURL),
}

const groupAlarmURL = {
  project:    new URL('/group/project', entryURL),
  lecture:    new URL('/group/study/lecture', entryURL),
  curriculum: new URL('/group/study/curriculum', entryURL),
  discuss:    new URL('/group/community', entryURL),
  homework:   new URL('/group/homework', entryURL),
}

function createAlarmLink(alarm: Alarm) {
  const { link: { category, target, hash, groupId } } = alarm
  const hashURL = hash ? `#${hash}` : ''

  if ('etc' == category && target) return target + hashURL

  if (groupId) {
    const groupCategory = category == groupId ? 'discuss' : category
    if (groupCategory in groupAlarmURL) return `${groupAlarmURL[groupCategory as keyof typeof groupAlarmURL]}/${target}/${groupId}${hashURL}`
  }

  if (category in commonAlarmURL) return `${commonAlarmURL[category as keyof typeof commonAlarmURL]}/${target}${hashURL}`
}
