import React from 'react'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import {makeStyles} from '@material-ui/core/styles'
import {useConfig} from '../../hooks/useConfig'

const visibleKeyLength = 5

const SyncFooter = () => {
  const cx = useStyles()
  const {metadata, encryptionKey} = useConfig()

  return (
    <AppBar position='static' color='default' elevation={0} className={cx.root}>
      <Toolbar>
        <div className={cx.titleBar}>
          <Typography component='h2' className={cx.title}>
            {[metadata ? metadata.name : '',
              metadata ? metadata.version : ''].join(' ')}
          </Typography>
          <Typography component='h2' className={cx.subTitle}>
            {encryptionKey
              ? `${encryptionKey.slice(0, visibleKeyLength)}${'*'.repeat(10)}`
              : 'MAPEO'}
          </Typography>
        </div>
      </Toolbar>
    </AppBar>
  )
}

export default SyncFooter

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: 'white'
  },
  titleBar: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  title: {
    color: 'black'
  },
  subTitle: {
    color: 'grey'
  }
}))
