import { React, getAppStore, observeStore } from 'jimu-core'
import type GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import Graphic from '@arcgis/core/Graphic'
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol'
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import type MapView from '@arcgis/core/views/MapView'
import type Polygon from '@arcgis/core/geometry/Polygon'
import { arcgisUserId, canReviewPlans, isAuthenticated, PLANNER_USER_IDS } from './authorization'
import { colorForDistrictId } from './AssignmentSymbols'
import { fetchAssignments, fetchMyPlans } from './PlanService'
import { clearAssignmentOverlaySources, getOrCreateAssignmentOverlay, replaceAssignmentOverlayGraphics, startAssignmentOverlayUpdate } from './AssignmentOverlay'

const { useEffect, useRef, useState } = React
const NUMERIC_FIELD_TYPES = ['esriFieldTypeInteger', 'esriFieldTypeSmallInteger', 'esriFieldTypeDouble', 'esriFieldTypeSingle', 'esriFieldTypeOID', 'esriFieldTypeBigInteger']

function geoidWhere(baseLayer: FeatureLayer, geoids: string[]): string {
  const field = baseLayer.fields?.find((candidate) => candidate.name.toUpperCase() === 'GEOID20')
  const values = field && NUMERIC_FIELD_TYPES.includes(field.type)
    ? geoids.join(',')
    : geoids.map((geoid) => `'${geoid.replace(/'/g, "''")}'`).join(',')
  return `GEOID20 IN (${values})`
}

function rgba(hex: string, alpha: number): [number, number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha]
}

interface Props {
  view: MapView
  baseLayer: FeatureLayer
  serviceUrl: string
}

export function AssignmentMapLoader({ view, baseLayer, serviceUrl }: Props): null {
  const [currentUser, setCurrentUser] = useState(() => getAppStore().getState().user)
  const [layerReady, setLayerReady] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const layerRef = useRef<GraphicsLayer | undefined>(undefined)
  const zoomedUserIdRef = useRef<string | undefined>(undefined)

  useEffect(() => observeStore(() => {
    setCurrentUser(getAppStore().getState().user)
  }, ['user']), [])

  useEffect(() => {
    const refresh = () => { setRefreshToken((value) => value + 1) }
    window.addEventListener('redistricting:review-queue-updated', refresh)
    window.addEventListener('redistricting:assignments-updated', refresh)
    return () => {
      window.removeEventListener('redistricting:review-queue-updated', refresh)
      window.removeEventListener('redistricting:assignments-updated', refresh)
    }
  }, [])

  useEffect(() => {
    const graphicsLayer = getOrCreateAssignmentOverlay(view)
    layerRef.current = graphicsLayer
    setLayerReady(true)
    const handle = view.map.layers.on('change', () => {
      const topLayer = getOrCreateAssignmentOverlay(view)
      layerRef.current = topLayer
    })
    return () => {
      handle.remove()
      layerRef.current = undefined
      setLayerReady(false)
    }
  }, [view])

  useEffect(() => {
    const graphicsLayer = layerRef.current
    if (!layerReady || !graphicsLayer) return
    let cancelled = false
    clearAssignmentOverlaySources(graphicsLayer, 'startup:')
    if (!isAuthenticated(currentUser) || canReviewPlans(currentUser, PLANNER_USER_IDS)) {
      return
    }
    const userId = arcgisUserId(currentUser)
    if (!userId) {
      return
    }

    const source = `startup:${userId}`
    const version = startAssignmentOverlayUpdate(graphicsLayer, source)
    void (async () => {
      await baseLayer.load()
      const plans = await fetchMyPlans(serviceUrl, userId, currentUser.username)
      const oldestFirst = [...plans].sort((first, second) => (first.last_updated_date ?? 0) - (second.last_updated_date ?? 0))
      const planAssignments = await Promise.all(oldestFirst.map((plan) => fetchAssignments(serviceUrl, plan.plan_id)))
      const assignments: Array<{ planId: string; ownerUserId: string; geoid: string; districtId: number }> = []
      oldestFirst.forEach((plan, index) => {
        for (const [geoid, assignment] of planAssignments[index]) {
          assignments.push({ planId: plan.plan_id, ownerUserId: plan.owner_user_id, geoid, districtId: assignment.district_id })
        }
      })
      const geometryByGeoid = new Map<string, Polygon>()
      const geoids = Array.from(new Set(assignments.map((assignment) => assignment.geoid)))
      for (let start = 0; start < geoids.length; start += 200) {
        const result = await baseLayer.queryFeatures({
          where: geoidWhere(baseLayer, geoids.slice(start, start + 200)),
          outFields: ['GEOID20'],
          returnGeometry: true,
        })
        for (const feature of result.features) geometryByGeoid.set(String(feature.attributes.GEOID20), feature.geometry as Polygon)
      }
      if (cancelled) return

      const graphics: Graphic[] = []
      const boundaryGraphics: Graphic[] = []
      for (const assignment of assignments) {
        const geometry = geometryByGeoid.get(assignment.geoid)
        if (!geometry) continue
        const color = colorForDistrictId(assignment.districtId)
        graphics.push(new Graphic({
          geometry,
          attributes: {
            plan_id: assignment.planId,
            owner_user_id: assignment.ownerUserId,
            GEOID20: assignment.geoid,
            district_id: assignment.districtId,
          },
          symbol: new SimpleFillSymbol({
            color: rgba(color, 1),
            outline: { color: rgba(color, 1), width: 1.5 },
          }),
        }))
        boundaryGraphics.push(new Graphic({
          geometry,
          attributes: { GEOID20: assignment.geoid, study_area_boundary: true },
          symbol: new SimpleFillSymbol({
            color: [0, 0, 0, 0],
            outline: { color: [255, 255, 255, 1], width: 1.25 },
          }),
        }))
      }
      graphics.push(...boundaryGraphics)
      if (!cancelled) replaceAssignmentOverlayGraphics(graphicsLayer, source, version, graphics)
      const allGeometries = Array.from(geometryByGeoid.values())
      if (!cancelled && graphics.length > 0 && allGeometries.length > 0 && zoomedUserIdRef.current !== userId) {
        let extent = allGeometries[0].extent.clone()
        for (const geometry of allGeometries.slice(1)) extent = extent.union(geometry.extent)
        zoomedUserIdRef.current = userId
        try {
          await view.goTo({ target: extent.expand(1.2) })
        } catch (error) {
          if (!cancelled) console.warn('Zoom to saved assignments failed; the assignment graphics are still visible.', error)
        }
      }
    })().catch((error) => {
      if (!cancelled) console.error('Startup assignment overlay failed', error)
    })

    return () => { cancelled = true }
  }, [baseLayer, currentUser, layerReady, refreshToken, serviceUrl, view])

  return null
}
