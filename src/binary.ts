import { opt } from "./options";

const { core, console, http, utils } = iina;

const YTDLP_URL =
  "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos";

export async function downloadYTDLP() {
  try {
    await http.download(YTDLP_URL, "@data/yt-dlp");
    return null;
  } catch (e) {
    return e.toString();
  }
}

export function findBinary(): string {
  let path = "youtube-dl";
  const searchList = [opt.ytdl_path, "@data/yt-dlp", "yt-dlp", "youtube-dl"];
  for (const item of searchList) {
    if (utils.fileInPath(item)) {
      console.log(`Found youtube-dl; using ${item}`);
      path = item;
      break;
    }
  }
  return path;
}
