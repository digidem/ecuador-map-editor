// @flow
import React from 'react'
import { action } from '@storybook/addon-actions'

import MediaCarousel from './MediaCarousel'

export default {
  title: 'Observation Dialog/MediaCarousel'
}

export const defaultStory = () => (
  <MediaCarousel
    style={{ width: 600, height: 400, outline: 'solid 1px blue' }}
    items={[
      { src: 'http://via.placeholder.com/600', type: 'image' },
      { src: 'http://via.placeholder.com/600', type: 'image' },
      { src: 'http://via.placeholder.com/600', type: 'image' }
    ]}
  />
)

defaultStory.story = {
  name: 'default'
}

export const resizer = () => (
  <MediaCarousel
    style={{ width: 600, height: 400 }}
    onClick={action('media click')}
    items={Array(9)
      .fill()
      .map((_, i) => ({
        src: `https://lorempixel.com/800/600/nature/${i}`,
        type: 'image'
      }))}
  />
)
