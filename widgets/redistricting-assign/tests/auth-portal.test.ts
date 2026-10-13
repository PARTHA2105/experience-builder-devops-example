import { getPortalAuthParams } from '../src/runtime/auth-portal'

describe('getPortalAuthParams', () => {
  const appState = {
    portalUrl: 'https://www.arcgis.com',
    clientId: 'app-client-id'
  }

  it('uses the app portal and its client when no override is configured', () => {
    expect(getPortalAuthParams(undefined, appState)).toEqual({
      desUrl: 'https://www.arcgis.com',
      clientId: 'app-client-id'
    })
  })

  it('does not send the app client ID to a different authentication portal', () => {
    expect(getPortalAuthParams('https://schoolsite.maps.arcgis.com', appState)).toEqual({
      desUrl: 'https://schoolsite.maps.arcgis.com'
    })
  })

  it('keeps the app client when the configured portal matches despite a trailing slash', () => {
    expect(getPortalAuthParams('https://www.arcgis.com/', appState)).toEqual({
      desUrl: 'https://www.arcgis.com/',
      clientId: 'app-client-id'
    })
  })
})
