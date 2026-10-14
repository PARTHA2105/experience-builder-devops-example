import { errorDetails } from '../src/runtime/error-details'

describe('errorDetails', () => {
  it('returns Error messages', () => {
    expect(errorDetails(new Error('Request failed'))).toBe('Request failed')
  })

  it('includes ArcGIS server details and error codes', () => {
    expect(errorDetails({
      message: 'Failed to execute query.',
      details: ['Token Required'],
      code: 499,
    })).toBe('Failed to execute query.: Token Required (code 499)')
  })

  it('reads messages from ArcGIS error envelopes', () => {
    expect(errorDetails({ error: { message: 'Editing is not allowed.' } })).toBe('Editing is not allowed.')
  })

  it('uses a readable fallback for unknown values', () => {
    expect(errorDetails(null)).toBe('Unknown service error.')
  })
})
