import type { ImmutableObject } from 'seamless-immutable'

export interface Config {
  baseLayerTitle?: string // optional — only needed if the web map has more than one polygon layer
  baselinePlanId?: string // plan used to seed a new scenario
  hubUrl?: string // Hub page to return unauthenticated users to
  authPortalUrl?: string // optional — portal to use for sign-in when it differs from the app portal
  oauthClientId?: string // optional — OAuth app registered for the configured authentication portal
  overlayOnly?: boolean // hidden app-startup instance for saved map assignments
}

export type IMConfig = ImmutableObject<Config>