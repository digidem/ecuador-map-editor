const { shell, dialog, app, Menu } = require('electron')

const updater = require('./auto-updater')
const i18n = require('./i18n')
const logger = require('../logger')
const config = require('../../config')
const userConfig = require('./user-config')

const t = i18n.t

module.exports = function createMenu (ipc) {
  function setMenu () {
    var menu = Menu.buildFromTemplate(menuTemplate(ipc))
    Menu.setApplicationMenu(menu)
  }

  setMenu()
  // Re-add the menu every time the locale changes
  i18n.on('locale-change', () => setMenu())
}

function onUpdate (err, update) {
  if (err) logger.error('[UPDATER]', err)
  if (!update) {
    dialog.showMessageBox({
      message: t('menu-no-updates-available'),
      buttons: ['OK']
    })
  }
}

function menuTemplate (ipc) {
  var template = [
    {
      label: t('menu-file'),
      submenu: [
        {
          label: t('menu-import-tiles'),
          click: async function (item, focusedWindow) {
            var opts = {
              title: t('menu-import-tiles'),
              properties: ['openFile'],
              filters: [
                { name: 'Tar', extensions: ['tar'] }
              ]
            }
            const result = await dialog.showOpenDialog(opts)
            if (result.canceled) return
            if (!result.filePaths || !result.filePaths.length) return
            ipc.send('import-tiles', result.filePaths[0], cb)
            function cb (err) {
              if (err) {
                logger.error('[IMPORT TILES] error', err)
                dialog.showErrorBox(
                  t('menu-import-tiles-error'),
                  t('menu-import-tiles-error-known') + ': ' + err
                )
              } else {
                logger.debug('[IMPORT TILES] success')
                dialog.showMessageBox({
                  message: t('menu-import-data-success'),
                  buttons: ['OK']
                })
              }
            }
          }
        },
        {
          label: t('menu-import-configuration'),
          click: async function (item, focusedWindow) {
            const result = await dialog.showOpenDialog(
              {
                title: t('menu-import-configuration-title'),
                filters: [
                  { name: 'Mapeo Settings', extensions: ['mapeosettings'] }
                ],
                properties: ['openFile']
              }
            )
            logger.info('[MENU] Import Configuration', result)
            if (result.canceled) return
            if (!result.filePaths || !result.filePaths.length) return
            userConfig.importSettings(result.filePaths[0], (err) => {
              if (err) return onerror(err)
              ipc.send('reload-config', (err) => {
                if (err) logger.error(err)
                logger.debug('[SYSTEM] Forcing window refresh')
                focusedWindow.webContents.send('force-refresh-window')
              })
            })

            function onerror (err) {
              dialog.showErrorBox(
                t('menu-import-configuration-error'),
                t('menu-import-configuration-error-known') + ': ' + err
              )
            }
          }
        },
        {
          label: t('menu-import-data'),
          click: async function (item, focusedWindow) {
            // TODO: handle multiple files
            const result = await dialog.showOpenDialog(
              {
                title: t('menu-import-data-dialog'),
                filters: [
                  { name: 'GeoJSON', extensions: ['geojson'] },
                  { name: 'Shape', extensions: ['shp'] }
                ],
                properties: ['openFile']
              }
            )

            if (result.canceled) return
            if (!result.filePaths || !result.filePaths.length) return
            var filename = result.filePaths[0]
            logger.info('[IMPORTING]', filename)
            ipc.send('import-data', filename)
          },
          visible: true
        }
      ]
    },
    {
      label: t('menu-edit'),
      submenu: [
        {
          label: t('menu-cut'),
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: t('menu-copy'),
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: t('menu-paste'),
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: t('menu-selectall'),
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        }
      ]
    },
    {
      label: t('menu-visualization'),
      submenu: [
        {
          label: t('menu-change-language'),
          click: function (item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.webContents.send('change-language-request')
            }
          }
        },
        {
          label: t('menu-visualization-reload'),
          accelerator: 'CmdOrCtrl+R',
          click: function (item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.reload()
            }
          },
          visible: true
        },
        {
          label: t('menu-visualization-fullscreen'),
          accelerator: (function () {
            if (process.platform === 'darwin') {
              return 'Ctrl+Command+F'
            } else {
              return 'F11'
            }
          })(),
          click: function (item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.setFullScreen(!focusedWindow.isFullScreen())
            }
          }
        },
        {
          label: t('menu-visualization-devtools'),
          accelerator: (function () {
            if (process.platform === 'darwin') {
              return 'Alt+Command+I'
            } else {
              return 'Ctrl+Shift+I'
            }
          })(),
          click: function (item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.toggleDevTools()
            }
          },
          visible: true
        },
        {
          label: t('menu-zoom-to-data'),
          click: function (item, focusedWindow) {
            ipc.send(
              'zoom-to-data-get-centroid',
              // For territory view, we want the centroid of both nodes and observations
              ['node', 'observation'],
              function (err, loc) {
                if (err) logger.error(err)
                logger.debug('RESPONSE(menu,getDatasetCentroid):', loc)
                if (!loc) return
                focusedWindow.webContents.send('zoom-to-data-territory', loc)
              }
            )
            ipc.send('zoom-to-data-get-centroid', 'observation', function (
              err,
              loc
            ) {
              if (err) logger.error(err)
              logger.debug('RESPONSE(menu,getDatasetCentroid):', loc)
              if (!loc) return
              focusedWindow.webContents.send('zoom-to-data-observation', loc)
            })
          },
          visible: true
        },
        {
          label: t('menu-zoom-to-latlon'),
          click: function (item, focusedWindow) {
            focusedWindow.webContents.send('open-latlon-dialog')
          },
          visible: true
        }
      ]
    },
    {
      label: t('menu-window'),
      role: 'window',
      submenu: [
        {
          label: t('menu-minimize'),
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
        },
        {
          label: t('menu-close'),
          accelerator: 'CmdOrCtrl+W',
          role: 'close'
        }
      ]
    },
    {
      label: t('menu-help'),
      role: 'help',
      submenu: [
        {
          label: t('menu-open-user-data'),
          click: function (item, focusedWindow) {
            shell.openPath(app.getPath('userData'))
          },
          visible: true
        },
        {
          type: 'separator'
        },
        {
          label: t('menu-check-for-updates'),
          click: function (item, focusedWindow) {
            updater.checkForUpdates(onUpdate)
          },
          visible: true
        },
        {
          label: t('menu-get-beta'),
          type: 'checkbox',
          checked: updater.channel === 'beta',
          click: function (item, focusedWindow) {
            updater.channel = (updater.channel === 'beta') ? 'latest' : 'beta'
            updater.checkForUpdates(onUpdate)
          },
          visible: true
        },
        {
          type: 'separator'
        },
        {
          label: t('menu-debugging'),
          type: 'checkbox',
          checked: logger._debug,
          click: function (item, focusedWindow) {
            var bool = item.checked
            logger.debugging(bool)
            ipc.send('debugging', bool)
            focusedWindow.webContents.send('debugging', bool)
          }
        },
        {
          label: t('menu-status'),
          click: function () {
            ipc.send('get-database-status', (err, feeds) => {
              if (err) {
                logger.error('[DATABASE STATUS] error', err)
                dialog.showErrorBox(t('menu-status-error-known') + ': ' + err)
              } else {
                logger.info('[DATABASE STATUS]', feeds)
                var incomplete = feeds.filter((s) => s.sofar < s.total)
                var message
                // TODO: make this display more nicely
                if (!incomplete.length) message = t('menu-status-complete')
                else {
                  var display = incomplete.map(d => `${d.id.substr(0, 7)}\n${d.sofar}/${d.total}`).join('\n\n')
                  message = t('menu-status-incomplete') + '\n\n' + display
                }

                dialog.showMessageBox({
                  message: message,
                  buttons: ['OK']
                })
              }
            })
          }
        },
        {
          label: t('menu-report'),
          click: function (item, focusedWindow) {
            shell.openExternal(`${config.GITHUB_URL}/issues/new?template=bug_report.md`)
          }
        }
      ]
    }
  ]

  if (process.platform === 'darwin') {
    var name = require('electron').app.getName()
    template.unshift({
      label: name,
      submenu: [
        {
          label: t('menu-about') + ' ' + name,
          role: 'about'
        },
        {
          type: 'separator'
        },
        {
          label: t('menu-services'),
          role: 'services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          label: t('menu-hide') + ' ' + name,
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: t('menu-hide-others'),
          accelerator: 'Command+Alt+H',
          role: 'hideothers'
        },
        {
          label: t('menu-show-all'),
          role: 'unhide'
        },
        {
          type: 'separator'
        },
        {
          label: t('menu-quit') + ' ' + name,
          accelerator: 'Command+Q',
          click: function () {
            app.quit()
          }
        }
      ]
    })
    // Window menu.
    template[3].submenu.push(
      {
        type: 'separator'
      },
      {
        label: t('menu-bring-to-front'),
        role: 'front'
      }
    )
  }

  return template
}
