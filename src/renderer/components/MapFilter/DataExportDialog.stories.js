/* eslint-disable react-hooks/rules-of-hooks */
import React from 'react'
import { StylesProvider } from '@material-ui/styles'
import { action } from '@storybook/addon-actions'

import DataExportDialog from './DataExportDialog'
import exampleObservations from '../../../../fixtures/observations.json'

export default {
  title: 'internal/Data Export Dialog',
  decorator: [
    storyFn => <StylesProvider injectFirst>{storyFn()}</StylesProvider>
  ]
}

function getMediaUrl (id) {
  const size = 400
  const idx = parseInt(id, 16)
  return `https://picsum.photos/id/${+idx % 80}/${size}/${size}`
}

export const defaultStory = () => {
  return (
    <DataExportDialog
      open
      onClose={action('close')}
      onSave={action('save')}
      observations={exampleObservations}
      getMediaUrl={getMediaUrl}
    />
  )
}

defaultStory.story = {
  name: 'default'
}

export const noData = () => {
  return (
    <DataExportDialog
      open
      onClose={action('close')}
      onSave={action('save')}
      getMediaUrl={getMediaUrl}
    />
  )
}
