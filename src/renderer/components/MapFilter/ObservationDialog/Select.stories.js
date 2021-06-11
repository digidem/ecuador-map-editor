// @flow
import * as React from 'react'
import { action } from '@storybook/addon-actions'

import { SelectOne, SelectMultiple } from './Select'

const countries = [
  { label: 'Afghanistan', value: true },
  { label: 'Aland Islands', value: 'aland_islands' },
  { label: 'Albania', value: 1 },
  { label: 'Algeria' },
  { label: 'American Samoa' },
  { label: 'Andorra' },
  { label: 'Angola' },
  { label: 'Anguilla' },
  { label: 'Antarctica', value: 1 },
  { label: 'Antigua and Barbuda' },
  { label: 'Argentina' },
  { label: 'Armenia' },
  { label: 'Aruba' },
  { label: 'Australia' },
  { label: 'Austria' },
  { label: 'Azerbaijan' },
  { label: 'Bahamas' },
  { label: 'Bahrain' },
  { label: 'Bangladesh' },
  { label: 'Barbados' },
  { label: 'Belarus' },
  { label: 'Belgium' },
  { label: 'Belize' },
  { label: 'Benin' },
  { label: 'Bermuda' },
  { label: 'Bhutan' },
  {
    label:
      'Bolivia, Plurinational State of really long name to confuse rendering'
  },
  { label: 'Bonaire, Sint Eustatius and Saba' },
  { label: 'Bosnia and Herzegovina' },
  { label: 'Botswana', value: 'botsy' },
  { label: 'Bouvet Island' },
  { label: 'Brazil' },
  { label: 'British Indian Ocean Territory' },
  { label: 'Brunei Darussalam' }
]
  .map(item => ({
    label: item.label,
    value: item.value || item.label.toLowerCase().replace(' ', '_')
  }))
  .concat(['Other', false, 3, null])

const StateContainer = ({
  initialValue,
  children
}: {
  initialValue?: any,
  children: (any, (any) => any) => React.Node
}) => {
  const [state, setState] = React.useState(initialValue)
  action('onChange')(state)
  return children(state, setState)
}

export default {
  title: 'Observation Dialog/SelectOne'
}

export const defaultStory = () => (
  <StateContainer initialValue={''}>
    {(value, setValue) => (
      <SelectOne
        label='Select Country'
        options={countries}
        value={value}
        onChange={setValue}
      />
    )}
  </StateContainer>
)

export const SelectOneNoValue = () => (
  <StateContainer>
    {(value, setValue) => (
      <SelectOne
        label='Select Country'
        options={countries}
        value={value}
        onChange={setValue}
      />
    )}
  </StateContainer>
)

defaultStory.story = {
  name: 'default'
}

export const selectMultiple = () => (
  <StateContainer initialValue={['botsy']}>
    {(value, setValue) => (
      <SelectMultiple
        label='Select Countries'
        options={countries}
        value={value}
        onChange={setValue}
      />
    )}
  </StateContainer>
)

export const selectMultipleNonStringValue = () => (
  <StateContainer initialValue={[true, 1]}>
    {(value, setValue) => (
      <SelectMultiple
        label='Select Countries'
        options={countries}
        value={value}
        onChange={setValue}
      />
    )}
  </StateContainer>
)

export const selectMultipleOldSelectOneValue = () => (
  <StateContainer initialValue={true}>
    {(value, setValue) => (
      <SelectMultiple
        label='Select Countries'
        options={countries}
        value={value}
        onChange={setValue}
      />
    )}
  </StateContainer>
)

export const selectMultipleNoValue = () => (
  <StateContainer>
    {(value, setValue) => (
      <SelectMultiple
        label='Select Countries'
        options={countries}
        value={value}
        onChange={setValue}
      />
    )}
  </StateContainer>
)
