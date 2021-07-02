/* eslint-disable no-template-curly-in-string */
const { externals } = require('./webpack.common')
const fs = require('fs')
const path = require('path')
const { nodeFileTrace } = require('@vercel/nft')

const config = {
  afterSign: 'bin/notarize.js',
  detectUpdateChannel: true,
  generateUpdatesFilesForAllChannels: true,
  appId: 'org.digital-democracy.mapeo-desktop',
  productName: 'Mapeo',
  artifactName: 'Installar_Mapeo_v${version}_${os}.${ext}',
  mac: {
    category: 'public.app-category.utilities',
    gatekeeperAssess: false,
    hardenedRuntime: true,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist'
  },
  directories: {
    buildResources: 'build',
    output: 'dist/main'
  },
  win: {
    target: 'NSIS',
    artifactName: 'Installar_Mapeo_v${version}_${os}-${env.ARCH}.${ext}',
    rfc3161TimeStampServer: 'http://timestamp.digicert.com',
    timeStampServer: 'http://timestamp.digicert.com'
  },
  linux: {
    target: ['AppImage', 'deb'],
    category: 'Utility'
  },
  dmg: {
    icon: 'build/mapeo_installer.icns',
    title: '${productName} v${version}',
    sign: false,
    contents: [
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications'
      },
      {
        x: 130,
        y: 220,
        type: 'file'
      }
    ]
  },
  publish: [
    {
      provider: 's3',
      bucket: 'downloads.mapeo.app',
      path: process.env.ARCH === 'ia32' ? '/desktop/ia32' : '/desktop'
    },
    {
      provider: 'github',
      releaseType: 'release'
    }
  ],
  extraResources: [
    {
      from: 'build/app-update.yml',
      to: 'app-update.yml'
    },
    {
      from: path.dirname(require.resolve('mapeo-default-settings')),
      to: 'presets/default'
    }
  ]
}

const files = [
  'index.js',
  'config.js',
  // include everything under static
  'static/**/*',
  // include all translations
  'messages/**/*',
  // Don't ship built sourcemaps, because they are 25Mb
  '!static/*.map',
  // Include everything in src/ apart from src/renderer
  'src/**/*',
  '!src/renderer/**/*',
  // but also include src/renderer/index-preload.js since this is not included
  // in the renderer bundle
  'src/renderer/index-preload.js',
  // Ignore a bunch of noise that is in node_modules that is not needed in the
  // packaged app (identified these by scanning app.asar for the largest files)
  '!**/node_modules/osm-p2p-db/benchmark${/*}',
  '!**/node_modules/osm-p2p-syncfile/chaos',
  '!**/node_modules/osm2obj/*.osc',
  '!**/node_modules/pannellum/*.{jpg,png}',
  '!**/node_modules/sodium-native/**/*',
  '!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}',
  '!**/node_modules/**/{test,__tests__,tests,powered-test,example,examples}',
  '!**/node_modules/**/*.map',
  '!**/node_modules/**/mapbox-gl-dev.js',
  '!**/node_modules/**/mapbox-gl-unminified.js',
  '!**/node_modules/mapbox-gl/src',
  '!**/node_modules/*.d.ts',
  '!**/node_modules/.bin/**/*',
  '!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}',
  '!.editorconfig',
  '!**/._*',
  '!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}',
  '!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}',
  '!**/{appveyor.yml,.travis.yml,circle.yml}',
  '!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}',
  '!test${/*}'
]

// Append last, these modules are excluded, but we need these files included
// since they are required at runtime (css files and iD assets)
const extraIncludeFiles = [
  'node_modules/id-mapeo/dist/iD.css',
  'node_modules/id-mapeo/dist/*/**/*',
  'node_modules/mapbox-gl/dist/mapbox-gl.css'
]

// The results of nodeFileTrace on Windows are \ separated.
const sep = path.sep

module.exports = async () => {
  // Get required files for main and background process
  const { fileList } = await nodeFileTrace([
    './index.js',
    './src/background/mapeo-core/index.js',
    './src/background/map-printer/index.js'
  ])

  // List of all modules we definitely want to include
  const includeModules = fileList.reduce((acc, cur) => {
    const path = cur.split(`node_modules${sep}`).pop()
    let moduleName = path.split(sep)[0]
    // Ensure we included namespaced modules e.g. @digidem/mapeo Note we don't
    // use path.sep here, but a `/` because this is used for electron-builder
    // config, which uses glob which expects `/` on all platforms
    if (moduleName.startsWith('@')) moduleName += '/' + path.split(sep)[1]
    acc.add(moduleName)
    return acc
    // Also include the webpack externals, plus electron-is-dev which is not
    // picked up by static analysis
  }, new Set([...externals, 'electron-is-dev']))

  // List all modules in node_modules (this is only recursive to read namespaced
  // modules, but it does not bother with nested node_modules, since it would
  // not really change the output)
  const allModules = await (async function readDirs (dir) {
    let moduleNames = []

    const dirList = (
      await fs.promises.readdir(dir, {
        withFileTypes: true
      })
    )
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)

    for (const item of dirList) {
      if (item.startsWith('@')) {
        moduleNames = moduleNames.concat(
          (await readDirs(path.join(dir, item))).map(s => item + '/' + s)
        )
      } else if (item.startsWith('.')) {
        // ignore
      } else {
        moduleNames.push(item)
      }
    }
    return moduleNames
  })(path.join(__dirname, 'node_modules'))

  const excludeModules = []

  // Add explicit exclude paths for any modules that are not explicitly required
  // by the main and background process. It would be better to do this the other
  // way around (explicitly include files) but electron-builder always tries to
  // add **/node_modules/**/* to the files list, and doing this as an include
  // list as opposed to an exclude list was resulting in some modules missing
  // from the packaged app, even though they were listed here
  for (const moduleName of allModules) {
    if (!includeModules.has(moduleName)) {
      excludeModules.push(`!**/node_modules/${moduleName}/**/*`)
    }
  }

  config.files = [...files, ...excludeModules, ...extraIncludeFiles]

  let variantConfigTransform = config => config
  const variant = process.env.MAPEO_VARIANT
  if (variant && variant !== 'main') {
    try {
      variantConfigTransform = require(path.join(
        __dirname,
        'variants',
        variant,
        'builder.config.js'
      ))
    } catch (e) {
      console.warn('No configuration for variant ' + variant)
    }
  }

  return variantConfigTransform(config)
}
