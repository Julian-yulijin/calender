const DAY_NAMES = [
  '初一',
  '初二',
  '初三',
  '初四',
  '初五',
  '初六',
  '初七',
  '初八',
  '初九',
  '初十'
]

function dayToChinese(day: number): string {
  if (day <= 0) return ''
  if (day <= 10) return DAY_NAMES[day - 1]
  if (day < 20) return `十${DAY_NAMES[day - 11]}`
  if (day === 20) return '二十'
  if (day < 30) return `二十${DAY_NAMES[day - 21]}`
  if (day === 30) return '三十'
  return `${day}`
}

/** 使用 Intl 中国农历历法输出“农历九月十七”这类文本；不支持时返回空字符串 */
export function lunarText(date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      month: 'long',
      day: 'numeric'
    }).formatToParts(date)
    const month = parts.find((p) => p.type === 'month')?.value ?? ''
    const day = Number(parts.find((p) => p.type === 'day')?.value ?? '0')
    if (!month || !day) return ''
    return `农历${month}${dayToChinese(day)}`
  } catch {
    return ''
  }
}
