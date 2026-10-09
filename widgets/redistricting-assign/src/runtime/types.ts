// types.ts
// Shared types for the block-assignment widget. These mirror the fields
// already agreed in the data model (Plans, PlanDistricts, PlanAssignments)

export interface PlanDistrict {
  plan_district_id: string;
  plan_id: string;
  district_id: number;
  district_name: string;
  district_color: string; // hex, e.g. "#378ADD"
  target_population?: number;
  isPersisted?: boolean
}

export interface PlanAssignmentRow {
  OBJECTID?: number; // present once the row exists on the server
  assignment_id: string;
  plan_id: string;
  GEOID20: string;
  district_id: number;
  assigned_by_user_id: string;
  last_updated_date: number; // epoch ms
  assigned_date?: number
  change_batch_id: string;
}

// In-memory view of "what's assigned right now", keyed by GEOID20.
// This is what drives the base layer's renderer — it is NEVER persisted
// as a layer or graphics collection; only district_id (and the other
// PlanAssignments fields) are written back to the server. It's rebuilt
// from PlanAssignments every time the app opens.
export interface AssignmentState {
  district_id: number;
  color: string;
  objectId?: number; // undefined = not yet saved to the server
  assignmentId: string;
}
export interface Plan {
  OBJECTID?: number
  plan_id: string
  plan_name: string
  description?: string
  owner_user_id: string
  owner_display_name?: string
  //owner_display_name: string
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected'
  visibility: string
  created_date: number
  last_updated_date: number
  submitted_date?: number
  finalized_date?: number
  parent_plan_id?: string
  is_locked: boolean
}

export interface MergedAssignment extends AssignmentState {
  planId: string
}

export interface DistrictMetric {
  district_id: number
  district_name: string
  color: string
  populationBefore: number
  populationAfter: number
  difference: number
}
export interface PlanMetrics {
  districts: DistrictMetric[]
  studyAreaPopulation: number
  assignedPopulation: number
  unassignedPopulation: number
  idealPopulation: number
  highest: number
  lowest: number
  deviationBeforePercent: number
  deviationPercent: number
}

export interface PlanNotification {
  activityId: string
  planId: string
  planName: string
  status: 'Approved' | 'Rejected'
  actorName: string
  activityDate: number
  comment: string
}

export interface PlanActivity {
  activity_id: string
  actor_user_id: string
  activity_type: string
  activity_date: number
  affected_unit_count: number
  notes: string
}