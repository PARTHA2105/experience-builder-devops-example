import type FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import { resolvePlanTableLayers } from '../src/runtime/PlanService'

function table(title: string): FeatureLayer {
  return { title } as FeatureLayer
}

describe('resolvePlanTableLayers', () => {
  it('resolves separate scenario tables by title regardless of order or spacing', () => {
    const plans = table('Plans')
    const districts = table('Plan Districts')
    const assignments = table('PlanAssignments')
    const activityLog = table('Plan Activity Log')

    expect(resolvePlanTableLayers([activityLog, assignments, plans, districts])).toEqual({
      plans,
      districts,
      assignments,
      activityLog,
    })
  })

  it('rejects a partially configured set of scenario tables', () => {
    expect(() => resolvePlanTableLayers([table('Plans'), table('PlanDistricts')]))
      .toThrow('The map is missing required scenario tables: assignments, activityLog.')
  })
})
