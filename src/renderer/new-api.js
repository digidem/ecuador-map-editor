import 'core-js/es/reflect'
import ky from 'ky/umd'
import logger from '../logger'

export default Api({
  // window.middlewareClient is set in src/middleware/client-preload.js
  ipc: window.middlewareClient
})

function Api ({ baseUrl, mapUrl, ipc }) {
  // We append this to requests for presets and map styles, in order to override
  // the local static server cache whenever the app is restarted. NB. sprite,
  // font, and map tile requests might still be cached, only changes in the map
  // style will be cache-busted.
  const startupTime = Date.now()

  let req = ky.create({
    prefixUrl: baseUrl,
    // No timeout because indexing after first sync takes a long time, which mean
    // requests to the server take a long time
    timeout: false,
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache'
    }
  })

  function logRequest (prefix, promise) {
    const start = Date.now()
    promise
      .then(data => {
        logger.debug(prefix, Date.now() - start + 'ms')
      })
      .catch(error => {
        // Preset errors aren't fatal errors.
        if (prefix.indexOf('presets') > -1) logger.info(prefix, error)
        else logger.error(prefix, error)
      })
    return promise
  }
  // Request convenience methods that wait for the server to be ready
  function get (url) {
    return logRequest('<GET: ' + url, req.get(url).json())
  }
  function del (url) {
    return logRequest('<DEL: ' + url, req.delete(url).json())
  }
  function put (url, data) {
    return logRequest('<PUT: ' + url, req.put(url, { json: data }).json())
  }
  function post (url, data) {
    return logRequest('<POST: ' + url, req.post(url, { json: data }).json())
  }

  // All public methods
  const api = {
    // Hacky solution, probably need to create the api instance in the app, once
    // the backend has loaded
    setBaseUrl: function setBaseUrl (url) {
      baseUrl = url
      req = ky.extend({ prefixUrl: baseUrl })
    },

    getBaseUrl: function getBaseUrl () {
      return baseUrl
    },

    setMapUrl: function (url) {
      mapUrl = url
    },

    /**
     * GET async methods
     */

    getPresets: function getPresets (id) {
      if (!id) id = 'default'
      return get(`presets/${id}/presets.json?${startupTime}`)
    },

    getObservations: function getObservations () {
      return get('observations')
    },

    getMapStyle: function getMapStyle (id) {
      return get(`styles/${id}/style.json?${startupTime}`)
    },

    getMetadata: function getMetadata () {
      return get(`presets/default/metadata.json?${Date.now()}`).then(
        data => data || {}
      )
    },

    /**
     * DELETE methods
     */

    deleteObservation: function deleteObservation (id) {
      return del(`observations/${id}`)
    },

    /**
     * PUT and POST methods
     */

    updateObservation: function updateObservation (id, value) {
      const valueForServer = {
        ...value,
        type: 'observation',
        schemaVersion: 3,
        id
      }
      return put(`observations/${id}`, valueForServer)
    },

    createObservation: function createObservation (value) {
      const valueForServer = {
        ...value,
        type: 'observation',
        schemaVersion: 3
      }
      return post('observations', valueForServer)
    },

    /**
     * SYNC methods
     */

    // Listens to the server for updates to the list of peers available for sync
    // returns a remove() function to unscubribe
    addPeerListener: function addPeerListener (handler) {
      // We sidestep the http API here, and instead of polling the endpoint, we
      // listen for an event from mapeo-core whenever the peers change, then
      // request an updated peer list.
      function onPeerUpdate (peers) {
        logger.debug('peer-update', peers)
        handler(peers)
      }
      ipc.on('peer-update', onPeerUpdate)
      api.syncGetPeers().then(handler)
      return {
        remove: () => ipc.removeListener('peer-update', onPeerUpdate)
      }
    },

    addDataChangedListener: function (ev, handler) {
      ipc.on('sync-complete', handler)
      ipc.on(ev, handler)
      return {
        remove: () => {
          ipc.removeListener('sync-complete', handler)
          ipc.removeListener(ev, handler)
        }
      }
    },

    getEncryptionKey: function () {
      return new Promise((resolve, reject) => {
        ipc.send('encryption-key', null, (err, encryptionKey) => {
          if (err) return reject(err)
          resolve(encryptionKey)
        })
      })
    },

    // Start listening for sync peers and advertise with `deviceName`
    syncJoin: function syncJoin () {
      logger.debug('Join sync')
      ipc.send('sync-join')
    },

    // Stop listening for sync peers and stop advertising
    syncLeave: function syncLeave () {
      logger.debug('Leave sync')
      ipc.send('sync-leave')
    },

    // Get a list of discovered sync peers
    syncGetPeers: function syncGetPeers () {
      return get('sync/peers').then(data => data && data.message)
    },

    // Start sync with a peer
    syncStart: function syncStart (target) {
      ipc.send('sync-start', target)
    },

    // Connect to a MapeoWeb server
    connectCloud: function syncConnect (url) {
      ipc.send('sync-connect-cloud', url)
    },

    exportData: function (filename, { format = 'geojson' } = {}) {
      return new Promise((resolve, reject) => {
        ipc.send('export-data', { filename, format }, err => {
          if (err) {
            logger.error('export data', err)
            reject(err)
          } else resolve()
        })
      })
    },

    /**
     * HELPER synchronous methods
     */

    // Return the url for an icon
    getIconUrl: function getIconUrl (iconId, size = 'medium') {
      // Some devices are @4x or above, but we only generate icons up to @3x
      // Also we don't have @1.5x, so we round it up
      const roundedRatio = Math.min(Math.ceil(window.devicePixelRatio), 3)
      return `${baseUrl}presets/default/icons/${iconId}-medium@${roundedRatio}x.png`
    },

    // Return the url for a media attachment
    getMediaUrl: function getMediaUrl (attachmentId, size = 'preview') {
      return `${baseUrl}media/${size}/${attachmentId}`
    },

    // Return the url to a map style
    getMapStyleUrl: function getMapStyleUrl (id) {
      return `${baseUrl}styles/${id}/style.json?${startupTime}`
    },

    getCentroid: function (type, cb) {
      ipc.send('zoom-to-data-get-centroid', type, cb)
    },

    getMapImageURL: function ({
      lon,
      lat,
      zoom,
      width = 300,
      height = 300,
      dpi = 1,
      style,
      accessToken
    }) {
      let url = `${mapUrl}map/${lon}/${lat}/${zoom}/${width}/${height}/x${dpi}.png`
      const searchParams = []
      if (typeof style === 'string') {
        searchParams.push('style=' + style)
      }
      if (typeof accessToken === 'string') {
        searchParams.push('accessToken=' + accessToken)
      }
      if (searchParams.length) {
        url += '?' + searchParams.join('&')
      }
      return url
    }
  }

  return api
}
