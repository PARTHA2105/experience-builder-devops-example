interface AppPortalState {
  portalUrl?: string
  clientId?: string
  appConfig?: {
    attributes?: {
      portalUrl?: string
      clientId?: string
    }
  }
}

function normalizePortalUrl(portalUrl: string | undefined): string | undefined {
  const normalized = portalUrl?.trim().replace(/\/+$/, '').toLowerCase()
  return normalized || undefined
}

export function getPortalAuthParams(configuredPortalUrl: string | undefined, configuredClientId: string | undefined, appState: AppPortalState) {
  const appPortalUrl = appState.portalUrl ?? appState.appConfig?.attributes?.portalUrl
  const portalUrl = configuredPortalUrl?.trim() || appPortalUrl
  const samePortal = normalizePortalUrl(portalUrl) === normalizePortalUrl(appPortalUrl)
  const appClientId = appState.clientId?.trim() || appState.appConfig?.attributes?.clientId?.trim()
  const clientId = configuredClientId?.trim() || (samePortal ? appClientId : undefined)

  return {
    desUrl: portalUrl,
    ...(clientId ? { clientId } : {})
  }
}
