type ErrorRecord = Record<string, unknown>

function asRecord(value: unknown): ErrorRecord | undefined {
  return typeof value === 'object' && value !== null ? value as ErrorRecord : undefined
}

function messageOf(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  const record = asRecord(value)
  return typeof record?.message === 'string' && record.message.trim() ? record.message.trim() : undefined
}

export function errorDetails(error: unknown): string {
  const record = asRecord(error)
  const message = error instanceof Error ? error.message : messageOf(error)
  const nestedMessage = messageOf(record?.error)
  const details = Array.isArray(record?.details)
    ? record.details.map(messageOf).filter((value): value is string => Boolean(value))
    : [messageOf(record?.details)].filter((value): value is string => Boolean(value))
  const parts = Array.from(new Set([message, nestedMessage, ...details].filter((value): value is string => Boolean(value))))
  const code = record?.code
  const codeSuffix = typeof code === 'string' || typeof code === 'number' ? ` (code ${code})` : ''

  return parts.length > 0 ? `${parts.join(': ')}${codeSuffix}` : 'Unknown service error.'
}
