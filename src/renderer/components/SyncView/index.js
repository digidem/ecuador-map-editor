import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { makeStyles } from '@material-ui/core/styles'
import { remote } from 'electron'
import { useIntl, defineMessages } from 'react-intl'
import path from 'path'

import logger from '../../../logger'
import api from '../../new-api'
import Searching from './Searching'
import SyncAppBar from './SyncAppBar'
import SyncTarget from './SyncTarget'
import SyncGrid from './SyncGrid'
import SyncFooter from './SyncFooter'

export const peerStatus = {
  READY: 'ready',
  PROGRESS: 'progress',
  ERROR: 'error',
  COMPLETE: 'complete'
}

const m = defineMessages({
  openSyncFileDialog: 'Select a database to syncronize',
  createSyncFileDialog: 'Create a new database to syncronize',
  // Error message when trying to sync with an incompatible older version of Mapeo
  errorMsgVersionThemBad: '{deviceName} needs to upgrade Mapeo',
  // Error messagewhen trying to sync with an incompatible newer version of Mapeo
  errorMsgVersionUsBad: 'You need to upgrade Mapeo to sync with {deviceName}'
})

const IGNORED_ERROR_CODES = ['ECONNABORTED', 'ERR_MISSING_DATA']

const fileDialogFilters = [
  {
    name: 'Mapeo Data (*.mapeodata)',
    extensions: ['mapeodata', 'mapeo-jungle', 'sync', 'zip']
  }
]

const SyncView = ({ focusState }) => {
  const cx = useStyles()
  const listenForSyncPeers = focusState === 'focused'
  const [peers, syncPeer, canConnectMapeoWeb, connectMapeoWeb] = usePeers(listenForSyncPeers)
  const { formatMessage: t } = useIntl()
  logger.debug('render peers', peers)

  const handleClickSelectSyncfile = () => {
    remote.dialog.showOpenDialog(
      {
        title: t(m.openSyncFileDialog),
        properties: ['openFile'],
        filters: fileDialogFilters
      }
    ).then(({ filePaths }) => {
      if (typeof filePaths === 'undefined' || filePaths.length !== 1) return
      syncPeer(filePaths[0], { file: true })
    }).catch(err => logger.error(err))
  }

  const handleClickNewSyncfile = () => {
    remote.dialog.showSaveDialog(
      {
        title: t(m.openSyncFileDialog),
        defaultPath: 'database.mapeodata',
        filters: fileDialogFilters
      }
    ).then(({ canceled, filePath }) => {
      if (canceled || !filePath) return
      syncPeer(filePath, { file: true })
    }).catch(err => logger.error(err))
  }

  const handleClickConnectMapeoWeb = () => {
    connectMapeoWeb()
  }

  return (
    <div className={cx.root}>
      <SyncAppBar
        canConnectMapeoWeb={canConnectMapeoWeb}
        onClickSelectSyncfile={handleClickSelectSyncfile}
        onClickNewSyncfile={handleClickNewSyncfile}
        onClickConnectMapeoWeb={handleClickConnectMapeoWeb}
      />
      {peers.length === 0 && focusState === 'focused' ? (
        <Searching />
      ) : (
        <SyncGrid>
          {peers.map(peer => (
            <SyncTarget
              key={peer.id}
              {...peer}
              onClick={() => syncPeer(peer.id)}
            />
          ))}
        </SyncGrid>
      )}
      <SyncFooter />
    </div>
  )
}

export default SyncView

function usePeers (listen) {
  const { formatMessage } = useIntl()
  const lastClosed = useRef(Date.now())
  const [serverPeers, setServerPeers] = useState([])
  const [syncErrors, setSyncErrors] = useState(new Map())
  const [syncRequests, setSyncRequests] = useState(new Map())

  // Will be `null` if you cannot connect, else it'll be the sync server URL in the config
  const [canConnectMapeoWeb, setCanConnectMapeoWeb] = useState(null)

  useEffect(() => {
    api.getMetadata().then(({syncServer}) => {
      setCanConnectMapeoWeb(syncServer || null)
    }).catch(() => setCanConnectMapeoWeb(null))
  }, [])

  // Keep a ref of the last time this view was closed (used to maintain peer
  // "completed" state in the UI)
  useEffect(
    () => {
      if (!listen) lastClosed.current = Date.now()
    },
    [listen]
  )

  useEffect(
    () => {
      // Only start listening if `listen` is true
      if (!listen) return

      const updatePeers = (updatedServerPeers = []) => {
        logger.debug('Received peer update', updatedServerPeers)
        setServerPeers(updatedServerPeers)
        // NB: use callback version of setState because the new error state
        // depends on the previous error state
        setSyncErrors(syncErrors => {
          const newErrors = new Map(syncErrors)
          updatedServerPeers.forEach(peer => {
            if (peer.state && peer.state.topic === 'replication-error') {
              if (IGNORED_ERROR_CODES.indexOf(peer.state.code) === -1) {
                newErrors.set(peer.id, peer.state)
              }
            } else {
              // no error anymore, let's delete it
              newErrors.delete(peer.id)
            }
          })
          return newErrors
        })
        // Argh, this is hacky. This is making up for us not being able to rely
        // on server state for rendering the UI
        setSyncRequests(syncRequests => {
          const newSyncRequests = new Map(syncRequests)
          updatedServerPeers.forEach(peer => {
            if (!peer.state) return
            if (
              (peer.state.topic === 'replication-error' ||
              peer.state.topic === 'replication-complete') &&
              !peer.connected
            ) {
              newSyncRequests.delete(peer.id)
            }
          })
          return newSyncRequests
        })
      }

      // Whenever the sync view becomes focused, announce for sync and start
      // listening for updates to peer status
      api.syncJoin()
      const peerListener = api.addPeerListener(updatePeers)

      // When the listen changes or component unmounts, cleanup listeners
      return () => {
        api.syncLeave()
        if (peerListener) peerListener.remove()
      }
    },
    [listen]
  )

  const peers = useMemo(
    () =>
      getPeersStatus({
        syncRequests,
        serverPeers,
        syncErrors,
        since: lastClosed.current,
        formatMessage
      }),
    [serverPeers, syncErrors, syncRequests, formatMessage]
  )

  const syncPeer = useCallback(
    (peerId, opts) => {
      logger.info('Request sync start', peerId, serverPeers)
      if (opts && opts.file) return api.syncStart({ filename: peerId })
      const peer = serverPeers.find(peer => peer.id === peerId)
      // Peer could have vanished in the moment the button was pressed
      if (peer) {
        // The server does always respond immediately with progress, especially
        // if the two devices are already up to sync. We store the request state
        // so the user can see the UI update when they click the button
        setSyncRequests(syncRequests => {
          const newSyncRequests = new Map(syncRequests)
          newSyncRequests.set(peerId, true)
          return newSyncRequests
        })
        api.syncStart(peer)
      }
    },
    [serverPeers]
  )

  const connectMapeoWeb = useCallback((gotURL) => {
    async function doConnectMapeoWeb() {
      let url = gotURL
      if(!url) {
        const metadata = await api.getMetadata()
        const {syncServer} = metadata
        url = syncServer
        logger.info('Request connect mapeo web start', {metadata, url})
      }
      api.syncConnect(url)
    }
    doConnectMapeoWeb()
  }, [])

  return [peers, syncPeer, canConnectMapeoWeb, connectMapeoWeb]
}

/**
 * The peer status from Mapeo Core does not 'remember' the completion of a sync.
 * If the user is not looking at the screen when sync completes, they might miss
 * it. This function derives a peer status from the server state and any errors
 */
function getPeersStatus ({
  serverPeers = [],
  syncErrors,
  syncRequests,
  since,
  formatMessage
}) {
  logger.debug('get peers status', serverPeers, syncErrors)
  return serverPeers.map(serverPeer => {
    let status = peerStatus.READY
    let errorMsg
    let complete
    const state = serverPeer.state || {}
    const name = serverPeer.filename
      ? path.basename(serverPeer.name)
      : serverPeer.name
    if (
      state.topic === 'replication-progress' ||
      state.topic === 'replication-started' ||
      syncRequests.has(serverPeer.id)
    ) {
      status = peerStatus.PROGRESS
    } else if (
      (state.lastCompletedDate || 0) > since ||
      state.topic === 'replication-complete'
    ) {
      status = peerStatus.COMPLETE
      complete = state.message
    } else if (
      syncErrors.has(serverPeer.id)
    ) {
      status = peerStatus.ERROR
      const error = syncErrors.get(serverPeer.id)
      if (error && error.code === 'ERR_VERSION_MISMATCH') {
        if (
          parseVersionMajor(state.usVersion || '') >
          parseVersionMajor(state.themVersion || '')
        ) {
          errorMsg = formatMessage(m.errorMsgVersionThemBad, {
            deviceName: name
          })
        } else {
          errorMsg = formatMessage(m.errorMsgVersionUsBad, { deviceName: name })
        }
      } else if (error) {
        errorMsg = error.message || 'Error'
      }
    }
    return {
      id: serverPeer.id,
      name: name,
      status: status,
      started: serverPeer.started,
      connected: serverPeer.connected,
      lastCompleted: complete || state.lastCompletedDate,
      errorMsg: errorMsg,
      progress: getPeerProgress(serverPeer.state),
      deviceType: serverPeer.filename ? 'file' : serverPeer.deviceType
    }
  })
}

// We combine media and database items in progress. In order to show roughtly
// accurate progress, this weighting is how much more progress a media item
// counts vs. a database item
const MEDIA_WEIGHTING = 50
function getPeerProgress (peerState) {
  if (
    !peerState ||
    peerState.topic !== 'replication-progress' ||
    !peerState.message ||
    !peerState.message.db ||
    !peerState.message.media
  ) {
    return
  }
  const total =
    (peerState.message.db.total || 0) +
    (peerState.message.media.total || 0) * MEDIA_WEIGHTING
  const sofar =
    (peerState.message.db.sofar || 0) +
    (peerState.message.media.sofar || 0) * MEDIA_WEIGHTING
  const progress = total > 0 ? sofar / total : 0
  // Round progress to 2-decimal places. PeerItem is memoized, so it will not
  // update if progress does not change. Without rounding PeerItem updates
  // unnecessarily on every progress change, when we are only showing the user a
  // rounded percentage progress. Increase this to 3-decimal places if you want
  // to show more detail to the user.
  return {
    percent: Math.round(progress * 100) / 100,
    mediaSofar: peerState.message.media.sofar || 0,
    mediaTotal: peerState.message.media.total || 0,
    dbSofar: peerState.message.db.sofar || 0,
    dbTotal: peerState.message.db.total || 0
  }
}

export function parseVersionMajor (versionString = '') {
  const major = Number.parseInt(versionString.split('.')[0])
  return isNaN(major) ? 0 : major
}

const useStyles = makeStyles(theme => ({
  root: {
    height: '100%',
    width: '100%',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#F5F5F5'
  }
}))
