/* eslint-disable react-hooks/rules-of-hooks */
import * as React from 'react'
import DateFnsUtils from '@date-io/date-fns' // choose your lib
import { MuiPickersUtilsProvider } from '@material-ui/pickers'
import DateField from './DateField'

export default {
  title: 'Observation Dialog/DateField'
  // decorators: [storyFn => <div style={{ padding: '10px 0' }}>{storyFn()}</div>]
}

export const defaultStory = () => {
  const [value, setValue] = React.useState('2019-09-25')
  console.log(value)
  return (
    <MuiPickersUtilsProvider utils={DateFnsUtils}>
      <DateField
        label='Select Date'
        helperText='The actual question might be here?'
        value={value}
        onChange={setValue}
      />
    </MuiPickersUtilsProvider>
  )
}

defaultStory.story = {
  name: 'default'
}
