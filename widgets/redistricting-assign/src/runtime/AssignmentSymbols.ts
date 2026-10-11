const colorsByAssignment = new Map<string, string>()

function hash(value: string): number {
  let result = 2166136261
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const section = hue / 60
  const secondary = chroma * (1 - Math.abs(section % 2 - 1))
  const offset = lightness - chroma / 2
  const channels = section < 1 ? [chroma, secondary, 0]
    : section < 2 ? [secondary, chroma, 0]
      : section < 3 ? [0, chroma, secondary]
        : section < 4 ? [0, secondary, chroma]
          : section < 5 ? [secondary, 0, chroma]
            : [chroma, 0, secondary]
  return `#${channels.map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, '0')).join('')}`
}

export function colorForAssignmentId(assignmentId: string): string {
  const existing = colorsByAssignment.get(assignmentId)
  if (existing) return existing
  const value = hash(assignmentId)
  const color = hslToHex(value % 360, 0.72 + ((value >>> 8) % 14) / 100, 0.42 + ((value >>> 16) % 12) / 100)
  colorsByAssignment.set(assignmentId, color)
  return color
}

export function colorForDistrictId(districtId: number): string {
  const normalizedId = Math.max(1, Math.floor(Math.abs(districtId)))
  const hue = ((normalizedId - 1) * 137.50776405) % 360
  const lightness = 0.43 + ((normalizedId * 17) % 8) / 100
  return hslToHex(hue, 0.78, lightness)
}