import { opt } from "./options";

const { core, console, http, file, utils } = iina;

const YTDLP_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos.zip";
const DENO_URL = "https://github.com/denoland/deno/releases/latest/download/";

export async function downloadDeno() {
  const res = await utils.exec("/bin/bash", ["-c", `uname -m`]);
  if (res.status !== 0) {
    throw new Error(`Failed to get system architecture: ${res.stderr}`);
  }
  const arch = res.stdout.trim() === "arm64" ? "aarch64" : "x86_64";
  const fileName = `deno-${arch}-apple-darwin.zip`;
  const url = `${DENO_URL}${fileName}`;
  const downloadedZip = utils.resolvePath(`@data/${fileName}`);
  const destFolder = utils.resolvePath(`@data/deno`);
  let errorMessage = null;
  try {
    console.log(`Downloading Deno to ${downloadedZip}`);
    await http.download(url, downloadedZip);
    const res = await utils.exec("/bin/bash", [
      "-c",
      `
      TARGET="${destFolder}";
      unzip "${downloadedZip}" -d "${destFolder}" &&
      rm "${downloadedZip}" &&
      xattr -cr "${destFolder}"
      `,
    ]);
    if (res.status !== 0) {
      throw new Error(`Failed to unzip Deno: ${res.stderr}`);
    }
  } catch (e: any) {
    console.error(e.toString());
    errorMessage = e.toString();
  } finally {
    try {
      if (file.exists(downloadedZip)) file.delete(downloadedZip);
    } catch (e1: any) {
      console.error("Failed to delete temp files: " + e1.toString());
    }
  }
  return errorMessage;
}

export async function downloadYTDLP() {
  const tempID = new Date().getTime();
  const downloadedZip = utils.resolvePath(`@data/yt-dlp_${tempID}.zip`);
  const unzipFolder = utils.resolvePath(`@data/yt-dlp_${tempID}`);
  const destFolder = utils.resolvePath(`@data/yt-dlp`);
  let errorMessage = null;
  try {
    console.log(`Downloading yt-dlp to ${downloadedZip}`);
    await http.download(YTDLP_URL, downloadedZip);
    const res = await utils.exec("/bin/bash", [
      "-c",
      `
      TARGET="${destFolder}";
      rm -rf "${destFolder}_*";
      if [ -e "$TARGET" ] && [ ! -d "$TARGET" ] && [ -f "$TARGET" ]; then
        rm -rf "$TARGET";
      fi;
      if [ ! -e "$TARGET" ]; then
        mkdir -p "$TARGET";
      fi;
      unzip "${downloadedZip}" -d "${unzipFolder}" &&
      rm -rf "$TARGET"/* &&
      mv "${unzipFolder}"/* "$TARGET"/ &&
      rm "${downloadedZip}" &&
      xattr -cr "$TARGET"
      `,
    ]);
    if (res.status !== 0) {
      throw new Error(`Failed to unzip yt-dlp: ${res.stderr}`);
    }
  } catch (e: any) {
    console.error(e.toString());
    errorMessage = e.toString();
  } finally {
    try {
      if (file.exists(downloadedZip)) file.delete(downloadedZip);
      if (file.exists(unzipFolder)) file.delete(unzipFolder);
    } catch (e1: any) {
      console.error("Failed to delete temp files: " + e1.toString());
    }
  }
  return errorMessage;
}

export async function updateYTDLP() {
  let errorMessage = null;
  let { path, jsRuntime } = await findBinary();

  if (!path.startsWith("@data")) {
    errorMessage = `The binary at ${path} is not managed by the plugin.`;
    console.error(errorMessage);
    return errorMessage;
  }

  console.log(`Updating yt-dlp at ${path}`);
  const res = await utils.exec(path, ["-U"]);
  if (res.status === 0) {
    console.log("yt-dlp updated successfully.");
  } else {
    console.error(`Failed to update yt-dlp: ${res.stderr}`);
    errorMessage = `Failed to update yt-dlp: ${res.stderr}`;
  }
  return errorMessage;
}

export async function findBinary(): Promise<{ path: string; jsRuntime: string }> {
  let path = "youtube-dl";
  const searchList = [opt.ytdl_path, "@data/yt-dlp/yt-dlp_macos", "yt-dlp", "youtube-dl"];
  for (const item of searchList) {
    if (utils.fileInPath(item)) {
      console.log(`Found youtube-dl; using ${item}`);
      path = item;
      break;
    }
  }
  // search for the JS runtime
  let jsRuntime = "";
  const jsRuntimeSearchList = [opt.js_runtime, "@data/deno/deno"];
  for (const item of jsRuntimeSearchList) {
    if (item && utils.fileInPath(item)) {
      console.log(`Found JS runtime; using ${item}`);
      jsRuntime = item;
      break;
    }
  }
  return { path, jsRuntime };
}

export function findJSRuntime(): string | null {
  const jsRuntime = opt.js_runtime;
  if (jsRuntime) {
    console.log(`Using user-specified JS runtime: ${jsRuntime}`);
    return jsRuntime;
  }
  // try to find a runtime from the candidates
  const candidates = ["deno", "node", "quickjs", "bun"];
  for (const runtime of candidates) {
    if (utils.fileInPath(runtime)) {
      console.log(`Found JS runtime; using ${runtime}`);
      return runtime;
    }
  }
  return null;
}
