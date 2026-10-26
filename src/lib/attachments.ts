import type { AttachmentKind, AttachmentMeta } from '../types'

const DOCUMENT_TYPES = [
  'pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/zip',
  'application/json'
]

export function attachmentKind(type: string, name: string): AttachmentKind {
  if (type.startsWith('image/')) return 'image'
  if (DOCUMENT_TYPES.some((t) => type.startsWith(t))) return 'document'
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv', 'zip'].includes(ext)) {
    return 'document'
  }
  return 'other'
}

export function isImageAttachment(meta: AttachmentMeta): boolean {
  return attachmentKind(meta.type, meta.name) === 'image'
}
