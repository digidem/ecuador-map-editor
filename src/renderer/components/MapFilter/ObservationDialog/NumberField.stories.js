import * as React from 'react'
import { action } from '@storybook/addon-actions'

import NumberField from './NumberField'

export default {
  title: 'Observation Dialog/NumberField'
  // decorators: [storyFn => <div style={{ padding: '10px 0' }}>{storyFn()}</div>]
}

export const defaultStory = () => (
  <NumberField
    label='Age'
    placeholder='Some placeholder (e.g. example input)'
    helperText='The actual question might be here?'
    onChange={v => {
      console.log(v)
      action('onChange')(v)
    }}
  />
)

defaultStory.story = {
  name: 'default'
}
