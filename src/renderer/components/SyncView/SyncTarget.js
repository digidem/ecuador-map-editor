import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import PhoneIcon from '@material-ui/icons/PhoneAndroid'
import LaptopIcon from '@material-ui/icons/Laptop'
import FileIcon from '@material-ui/icons/Usb'
import ErrorIcon from '@material-ui/icons/Error'
import CloudIcon from '@material-ui/icons/CloudUpload'
import Paper from '@material-ui/core/Paper'
import Typography from '@material-ui/core/Typography'
import SyncButton from './SyncButton'
import DateDistance from '../DateDistance'
import { defineMessages, useIntl } from 'react-intl'

const m = defineMessages({
  // Message shown when there is an error while syncing
  errorMsg: 'Syncronization Error',
  // Shown before last sync time, e.g. 'Last synchronized: 2 hours ago'
  lastSync: 'Last synchronized:',
  // Prompt of how many database objects have synced
  database: 'Database: {sofar} / {total}',
  // Prompt for how many media items have synced
  media: 'Photos: {sofar} / {total}'
})

const SyncTarget = ({
  // Unique identifier for the peer
  id,
  // User friendly peer name
  name = 'Android Phone',
  // See above peerStatus
  status,
  // If connected
  connected,
  // Sync progress object, with props `percent`, `mediaSofar`, `mediaTotal`,
  // `dbSofar`, `dbTotal`
  progress,
  // The time of last completed sync in milliseconds since UNIX Epoch
  lastCompleted,
  errorMsg,
  // "mobile" or "desktop" or "file"
  deviceType,
  onClick
}) => {
  const cx = useStyles()
  const { formatMessage: t, formatNumber } = useIntl()
  // TODO need to render device name in error screen
  return (
    <Paper className={cx.root}>
      <div className={cx.wrapper}>
        <div className={cx.content}>
          {status === 'error' ? (
            <ErrorIcon
              fontSize='inherit'
              className={cx.icon}
              style={{ color: 'red' }}
            />
          ) : deviceType === 'desktop' ? (
            <LaptopIcon fontSize='inherit' className={cx.icon} />
          ) : deviceType === 'file' ? (
            <FileIcon fontSize='inherit' className={cx.icon} />
          ) : deviceType === 'cloud' ? (
            <CloudIcon fontSize='inherit' className={cx.icon} />
          ) : (
            <PhoneIcon fontSize='inherit' className={cx.icon} />
          )}
          <Typography variant='h5' component='h2'>
            {name}
          </Typography>
          {status === 'error' ? (
            <Typography className={cx.errorDetail} align='center'>
              {errorMsg}
            </Typography>
          ) : status === 'progress' && progress ? (
            <Typography className={cx.progress} align='center'>
              {t(m.database, {
                sofar: formatNumber(progress.dbSofar),
                total: formatNumber(progress.dbTotal)
              })}
              <br />
              {t(m.media, {
                sofar: formatNumber(progress.mediaSofar),
                total: formatNumber(progress.mediaTotal)
              })}
            </Typography>
          ) : (
            lastCompleted && (
              <Typography className={cx.lastSync}>
                {t(m.lastSync)}
                <br />
                <DateDistance date={lastCompleted} />
              </Typography>
            )
          )}
        </div>
        <SyncButton
          connected={connected}
          onClick={onClick}
          variant={status}
          progress={progress && progress.percent}
        />
      </div>
    </Paper>
  )
}

export default SyncTarget

const useStyles = makeStyles(theme => ({
  root: {
    paddingTop: '100%',
    position: 'relative'
  },
  icon: {
    marginBottom: theme.spacing(2),
    fontSize: 48
  },
  lastSync: {
    textAlign: 'center',
    fontStyle: 'italic'
  },
  errorDetail: {
    textAlign: 'center',
    fontStyle: 'italic'
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    padding: '10%'
  },
  progress: {
    fontVariantNumeric: 'tabular-nums'
  }
}))
