/* eslint-disable react-hooks/rules-of-hooks */
import React from 'react'
import { StylesProvider } from '@material-ui/styles'
import { action } from '@storybook/addon-actions'

import MapFilterToolbar from './Toolbar'
import ExportButton from './ExportButton'

export default {
  title: 'internal/Toolbar',
  decorator: [
    storyFn => <StylesProvider injectFirst>{storyFn()}</StylesProvider>
  ]
}

export const Toolbar = () => {
  const [view, setView] = React.useState('map')
  return (
    <MapFilterToolbar
      view={view}
      onChange={setView}
      actionRight={<ExportButton onExport={action('export')} />}
    />
  )
}

// defaultStory.story = {
//   name: 'default'
// }
