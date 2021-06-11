/* eslint-disable react-hooks/rules-of-hooks */
import * as React from 'react'
import DateFnsUtils from '@date-io/date-fns' // choose your lib
import { MuiPickersUtilsProvider } from '@material-ui/pickers'
import Field from './Field'
import { action } from '@storybook/addon-actions'

export default {
  title: 'Observation Dialog/Field'
}

const fieldTypes = [
  'date',
  'datetime',
  'number',
  'text',
  'textarea',
  'select_one',
  'select_multiple',
  'localized'
]

const selectOptions = [
  [1, 2, 3],
  ['Scotland', 'Peru', 'Nigeria'],
  [null, 2, 'Some Text', true],
  [
    { value: 1, label: 'One' },
    { value: 2, label: 'Two' },
    { value: 3, label: 'Three' }
  ]
]

const values = [
  2,
  '',
  'Scotland',
  'Not in select options',
  null,
  undefined,
  true,
  false,
  '2020-08-20T14:37:58.246Z',
  '2020-05-02'
]

// All props combinations to render fields for
const propsList = []

for (const type of fieldTypes) {
  for (const value of values) {
    const props = {
      field: {
        type,
        id: Math.random().toString(),
        key: ['foo'],
        placeholder: 'Placeholder Text'
      },
      value
    }
    if (type.startsWith('select_')) {
      for (const options of selectOptions) {
        propsList.push({
          ...props,
          field: { ...props.field, options, id: Math.random().toString() }
        })
      }
    } else {
      propsList.push(props)
    }
  }
}

const StateContainer = ({ initialValue, children }) => {
  const [state, setState] = React.useState(initialValue)

  const onChange = React.useCallback((key, value) => {
    action('onChange')(key, value)
    setState(value)
  }, [])

  return children(state, onChange)
}

export const defaultStory = () => {
  return (
    <MuiPickersUtilsProvider utils={DateFnsUtils}>
      {propsList.map(({ value, field }) => (
        <div key={field.id}>
          <pre>
            value:{' '}
            {value !== undefined ? JSON.stringify(value, null, 2) : 'undefined'}
          </pre>
          <pre>fieldType: {field.type}</pre>
          {field.options ? (
            <pre>options: {JSON.stringify(field.options)}</pre>
          ) : null}
          <StateContainer initialValue={value}>
            {(value, onChange) => (
              <Field value={value} onChange={onChange} field={field} />
            )}
          </StateContainer>
        </div>
      ))}
    </MuiPickersUtilsProvider>
  )
}

defaultStory.story = {
  name: 'default'
}
