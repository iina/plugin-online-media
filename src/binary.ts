import { opt } from "./options";

const { core, console, http, file, utils } = iina;

const YTDLP_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos.zip";

export async function downloadYTDLP() {
  const tempID = new Date().getTime();
  const downloadedZip = utils.resolvePath(`@data/yt-dlp_${tempID}.zip`);
  const unzipFolder = utils.resolvePath(`@data/yt-dlp_${tempID}`);
  const destFolder = utils.resolvePath(`@data/yt-dlp`);
  try {
    console.log(`Downloading yt-dlp to ${downloadedZip}`);
    await http.download(YTDLP_URL, downloadedZip);
    await utils.exec("/bin/bash", [
      "-c",
      `
      unzip '${downloadedZip}' -d '${unzipFolder}' &&
      mv '${unzipFolder}' '${destFolder}' &&
      rm '${downloadedZip}' &&
      xattr -cr '${destFolder}'
      `,
    ]);
    return null;
  } catch (e) {
    console.error(e);
    file.delete(downloadedZip);
    return e.toString();
  }
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
