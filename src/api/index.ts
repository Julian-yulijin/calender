import { localAdapter } from '../data/localAdapter'
import type { DataAdapter } from '../data/repositories'

/**
 * 统一 API 出口。
 * 目前固定使用 LocalAdapter（IndexedDB，本地优先、无真实服务器）。
 * 未来接入真实后端时，只需在此处替换为：
 *   import { createHttpAdapter } from '../data/httpAdapter'
 *   const adapter = createHttpAdapter({ baseUrl: 'https://api.example.com' })
 */
const adapter: DataAdapter = localAdapter

export const api = {
  adapterName: adapter.name,
  events: adapter.events,
  attachments: adapter.attachments
}

export type { DataAdapter }
