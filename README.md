# iina-plugin-ytdl

This package is largely a re-implementation of the mpv `ytdl_hook.lua` under IINA's plugin system, but with additional features.

## Features

- Maintain an up-to-date local copy of the `yt-dlp` binary
- Switch video resolution on the fly
- Download video files

## Setup & Build

```sh
npm i
npm run build
```

In order to load the plugin locally while developing new features,
it's recommended to create a `iinaplugin-dev` symlink under the pluign folder:

```
ln -s PATH_TO_REPO/iina-plugin-ytdl ~/Library/Application\ Support/com.colliderli.iina/plugins/iina-plugin-ytdl.iinaplugin-dev
```
