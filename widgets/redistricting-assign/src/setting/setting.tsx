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
    </div>
  )
}