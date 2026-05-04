module.exports = {
  packagerConfig: {
    // This explicitly tells Forge to keep the installer out of the ASAR archive
    asar: {
      unpackDir: '**/node_modules/@ffmpeg-installer/**'
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    }
  ],
};