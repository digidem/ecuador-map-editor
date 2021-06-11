import React from 'react'
import { IntlProvider } from 'react-intl'
import { ThemeProvider } from '@material-ui/styles'
import theme from '../src/renderer/theme'

import '../static/css/base.css'
import '../static/css/storybook.css'

const messages = {
  en: require('../translations/en.json'),
  es: require('../translations/es.json'),
  pt: require('../translations/pt.json'),
  th: require('../translations/th.json')
}

export const globalTypes = {
  locale: {
    name: 'Locale',
    description: 'Internationalization locale',
    defaultValue: 'en',
    toolbar: {
      icon: 'globe',
      items: [
        { value: 'en', right: '🇬🇧', title: 'English' },
        { value: 'es', right: '🇪🇸', title: 'Español' },
        { value: 'pt', right: '🇵🇹', title: 'Português' },
        { value: 'th', right: '🇹🇭', title: 'ไทย' }
      ]
    }
  }
}

export const decorators = [
  (Story, { globals }) => (
    <IntlProvider locale={globals.locale} messages={messages[globals.locale]}>
      <Story />
    </IntlProvider>
  ),
  Story => (
    <ThemeProvider theme={theme}>
      <Story />
    </ThemeProvider>
  )
]
