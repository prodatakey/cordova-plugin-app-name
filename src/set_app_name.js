const fs = require('fs'),
      util = require('util'),
      path = require('path'),
      plist = require('plist'),
      parseString = util.promisify(require('xml2js').parseString),
      { Builder } = require('xml2js'),
      builder = new Builder({
          xmldec: {
              version: '1.0',
              encoding: 'UTF-8'
          }
      })

module.exports = async context => {
  const ConfigParser = context.requireCordovaModule('cordova-common/src/ConfigParser/ConfigParser')

  // Find up all our paths
  const projectRoot = context.opts.projectRoot,
        usesNewStructure = fs.existsSync(path.join(projectRoot, 'platforms', 'android', 'app')),
        basePath = usesNewStructure ? path.join(projectRoot, 'platforms', 'android', 'app', 'src', 'main') : path.join(projectRoot, 'platforms', 'android'),
        configPath = `${context.opts.projectRoot}/config.xml`


  const config = new ConfigParser(configPath)

  // Get the app name from the config.xml variable
  const name = config.getPreference('AppName')
  if(!name) {
    console.error('You must set an `AppName` preference for cordova-plugin-app-name to work properly')
    return
  }

  if(context.opts.platforms.indexOf('android') > -1) {
    await doAndroid(name, config)
  } else if(context.opts.platforms.indexOf('ios') > -1) {
    await doiOS(name, config)
  }

  async function doAndroid() {
    console.log('Setting Android App Name: ', name)
    const stringsPath = path.join(basePath, 'res', 'values', 'strings.xml')

    // make sure the android config file exists
    try {
      fs.accessSync(configPath, fs.F_OK)
    } catch(e) {
        return
    }

    // Update the strings with the proper app name
    const data = await parseString(fs.readFileSync(stringsPath, 'UTF-8'))

    data.resources.string
      .filter(string => string.$.name === 'app_name')
      .forEach(string => string._ = name)

    fs.writeFileSync(stringsPath, builder.buildObject(data))
  }

  async function doiOS() {
    console.log('Setting iOS App Name: ', name)
    // Find the ${appname}-Info.plist
    const infoPath = path.join('platforms', 'ios', config.name(), `${config.name()}-Info.plist`)

    // Update the plist with the proper app name
    const info = plist.parse(fs.readFileSync(infoPath, 'UTF-8'))

    // Replace the values
    ;['CFBundleName', 'CFBundleDisplayName']
      .forEach(setting => info[setting] = name)

    fs.writeFileSync(infoPath, plist.build(info))
  }
}
