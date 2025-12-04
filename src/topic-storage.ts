import * as z from './type-check'

export const alarmSchema = z.object({
  id: z.string(),
  params: z.array(z.string()),
  template: z.string(),
  thumbUrl: z.nullable(z.string()),
  category: z.string(),
  isRead: z.boolean(),
  created: z.string(),
  link: z.object({
    category: z.string(),
    target: z.nullable(z.string()),
    hash: z.nullable(z.string()),
    groupId: z.nullable(z.string()),
  }),
})

export type Alarm = z.infer<typeof alarmSchema>

interface ChromeStorage {
  createdTopics: Record<string, Alarm>
}

const { createdTopics } = await chrome.storage.local.get<ChromeStorage>({ createdTopics: {} })
const cachedTopics: Record<string, Alarm> = {}

let update = false
function queueUpdate() {
  if (update) return
  update = true
  queueMicrotask(() => {
    update = false
    chrome.storage.local.set({ createdTopics })
  })
}

export function getTopic(id: string) {
  return createdTopics[id] || cachedTopics[id]
}

export function hasTopic(id: string) {
  return id in createdTopics
}

export function setTopic(id: string, alarm: Alarm) {
  createdTopics[id] = alarm
  queueUpdate()
}

export function removeTopic(id: string) {
  const topic = createdTopics[id]
  if (topic) cachedTopics[id] = topic
  delete createdTopics[id]
  queueUpdate()
}
