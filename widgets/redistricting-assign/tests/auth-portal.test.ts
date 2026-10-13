import { getPortalAuthParams } from '../src/runtime/auth-portal'

describe('getPortalAuthParams', () => {
  const appState = {
    portalUrl: 'https://www.arcgis.com',
    clientId: 'app-client-id'
  }

  it('uses the app portal and its client when no override is configured', () => {
    expect(getPortalAuthParams(undefined, undefined, appState)).toEqual({
      desUrl: 'https://www.arcgis.com',
      clientId: 'app-client-id'
    })
  })

  it('does not send the app client ID to a different authentication portal', () => {
    expect(getPortalAuthParams('https://schoolsite.maps.arcgis.com', undefined, appState)).toEqual({
      desUrl: 'https://schoolsite.maps.arcgis.com'
    })
  })

  it('keeps the app client when the configured portal matches despite a trailing slash', () => {
    expect(getPortalAuthParams('https://www.arcgis.com/', undefined, appState)).toEqual({
      desUrl: 'https://www.arcgis.com/',
      clientId: 'app-client-id'
    })
  })

  it('uses the configured OAuth client ID for a different authentication portal', () => {
    expect(getPortalAuthParams('https://schoolsite.maps.arcgis.com', ' organization-client-id ', appState)).toEqual({
      desUrl: 'https://schoolsite.maps.arcgis.com',
      clientId: 'organization-client-id'
    })
  })

  it('uses the configured OAuth client ID when the app portal does not provide one', () => {
    expect(getPortalAuthParams(undefined, ' deployed-client-id ', { portalUrl: 'https://www.arcgis.com' })).toEqual({
      desUrl: 'https://www.arcgis.com',
      clientId: 'deployed-client-id'
    })
  })
})
