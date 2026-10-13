import { React } from 'jimu-core'
import type { AllWidgetSettingProps } from 'jimu-for-builder'
import { MapWidgetSelector } from 'jimu-ui/advanced/setting-components'
import { TextInput } from 'jimu-ui'
import type { IMConfig } from '../config'

export default function Setting(props: AllWidgetSettingProps<IMConfig>) {
  const onMapWidgetSelected = (useMapWidgetIds: string[]) => { props.onSettingChange({ id: props.id, useMapWidgetIds }) }

  return (
    <div style={{ padding: 12 }}>
      <label>Map widget</label>
      <MapWidgetSelector useMapWidgetIds={props.useMapWidgetIds} onSelect={onMapWidgetSelected} />
      <label style={{ marginTop: 12, display: 'block' }}>Base layer title (optional)</label>
      <TextInput
        style={{ width: '100%' }}
        value={props.config.baseLayerTitle}
        onChange={(e) => { props.onSettingChange({ id: props.id, config: props.config.set('baseLayerTitle', e.target.value) }) }}
        placeholder="Leave blank to auto-detect the first polygon layer"
      />
      <label style={{ marginTop: 12, display: 'block' }}>Baseline plan ID</label>
      <TextInput
        style={{ width: '100%' }}
        value={props.config.baselinePlanId}
        onChange={(e) => { props.onSettingChange({ id: props.id, config: props.config.set('baselinePlanId', e.target.value) }) }}
        placeholder="Baseline plan GUID used to seed scenarios"
      />
      <label style={{ marginTop: 12, display: 'block' }}>Hub page URL</label>
      <TextInput
        style={{ width: '100%' }}
        value={props.config.hubUrl}
        onChange={(e) => { props.onSettingChange({ id: props.id, config: props.config.set('hubUrl', e.target.value) }) }}
        placeholder="URL for the authenticated community Hub page"
      />
      <label style={{ marginTop: 12, display: 'block' }}>Authentication portal URL (optional)</label>
      <TextInput
        style={{ width: '100%' }}
        value={props.config.authPortalUrl}
        onChange={(e) => { props.onSettingChange({ id: props.id, config: props.config.set('authPortalUrl', e.target.value) }) }}
        placeholder="Leave blank to use the Experience Builder app portal"
      />
      <div style={{ marginTop: 4, color: '#6b7280', fontSize: 11 }}>
        Use your ArcGIS organization URL when sign-in should use a different portal, for example https://schoolsite.maps.arcgis.com.
      </div>
      <label style={{ marginTop: 12, display: 'block' }}>OAuth client ID (required if the app does not provide one)</label>
      <TextInput
        style={{ width: '100%' }}
        value={props.config.oauthClientId}
        onChange={(e) => { props.onSettingChange({ id: props.id, config: props.config.set('oauthClientId', e.target.value) }) }}
        placeholder="Client ID from your ArcGIS OAuth application"
      />
      <div style={{ marginTop: 4, color: '#6b7280', fontSize: 11 }}>
        This is a public application ID, not a client secret. Register the deployed experience's OAuth callback URL in that ArcGIS application.
      </div>
    </div>
  )
}