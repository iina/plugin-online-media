import { opt } from "./options";

const { core, console, http, file, utils } = iina;

const YTDLP_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos";

export async function downloadYTDLP() {
  const downloadFile = utils.resolvePath(`@data/yt-dlp`);
  let errorMessage = null;
  try {
    console.log(`Downloading yt-dlp at ${downloadFile}`);
    await http.download(YTDLP_URL, downloadFile);
  } catch (e) {
    console.error(e.toString());
    errorMessage = e.toString();
    try {
      if (file.exists(downloadFile)) file.delete(downloadFile);
    } catch (e1) {
      console.error("Failed to clean up: " + e1.toString());
    }
  }
  return errorMessage;
}

export function findBinary(): string {
  let path = "youtube-dl";
  const searchList = [opt.ytdl_path, "@data/yt-dlp", "yt-dlp"];
  for (const item of searchList) {
    if (utils.fileInPath(item)) {
      console.log(`Found youtube-dl; using ${item}`);
      path = item;
      break;
    }
  }
  return path;
}
