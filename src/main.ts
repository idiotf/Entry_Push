import {
  selectTopics,
  readTopic,
  alarmTemplates,
  entryURL,
  spaceEntryURL,
} from './entry'

import { type Alarm, alarmSchema, getTopic, removeTopic, setTopic } from './topic-storage'

const alarmName = 'select-entry-topics'
const iconUrl = new URL('/android-chrome-512x512.png', entryURL) + ''

let waitingResponse = false
chrome.alarms.onAlarm.addListener(async alarm => {
  if (waitingResponse || !navigator.onLine || alarm.name != alarmName) return

  waitingResponse = true
  const topics = await selectTopics().finally(() => waitingResponse = false)
  if (!topics) return

  for (const rawTopic of topics) try {
    const topic = alarmSchema.parse(rawTopic)
    if (topic.isRead || getTopic(topic.id)) continue
    setTopic(topic.id, topic)

    const titleTemplate = `topic_badge_${topic.category}`
    const options: chrome.notifications.NotificationCreateOptions = {
      type: topic.thumbUrl ? 'image' : 'basic',
      iconUrl,
      title: alarmTemplates[titleTemplate] || titleTemplate,
      message: createAlarmMessage(alarmTemplates[topic.template] || topic.template, topic.params),
      eventTime: +new Date(topic.created),
      imageUrl: topic.thumbUrl ? new URL(topic.thumbUrl, entryURL) + '' : undefined,
    }

    chrome.notifications.create(topic.id, options).catch(() => {
      delete options.imageUrl
      options.type = 'basic'
      return chrome.notifications.create(topic.id, options)
    })
  } catch (e) {
    console.error(e)
  }
})

const createAlarmMessage = (template: string, params: string[]) =>
  template.replace(/%\d+/g, (str: string) => params[+str.substring(1)]!)

chrome.notifications.onClicked.addListener(async id => {
  const alarm = getTopic(id)
  if (!alarm) return

  await readTopic(id)
  removeTopic(id)

  const url = createAlarmLink(alarm)
  if (url) chrome.tabs.create({ url })
})

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

  if (category in commonAlarmURL) return `${commonAlarmURL[category as keyof typeof commonAlarmURL]}/${target || ''}${hashURL}`
}

await chrome.alarms.clear(alarmName)
await chrome.alarms.create(alarmName, {
  periodInMinutes: 1.5 / 60,
})
