import { React, type AllWidgetProps } from 'jimu-core'
import { JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import type { IMConfig } from '../config'
import { resolveServiceUrl } from './PlanService'
import { RedistrictingPanel } from './RedistrictingPanel'
import { AssignmentMapLoader } from './AssignmentMapLoader'

const { useState, useEffect } = React

export default function Widget(props: AllWidgetProps<IMConfig>) {
  const overlayOnly = props.config.overlayOnly
  const [jimuMapView, setJimuMapView] = useState<JimuMapView>()
  const [baseLayer, setBaseLayer] = useState<FeatureLayer>()
  const [serviceUrl, setServiceUrl] = useState<string>()

  useEffect(() => {
    if (!jimuMapView) return
    const titleHint = props.config.baseLayerTitle
    const featureLayers = jimuMapView.view.map.allLayers.filter((l) => l.type === 'feature')
    const match = (titleHint
      ? featureLayers.find((l) => l.title === titleHint)
      : featureLayers.find((l: any) => l.geometryType === 'polygon')) as FeatureLayer | undefined
    if (match) { setBaseLayer(match); setServiceUrl(resolveServiceUrl(match)) }
  }, [jimuMapView, props.config.baseLayerTitle])

  return (
  <div className="jimu-widget" aria-hidden={overlayOnly || undefined} style={overlayOnly
    ? { position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }
    : { height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
    {props.useMapWidgetIds?.length === 1 && (
      <JimuMapViewComponent useMapWidgetId={props.useMapWidgetIds[0]} onActiveViewChange={(jmv) => { if (jmv) setJimuMapView(jmv) }} />
    )}
    {!baseLayer && !overlayOnly && <div style={{ padding: 16 }}>Waiting for the map's base layer to load…</div>}
    {baseLayer && serviceUrl && jimuMapView && (
      <>
        <AssignmentMapLoader view={jimuMapView.view as __esri.MapView} baseLayer={baseLayer} serviceUrl={serviceUrl} />
        {!overlayOnly && <RedistrictingPanel view={jimuMapView.view as __esri.MapView} baseLayer={baseLayer} serviceUrl={serviceUrl} config={props.config} />}
      </>
    )}
  </div>
)
}