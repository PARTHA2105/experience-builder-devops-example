import { React } from 'jimu-core'
import MapView from '@arcgis/core/views/MapView'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import Graphic from '@arcgis/core/Graphic'
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol'
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel'
import * as geometryEngineAsync from '@arcgis/core/geometry/geometryEngineAsync'
import Polygon from '@arcgis/core/geometry/Polygon'

import type { AssignmentState, PlanAssignmentRow, PlanDistrict, PlanMetrics } from './types'
import { fetchAssignments, commitPlan, districtNameForId, getAvailableDistricts, colorForDistrictId } from './PlanService'
import { colorForAssignmentId } from './AssignmentSymbols'
import { isCurrentAssignmentOverlayUpdate, replaceAssignmentOverlayGraphics, startAssignmentOverlayUpdate } from './AssignmentOverlay'

const { useCallback, useEffect, useMemo, useRef, useState } = React

export type SelectionMode = 'point' | 'polygon' | 'freehand' | 'circle' | 'rectangle'

function fillFor(colorHex: string) {
  return new SimpleFillSymbol({ color: hexToRgba(colorHex, 1), outline: { color: hexToRgba(colorHex, 1), width: 1.5 } })
}
function hexToRgba(hex: string, alpha: number): [number, number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha]
}
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
function buildGeoidInClause(baseLayer: FeatureLayer, geoids: string[]): string {
  const field = baseLayer.fields?.find((f) => f.name.toUpperCase() === 'GEOID20')
  const numericTypes = ['esriFieldTypeInteger', 'esriFieldTypeSmallInteger', 'esriFieldTypeDouble', 'esriFieldTypeSingle', 'esriFieldTypeOID', 'esriFieldTypeBigInteger']
  const isNumeric = field && numericTypes.includes(field.type)
  const values = isNumeric ? geoids.join(',') : geoids.map((g) => `'${g.replace(/'/g, "''")}'`).join(',')
  return `GEOID20 IN (${values})`
}

function buildObjectIdInClause(objectIdField: string, objectIds: number[]): string {
  return `${objectIdField} IN (${objectIds.join(',')})`
}

interface Args {
  view: MapView
  baseLayer: FeatureLayer
  overlayLayer: GraphicsLayer | undefined
  serviceUrl: string
  planId: string | undefined
  planObjectId: number | undefined
  districts: PlanDistrict[]
  currentUsername?: string
  initialAssignments?: Map<string, AssignmentState>
  parentPlanId?: string
  readonly?: boolean
}

export function useAssignmentTool({ view, baseLayer, overlayLayer, serviceUrl, planId, planObjectId, districts, currentUsername, initialAssignments, parentPlanId, readonly }: Args) {
  const baseLayerViewRef = useRef<__esri.FeatureLayerView | undefined>(undefined)
  const highlightHandleRef = useRef<__esri.Handle | undefined>(undefined)
  const selectedObjectIdsRef = useRef<Set<number>>(new Set())
  const clickHandleRef = useRef<__esri.Handle | undefined>(undefined)
  const geometryCacheRef = useRef<Map<string, Polygon>>(new Map())
  const populationCacheRef = useRef<Map<string, number>>(new Map()) // NEW: GEOID20 -> Population
  const serverSnapshotRef = useRef<Map<string, PlanAssignmentRow>>(new Map())
  const sketchLayerRef = useRef<GraphicsLayer | undefined>(undefined)
  const sketchVMRef = useRef<SketchViewModel | undefined>(undefined)
  const isSelectingRef = useRef(false)
  const selectionModeRef = useRef<SelectionMode>('point')

  const [assignments, setAssignments] = useState<Map<string, AssignmentState>>(new Map())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('point')
  const [targetDistrictId, setTargetDistrictId] = useState<number | 'unassign'>(1)
  const [isSaving, setIsSaving] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [metrics, setMetrics] = useState<PlanMetrics | undefined>(undefined) // NEW
  const [studyAreaPopulation, setStudyAreaPopulation] = useState(0)
  const [studyAreaPopulationReady, setStudyAreaPopulationReady] = useState(false)
  const [highlightedAssignmentId, setHighlightedAssignmentId] = useState<string>()

  useEffect(() => { isSelectingRef.current = isSelecting }, [isSelecting])
  useEffect(() => { selectionModeRef.current = selectionMode }, [selectionMode])

  useEffect(() => {
    view.popupEnabled = !isSelecting
    return () => { view.popupEnabled = true }
  }, [view, isSelecting])

  const districtById = useMemo(() => {
    const m = new Map<number, PlanDistrict>()
    for (const d of districts) m.set(d.district_id, d)
    return m
  }, [districts])

  useEffect(() => {
    let cancelled = false
    setStudyAreaPopulationReady(false)
    ;(async () => {
      await baseLayer.load()
      const objectIds = (await baseLayer.queryObjectIds({ where: '1=1' }) ?? []).map(Number).filter(Number.isFinite)
      if (!objectIds || objectIds.length === 0) {
        if (!cancelled) {
          setStudyAreaPopulation(0)
          setStudyAreaPopulationReady(true)
        }
        return
      }
      let total = 0
      const objectIdField = baseLayer.objectIdField || 'OBJECTID'
      for (const objectIdChunk of chunk(objectIds, 200)) {
        const result = await baseLayer.queryFeatures({
          where: buildObjectIdInClause(objectIdField, objectIdChunk),
          outFields: ['GEOID20', 'Population'],
          returnGeometry: false,
        })
        for (const feature of result.features) {
          const geoid = String(feature.attributes.GEOID20)
          const population = Number(feature.attributes.Population) || 0
          populationCacheRef.current.set(geoid, population)
          total += population
        }
      }
      if (!cancelled) {
        setStudyAreaPopulation(total)
        setStudyAreaPopulationReady(true)
      }
    })().catch((error) => console.warn('Study-area population load failed', error))
    return () => { cancelled = true }
  }, [baseLayer])

  const recomputeMetrics = useCallback(() => {
    if (!studyAreaPopulationReady) {
      setMetrics(undefined)
      return
    }
    const beforeByDistrict = new Map<number, number>()
    for (const [geoid, row] of serverSnapshotRef.current) {
      const pop = populationCacheRef.current.get(geoid) ?? 0
      beforeByDistrict.set(row.district_id, (beforeByDistrict.get(row.district_id) ?? 0) + pop)
    }
    const afterByDistrict = new Map<number, number>()
    for (const [geoid, a] of assignments) {
      const pop = populationCacheRef.current.get(geoid) ?? 0
      afterByDistrict.set(a.district_id, (afterByDistrict.get(a.district_id) ?? 0) + pop)
    }
    const configuredDistricts = districts.length > 0 ? districts : getAvailableDistricts()
    const districtIds = new Set(configuredDistricts.map((district) => district.district_id))
    for (const id of beforeByDistrict.keys()) districtIds.add(id)
    for (const id of afterByDistrict.keys()) districtIds.add(id)
    const districtMetrics = Array.from(districtIds).map((id) => {
      const before = beforeByDistrict.get(id) ?? 0
      const after = afterByDistrict.get(id) ?? 0
      return { district_id: id, district_name: districtNameForId(id), color: colorForDistrictId(id), populationBefore: before, populationAfter: after, difference: after - before }
    })
    const beforeValues = districtMetrics.map((d) => d.populationBefore)
    const afterValues = districtMetrics.map((d) => d.populationAfter)
    const assignedPopulation = afterValues.reduce((a, b) => a + b, 0)
    const totalPopulation = studyAreaPopulation || assignedPopulation
    const ideal = districtMetrics.length > 0 ? totalPopulation / districtMetrics.length : 0
    const highest = afterValues.length ? Math.max(...afterValues) : 0
    const lowest = afterValues.length ? Math.min(...afterValues) : 0
    const deviationBeforePercent = ideal > 0 && beforeValues.length
      ? Math.max(...beforeValues.map((population) => Math.abs(population - ideal))) / ideal * 100
      : 0
    const deviationPercent = ideal > 0 && afterValues.length
      ? Math.max(...afterValues.map((population) => Math.abs(population - ideal))) / ideal * 100
      : 0
    setMetrics({
      districts: districtMetrics,
      studyAreaPopulation: totalPopulation,
      assignedPopulation,
      unassignedPopulation: Math.max(totalPopulation - assignedPopulation, 0),
      idealPopulation: ideal,
      highest,
      lowest,
      deviationBeforePercent,
      deviationPercent,
    })
  }, [assignments, districts, studyAreaPopulation, studyAreaPopulationReady])

  const applyOverlay = useCallback(
    async (current: Map<string, { district_id: number; color: string }>) => {
      if (!overlayLayer) return
      const source = 'active-editor'
      const updateVersion = startAssignmentOverlayUpdate(overlayLayer, source)
      if (current.size === 0) {
        replaceAssignmentOverlayGraphics(overlayLayer, source, updateVersion, [])
        return
      }
      const missing = Array.from(current.keys()).filter((g) => !geometryCacheRef.current.has(g))
      if (missing.length > 0) {
        await baseLayer.load()
        for (const geoidChunk of chunk(missing, 200)) {
          const result = await baseLayer.queryFeatures({ where: buildGeoidInClause(baseLayer, geoidChunk), outFields: ['GEOID20', 'Population'], returnGeometry: true })
          for (const f of result.features) {
            const geoid = String(f.attributes.GEOID20)
            geometryCacheRef.current.set(geoid, f.geometry as Polygon)
            populationCacheRef.current.set(geoid, Number(f.attributes.Population) || 0)
          }
        }
      }
      const graphics: Graphic[] = []
      const boundaryGraphics: Graphic[] = []
      for (const [geoid, a] of current) {
        const geom = geometryCacheRef.current.get(geoid)
        if (!geom) continue
        const color = colorForDistrictId(a.district_id)
        graphics.push(new Graphic({
          geometry: geom,
          attributes: { plan_id: planId, GEOID20: geoid, district_id: a.district_id },
          symbol: fillFor(color),
        }))
        boundaryGraphics.push(new Graphic({
          geometry: geom,
          attributes: { GEOID20: geoid, study_area_boundary: true },
          symbol: new SimpleFillSymbol({
            color: [0, 0, 0, 0],
            outline: { color: [255, 255, 255, 1], width: 1.25 },
          }),
        }))
      }
      if (!isCurrentAssignmentOverlayUpdate(overlayLayer, source, updateVersion)) return
      graphics.push(...boundaryGraphics)
      if (highlightedAssignmentId) {
        const geometry = geometryCacheRef.current.get(highlightedAssignmentId)
        const assignmentId = assignments.get(highlightedAssignmentId)?.assignmentId ?? highlightedAssignmentId
        if (geometry) graphics.push(new Graphic({
          geometry,
          attributes: { assignment_id: assignmentId },
          symbol: new SimpleFillSymbol({
            color: [0, 0, 0, 0],
            outline: { color: hexToRgba(colorForAssignmentId(`assignment:${assignmentId}`), 1), width: 3 },
          }),
        }))
      }
      replaceAssignmentOverlayGraphics(overlayLayer, source, updateVersion, graphics)
    },
    [overlayLayer, baseLayer, highlightedAssignmentId, assignments, planId]
  )

  useEffect(() => {
    const current = new Map<string, { district_id: number; color: string }>()
    for (const [geoid, a] of assignments) {
      current.set(geoid, { district_id: a.district_id, color: colorForDistrictId(a.district_id) })
    }
    applyOverlay(current).catch((error) => { console.warn('Assignment overlay update failed', error) })
    recomputeMetrics() // NEW
  }, [assignments, applyOverlay, recomputeMetrics])

  useEffect(() => {
    view.whenLayerView(baseLayer).then((lv) => { baseLayerViewRef.current = lv as __esri.FeatureLayerView })
    setHighlightedAssignmentId(undefined)
    // Task 1: seed a new Draft from the configured baseline. These are local
    // rows until commitPlan writes them with the new scenario's plan_id.
    setAssignments(planId ? new Map() : new Map(initialAssignments ?? []))
    serverSnapshotRef.current = new Map()
    setMetrics(undefined)
    if (!planId) {
      setTargetDistrictId(initialAssignments?.values().next().value?.district_id ?? 1)
      return
    }

    let cancelled = false
    ;(async () => {
      const rows = await fetchAssignments(serviceUrl, planId)
      if (cancelled) return
      serverSnapshotRef.current = rows

      const next = new Map<string, AssignmentState>()
      const countByDistrict = new Map<number, number>()
      for (const [geoid, row] of rows) {
        next.set(geoid, { district_id: row.district_id, color: colorForDistrictId(row.district_id), objectId: row.OBJECTID, assignmentId: row.assignment_id })
        countByDistrict.set(row.district_id, (countByDistrict.get(row.district_id) ?? 0) + 1)
      }
      if (cancelled) return

      let defaultDistrict = 1, max = 0
      for (const [id, count] of countByDistrict) { if (count > max) { max = count; defaultDistrict = id } }
      setTargetDistrictId(defaultDistrict)

      const geoids = Array.from(rows.keys())
      if (geoids.length > 0) {
        await baseLayer.load()
        const geoms: __esri.Geometry[] = []
        for (const geoidChunk of chunk(geoids, 200)) {
          const result = await baseLayer.queryFeatures({ where: buildGeoidInClause(baseLayer, geoidChunk), outFields: ['GEOID20', 'Population'], returnGeometry: true })
          for (const f of result.features) {
            const geoid = String(f.attributes.GEOID20)
            geometryCacheRef.current.set(geoid, f.geometry as Polygon)
            populationCacheRef.current.set(geoid, Number(f.attributes.Population) || 0)
            geoms.push(f.geometry)
          }
        }
        if (!cancelled && geoms.length > 0) {
          try {
            const unioned = geoms.length === 1 ? geoms[0] : await geometryEngineAsync.union(geoms as Polygon[])
            await view.goTo({ target: unioned.extent.expand(1.3) })
          } catch (err) { console.warn('Zoom to plan extent failed (non-fatal)', err) }
        }
      }
      if (!cancelled) setAssignments(next) // triggers the merge effect above and restores saved areas
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, baseLayer, serviceUrl, planId, reloadToken])

  useEffect(() => {
    const sketchLayer = new GraphicsLayer({ listMode: 'hide', title: 'Selection sketch (temporary)' })
    sketchLayerRef.current = sketchLayer
    view.map.add(sketchLayer)
    const svm = new SketchViewModel({ view, layer: sketchLayer, updateOnGraphicClick: false })
    sketchVMRef.current = svm
    const handle = svm.on('create', async (event) => {
      if (event.state !== 'complete') return
      const geometry = event.graphic.geometry
      sketchLayer.remove(event.graphic)
      await addFeaturesUnderGeometry(geometry)
      if (isSelectingRef.current && selectionModeRef.current !== 'point') startSketch(selectionModeRef.current)
    })
    return () => { handle.remove(); svm.destroy(); view.map.remove(sketchLayer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  const addFeaturesUnderGeometry = useCallback(
    async (geometry: __esri.Geometry) => {
      const result = await baseLayer.queryFeatures({ geometry, spatialRelationship: 'intersects', outFields: ['GEOID20', 'OBJECTID', 'Population'], returnGeometry: true })
      if (result.features.length === 0) return
      setSelected((prev) => {
        const next = new Set(prev)
        for (const f of result.features) next.add(String(f.attributes.GEOID20))
        return next
      })
      const ids = selectedObjectIdsRef.current
      for (const f of result.features) {
        const geoid = String(f.attributes.GEOID20)
        ids.add(f.attributes.OBJECTID as number)
        geometryCacheRef.current.set(geoid, f.geometry as Polygon)
        populationCacheRef.current.set(geoid, Number(f.attributes.Population) || 0)
      }
      highlightHandleRef.current?.remove()
      if (ids.size > 0 && baseLayerViewRef.current) highlightHandleRef.current = baseLayerViewRef.current.highlight(Array.from(ids))
    },
    [baseLayer]
  )

  const startSketch = useCallback((mode: SelectionMode) => {
    const svm = sketchVMRef.current
    if (!svm || mode === 'point') return
    svm.cancel()
    if (mode === 'freehand') svm.create('polygon', { mode: 'freehand' })
    else svm.create(mode)
  }, [])

  useEffect(() => {
    clickHandleRef.current?.remove()
    if (!isSelecting || selectionMode !== 'point') return
    clickHandleRef.current = view.on('click', async (event) => {
      const hit = await view.hitTest(event, { include: [baseLayer] })
      const graphicHit = hit.results.find((r): r is __esri.MapViewGraphicHit => 'graphic' in r)
      if (!graphicHit) return
      const geoid = String(graphicHit.graphic.attributes.GEOID20)
      const objectId = graphicHit.graphic.attributes.OBJECTID as number
      geometryCacheRef.current.set(geoid, graphicHit.graphic.geometry as Polygon)
      if (graphicHit.graphic.attributes.Population != null) {
        populationCacheRef.current.set(geoid, Number(graphicHit.graphic.attributes.Population) || 0)
      }else if (!populationCacheRef.current.has(geoid)) {
        // hitTest doesn't always carry every field (depends on the layer's
        // configured outFields) — fall back to an explicit one-field query
        // so selectedPopulation is never silently stuck at 0.
        const popResult = await baseLayer.queryFeatures({
          where: buildGeoidInClause(baseLayer, [geoid]),
          outFields: ['Population'],
          returnGeometry: false,
        })
        populationCacheRef.current.set(geoid, Number(popResult.features[0]?.attributes.Population) || 0)
        setSelected((s) => new Set(s)) // ref mutation alone won't re-trigger selectedPopulation's useMemo — force it
      }
      setSelected((prev) => {
        const next = new Set(prev)
        next.has(geoid) ? next.delete(geoid) : next.add(geoid)
        return next
      })
      const ids = selectedObjectIdsRef.current
      ids.has(objectId) ? ids.delete(objectId) : ids.add(objectId)
      highlightHandleRef.current?.remove()
      if (ids.size > 0 && baseLayerViewRef.current) highlightHandleRef.current = baseLayerViewRef.current.highlight(Array.from(ids))
    })
    return () => clickHandleRef.current?.remove()
  }, [view, baseLayer, isSelecting, selectionMode])

  useEffect(() => {
    if (isSelecting && selectionMode !== 'point') startSketch(selectionMode)
    else sketchVMRef.current?.cancel()
  }, [isSelecting, selectionMode, startSketch])

  const clearSelection = useCallback(() => {
    setSelected(new Set())
    selectedObjectIdsRef.current.clear()
    highlightHandleRef.current?.remove()
    highlightHandleRef.current = undefined
    sketchVMRef.current?.cancel()
    setIsSelecting(false)
  }, [])

  const focusAssignment = useCallback(async (geoid: string) => {
    await baseLayer.load()
    const result = await baseLayer.queryFeatures({
      where: buildGeoidInClause(baseLayer, [geoid]),
      outFields: ['GEOID20', 'Population'],
      returnGeometry: true,
    })
    const feature = result.features[0]
    if (!feature?.geometry) return
    geometryCacheRef.current.set(geoid, feature.geometry as Polygon)
    populationCacheRef.current.set(geoid, Number(feature.attributes.Population) || 0)
    await view.goTo({ target: feature.geometry.extent.expand(1.5) })
    setHighlightedAssignmentId(geoid)
  }, [baseLayer, view])

  const selectTool = useCallback((mode: SelectionMode) => {
    if (readonly) return
    if (isSelecting && selectionMode === mode) setIsSelecting(false)
    else { setSelectionMode(mode); setIsSelecting(true) }
  }, [isSelecting, selectionMode])

  const applyLocalAssignment = useCallback(() => {
    if (readonly) return
    if (selected.size === 0 || targetDistrictId == null) return
    const districtId = targetDistrictId === 'unassign' ? null : targetDistrictId
    const color = districtId != null ? colorForDistrictId(districtId) : ''
    const next = new Map(assignments)
    for (const geoid of selected) {
      if (districtId == null) next.delete(geoid)
      else next.set(geoid, { district_id: districtId, color, objectId: assignments.get(geoid)?.objectId, assignmentId: assignments.get(geoid)?.assignmentId ?? crypto.randomUUID() })
    }
    setAssignments(next) // triggers merge effect -> applyOverlay + recomputeMetrics
    setHighlightedAssignmentId(undefined)
    clearSelection()
    setIsSelecting(false)
  }, [selected, targetDistrictId, assignments, clearSelection])

  const reload = useCallback(() => setReloadToken((t) => t + 1), [])

  const commitToServer = useCallback(
    async (args: { planName: string; description: string; status: 'Draft' | 'Submitted'; ownerUserId: string; ownerDisplayName: string }) => {
      setIsSaving(true)
      try {
        const result = await commitPlan({
          serviceUrl, existingPlanId: planId, existingPlanObjectId: planObjectId,
          planName: args.planName, description: args.description, ownerUserId: args.ownerUserId,
          ownerUserAliases: currentUsername ? [currentUsername] : [],
          ownerDisplayName: args.ownerDisplayName, status: args.status,
          districts, assignments, serverSnapshot: serverSnapshotRef.current, parentPlanId,
        })
        reload()
        return result
      } finally { setIsSaving(false) }
    },
    [serviceUrl, planId, planObjectId, districts, assignments, parentPlanId, currentUsername, reload]
  )
   const selectedPopulation = useMemo(() => {
    let sum = 0
    for (const geoid of selected) sum += populationCacheRef.current.get(geoid) ?? 0
    return sum
  }, [selected])

  return {
    assignments, selectedCount: selected.size, previouslyAssignedCount: assignments.size, selectedPopulation,
    isSelecting, selectionMode, selectTool, clearSelection,
    targetDistrictId, setTargetDistrictId, applyLocalAssignment, isSaving, commitToServer,
    focusAssignment, metrics,
  }
}