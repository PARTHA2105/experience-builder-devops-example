import type { ImmutableObject } from 'seamless-immutable'

export interface Config {
  baseLayerTitle?: string // optional — only needed if the web map has more than one polygon layer
  baselinePlanId?: string // plan used to seed a new scenario
  hubUrl?: string // Hub page to return unauthenticated users to
  overlayOnly?: boolean // hidden app-startup instance for saved map assignments
}

export type IMConfig = ImmutableObject<Config>