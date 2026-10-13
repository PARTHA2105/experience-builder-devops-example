interface AppPortalState {
  portalUrl?: string
  clientId?: string
}

export function getPortalAuthParams(configuredPortalUrl: string | undefined, configuredClientId: string | undefined, appState: AppPortalState) {
  const portalUrl = configuredPortalUrl?.trim() || appState.portalUrl
  const appPortalUrl = appState.portalUrl?.replace(/\/+$/, '')
  const authPortalUrl = portalUrl?.replace(/\/+$/, '')
  const clientId = configuredClientId?.trim() || (appPortalUrl === authPortalUrl ? appState.clientId : undefined)

  return {
    desUrl: portalUrl,
    ...(clientId ? { clientId } : {})
  }
}
