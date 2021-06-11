import * as React from 'react'

import TextField from './TextField'

export default {
  title: 'Observation Dialog/TextField'
  // decorators: [storyFn => <div style={{ padding: '10px 0' }}>{storyFn()}</div>]
}

export const Multiline = () => (
  <TextField
    label='Village name'
    multiline
    placeholder='Some placeholder (e.g. example input)'
    helperText='The actual question might be here?'
  />
)

// defaultStory.story = {
//   name: 'default'
// }

export const Singleline = () => (
  <TextField
    label='Village name'
    placeholder='Some placeholder (e.g. example input)'
    multiline={false}
    helperText='The actual question might be here?'
  />
)
