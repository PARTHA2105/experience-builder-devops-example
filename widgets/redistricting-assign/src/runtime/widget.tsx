import { React, getAppStore, observeStore, SessionManager, type AllWidgetProps } from 'jimu-core'
import { JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import type { IMConfig } from '../config'
import { resolvePlanServiceSource, type PlanServiceSource } from './PlanService'
import { RedistrictingPanel } from './RedistrictingPanel'
import { AssignmentMapLoader } from './AssignmentMapLoader'
import { isAuthenticated } from './authorization'
import { getPortalAuthParams } from './auth-portal'
import { errorDetails } from './error-details'

const { useState, useEffect } = React

export default function Widget(props: AllWidgetProps<IMConfig>) {
  const overlayOnly = props.config.overlayOnly
  const [jimuMapView, setJimuMapView] = useState<JimuMapView>()
  const [activeMap, setActiveMap] = useState<__esri.Map | null>(null)
  const [baseLayer, setBaseLayer] = useState<FeatureLayer>()
  const [serviceUrl, setServiceUrl] = useState<PlanServiceSource>()
  const [serviceResolutionError, setServiceResolutionError] = useState<string>()
  const [currentUser, setCurrentUser] = useState(() => getAppStore().getState().user)
  const [loginError, setLoginError] = useState<string>()
  const [loginPending, setLoginPending] = useState(false)
  const [switchPending, setSwitchPending] = useState(false)
  const accountActionInFlight = React.useRef(false)
  const authenticated = isAuthenticated(currentUser)

  useEffect(() => observeStore(() => {
    setCurrentUser(getAppStore().getState().user)
  }, ['user']), [])

  useEffect(() => {
    if (!authenticated) return
    setLoginError(undefined)
    setLoginPending(false)
    setSwitchPending(false)
    accountActionInFlight.current = false
  }, [authenticated, currentUser?.id])

  useEffect(() => {
    if (!jimuMapView) return
    const updateMap = (map: __esri.Map | null) => {
      setActiveMap(map)
      setBaseLayer(undefined)
      setServiceUrl(undefined)
      setServiceResolutionError(undefined)
    }
    updateMap(jimuMapView.view.map ?? null)
    const handle = jimuMapView.view.watch('map', (map) => {
      updateMap(map ?? null)
    })
    return () => { handle.remove() }
  }, [jimuMapView])

  useEffect(() => {
    if (!activeMap) return
    const titleHint = props.config.baseLayerTitle
    const featureLayers = activeMap.allLayers.filter((l) => l.type === 'feature')
    const match = (titleHint
      ? featureLayers.find((l) => l.title === titleHint)
      : featureLayers.find((l: any) => l.geometryType === 'polygon')) as FeatureLayer | undefined
    setBaseLayer(match)
    setServiceUrl(undefined)
    setServiceResolutionError(undefined)
    if (match) {
      try {
        setServiceUrl(resolvePlanServiceSource(activeMap, match))
      } catch (error) {
        console.error('Scenario table discovery failed', error)
        setServiceResolutionError(errorDetails(error))
      }
    }
  }, [activeMap, props.config.baseLayerTitle])

  const runAccountAction = React.useCallback((action: () => Promise<unknown>, failureMessage: string, setPending: (pending: boolean) => void) => {
    if (accountActionInFlight.current) return Promise.resolve()
    accountActionInFlight.current = true
    setPending(true)
    setLoginError(undefined)
    let request: Promise<unknown>
    try {
      request = action()
    } catch (error) {
      console.error(failureMessage, error)
      setLoginError('Sign-in could not be started. Please try again.')
      accountActionInFlight.current = false
      setPending(false)
      return Promise.resolve()
    }
    return request
      .catch((error) => {
        console.error(failureMessage, error)
        setLoginError(`${failureMessage}: ${errorDetails(error)}`)
      })
      .finally(() => {
        accountActionInFlight.current = false
        setPending(false)
      })
  }, [])

  const signIn = React.useCallback(() => {
    const authParams = getPortalAuthParams(props.config.authPortalUrl, props.config.oauthClientId, getAppStore().getState())
    if (!authParams.clientId) {
      setLoginError('ArcGIS sign-in needs an OAuth client ID. Add it to the app configuration for this portal or enter it in this widget’s OAuth client ID setting, then redeploy.')
      return Promise.resolve()
    }
    return runAccountAction(() => SessionManager.getInstance().signIn({
      ...authParams,
      popup: true,
      forceLogin: true
    }), 'ArcGIS sign-in was not completed', setLoginPending)
  }, [props.config.authPortalUrl, props.config.oauthClientId, runAccountAction])

  const switchAccount = React.useCallback(() => {
    const authParams = getPortalAuthParams(props.config.authPortalUrl, props.config.oauthClientId, getAppStore().getState())
    if (!authParams.clientId) {
      setLoginError('ArcGIS sign-in needs an OAuth client ID. Add it to the app configuration for this portal or enter it in this widget’s OAuth client ID setting, then redeploy.')
      return Promise.resolve()
    }
    return runAccountAction(() => SessionManager.getInstance().switchAccount({
      ...authParams,
      popup: true
    }), 'ArcGIS account switch was not completed', setSwitchPending)
  }, [props.config.authPortalUrl, props.config.oauthClientId, runAccountAction])

  const signOut = React.useCallback(() => {
    return runAccountAction(() => {
      SessionManager.getInstance().signOut({
        ...getPortalAuthParams(props.config.authPortalUrl, props.config.oauthClientId, getAppStore().getState()),
        redirectToSignOutPage: false
      })
      return Promise.resolve()
    }, 'ArcGIS sign-out was not completed', setSwitchPending)
  }, [props.config.authPortalUrl, props.config.oauthClientId, runAccountAction])

  return (
  <div className="jimu-widget" aria-hidden={overlayOnly || undefined} style={overlayOnly
    ? { position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }
    : { height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
    {props.useMapWidgetIds?.length === 1 && (
      <JimuMapViewComponent useMapWidgetId={props.useMapWidgetIds[0]} onActiveViewChange={(jmv) => {
        setJimuMapView(jmv ?? undefined)
        setActiveMap(jmv?.view?.map ?? null)
        if (!jmv) {
          setBaseLayer(undefined)
          setServiceUrl(undefined)
          setServiceResolutionError(undefined)
        }
      }} />
    )}
    {loginError && !baseLayer && !overlayOnly && !authenticated && <div role="alert" style={{ padding: 10 }}>
      {loginError}{' '}
      <button type="button" onClick={() => { void signIn() }} disabled={loginPending}>
        {loginPending ? 'Signing in…' : 'Try again'}
      </button>
    </div>}
    {!baseLayer && !overlayOnly && <div role="status" style={{ padding: 16 }}>
      {activeMap ? "Waiting for the map's base layer to load…" : 'Waiting for the map to reconnect…'}
    </div>}
    {serviceResolutionError && !overlayOnly && <div role="alert" style={{ padding: 12, color: '#b42318' }}>
      Scenario tables could not be resolved from the map: {serviceResolutionError}
    </div>}
    {activeMap && baseLayer && serviceUrl && jimuMapView && (
      <>
        <AssignmentMapLoader view={jimuMapView.view as __esri.MapView} baseLayer={baseLayer} serviceUrl={serviceUrl} />
        {!overlayOnly && <RedistrictingPanel view={jimuMapView.view as __esri.MapView} baseLayer={baseLayer} serviceUrl={serviceUrl} config={props.config} onSignIn={signIn} onSwitchAccount={switchAccount} onSignOut={signOut} isAccountActionPending={loginPending || switchPending} accountActionError={loginError} />}
      </>
    )}
  </div>
)
}