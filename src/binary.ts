import { opt } from "./options";

const { core, console, http, file, utils } = iina;

const YTDLP_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos.zip";

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
  } catch (e) {
    console.error(e.toString());
    errorMessage = e.toString();
  } finally {
    try {
      if (file.exists(downloadedZip)) file.delete(downloadedZip);
      if (file.exists(unzipFolder)) file.delete(unzipFolder);
    } catch (e1) {
      console.error("Failed to delete temp files: " + e1.toString());
    }
  }
  return errorMessage;
}

export function findBinary(): string {
  let path = "youtube-dl";
  const searchList = [opt.ytdl_path, "@data/yt-dlp/yt-dlp_macos", "yt-dlp", "youtube-dl"];
  for (const item of searchList) {
    if (utils.fileInPath(item)) {
      console.log(`Found youtube-dl; using ${item}`);
      path = item;
      break;
    }
  }
  return path;
}
