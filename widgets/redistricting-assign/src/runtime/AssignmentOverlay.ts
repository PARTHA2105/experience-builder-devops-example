import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import type MapView from '@arcgis/core/views/MapView'

export const ASSIGNMENT_OVERLAY_TITLE = 'Assignment overlay (session only)'
const updateVersions = new WeakMap<GraphicsLayer, Map<string, number>>()
const graphicsBySource = new WeakMap<GraphicsLayer, Map<string, __esri.Graphic[]>>()

export function startAssignmentOverlayUpdate(layer: GraphicsLayer, source: string): number {
  const versions = updateVersions.get(layer) ?? new Map<string, number>()
  const version = (versions.get(source) ?? 0) + 1
  versions.set(source, version)
  updateVersions.set(layer, versions)
  return version
}

export function isCurrentAssignmentOverlayUpdate(layer: GraphicsLayer, source: string, version: number): boolean {
  return updateVersions.get(layer)?.get(source) === version
}

export function replaceAssignmentOverlayGraphics(layer: GraphicsLayer, source: string, version: number, graphics: __esri.Graphic[]): void {
  if (!isCurrentAssignmentOverlayUpdate(layer, source, version)) return
  const sourceGraphics = graphicsBySource.get(layer) ?? new Map<string, __esri.Graphic[]>()
  const previousGraphics = sourceGraphics.get(source) ?? []
  if (previousGraphics.length > 0) layer.removeMany(previousGraphics)
  sourceGraphics.set(source, graphics)
  graphicsBySource.set(layer, sourceGraphics)
  if (graphics.length > 0) layer.addMany(graphics)
}

export function clearAssignmentOverlaySources(layer: GraphicsLayer, prefix: string): void {
  const sourceGraphics = graphicsBySource.get(layer)
  const versions = updateVersions.get(layer)
  if (!sourceGraphics || !versions) return
  for (const source of sourceGraphics.keys()) {
    if (!source.startsWith(prefix)) continue
    versions.set(source, (versions.get(source) ?? 0) + 1)
    const graphics = sourceGraphics.get(source) ?? []
    if (graphics.length > 0) layer.removeMany(graphics)
    sourceGraphics.delete(source)
  }
}

export function getOrCreateAssignmentOverlay(view: MapView): GraphicsLayer {
  const existing = view.map.layers.toArray().find((candidate) => candidate.title === ASSIGNMENT_OVERLAY_TITLE && candidate.type === 'graphics') as GraphicsLayer | undefined
  const layer = existing ?? new GraphicsLayer({ title: ASSIGNMENT_OVERLAY_TITLE, listMode: 'hide' })
  if (!existing) view.map.add(layer)
  layer.visible = true
  layer.opacity = 1
  const topIndex = view.map.layers.length - 1
  if (view.map.layers.indexOf(layer) !== topIndex) view.map.reorder(layer, topIndex)
  return layer
}
