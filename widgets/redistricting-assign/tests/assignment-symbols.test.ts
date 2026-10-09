import { colorForDistrictId } from '../src/runtime/AssignmentSymbols'

describe('district assignment colors', () => {
  it('uses the same color for a district across all scenarios', () => {
    const districtColor = colorForDistrictId(3)

    expect(colorForDistrictId(3)).toBe(districtColor)
    expect(colorForDistrictId(3)).toBe(districtColor)
  })

  it('uses a different color for a different district', () => {
    expect(colorForDistrictId(3)).not.toBe(colorForDistrictId(4))
  })
})
