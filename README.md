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

You may use the bundled `iina-plugin` binary to load or package the plugin.

This will create a symbolic link to the plugin in IINA's plugin directory and IINA will load the plugin in development mode:

```sh
iina-plugin link .
```

An `iinaplgz` file will be created in the current directory after running the `pack` command:

```sh
iina-plugin pack .
```

Please check out the [guide in the documentation](https://docs.iina.io/pages/creating-plugins.html) for more information.
