import { findBinary } from "./binary";
import { updateDownloadsWindow } from "./global";
import { opt } from "./options";
import { formatFileSize, formatSeconds } from "./utils";

const { console, global, utils } = iina;

export const tasks: DownloadTask[] = [];
export let statusNeedUpdate = false;

export function resetStatusNeedUpdate() {
  statusNeedUpdate = false;
}

class DownloadTask {
  startTime: Date;
  status: "pending" | "downloading" | "done" | "error" = "pending";
  res: ReturnType<typeof utils.exec>;
  errorMessage: string | null = null;
  warningMessage: string | null = null;
  downloadedBytes: number = 0;
  totalBytes: number = 0;
  eta: number | null = null;

  constructor(
    public player: string,
    public url: string,
    public filename: string,
    public destFolder: string,
    public ytdl: string,
    public jsRuntime: string,
    public format: string | null,
    public ffmpegLocation: string | null,
  ) {}

  get dest() {
    return `${this.destFolder}/${this.filename}`;
  }

  private get args() {
    const args: string[] = [];
    args.push("-P", this.destFolder);
    if (this.format) {
      args.push("--format", this.format);
    }
    if (this.jsRuntime) {
      args.push("--js-runtimes", this.jsRuntime);
    }
    if (this.ffmpegLocation) {
      args.push("--ffmpeg-location", this.ffmpegLocation);
    }
    args.push(
      "--progress-template",
      "!!%(progress.downloaded_bytes)s-%(progress.total_bytes)s-%(progress.eta)s",
    );
    args.push("--", this.url);
    return args;
  }

  start() {
    this.startTime = new Date();
    utils
      .exec(this.ytdl, this.args, null, (data) => this.onStdout(data), null)
      .then(
        (res) => {
          console.log("Download finished");
          if (res.status === 0) {
            this.status = "done";
            global.postMessage(this.player, "downloaded", true);
          } else {
            this.status = "error";
            this.errorMessage = res.stderr;
          }
          updateDownloadsWindow();
        },
        (error) => {
          this.status = "error";
          this.errorMessage = error.toString();
          updateDownloadsWindow();
        },
      );
    this.status = "downloading";
    updateDownloadsWindow();
  }

  onStdout(data: string) {
    data = data.trim();
    if (data.length === 0 || !data.startsWith("!!")) return;
    const [downloaded, total, eta] = data.slice(2).split("-");
    if (downloaded !== "NA") this.downloadedBytes = parseInt(downloaded);
    if (total !== "NA") this.totalBytes = parseInt(total);
    if (eta !== "NA") this.eta = parseInt(eta);
    statusNeedUpdate = true;
  }

  serialize() {
    return {
      url: this.url,
      filename: this.filename,
      destFolder: this.destFolder,
      dest: this.dest,
      status: this.status,
      start: this.startTime.toString(),
      error: this.errorMessage,
      warning: this.warningMessage,
      dl: formatFileSize(this.downloadedBytes),
      total: formatFileSize(this.totalBytes),
      eta: formatSeconds(this.eta),
    };
  }
}

async function findFFmpegLocation(): Promise<string | null> {
  if (opt.ffmpeg_path) {
    if (utils.fileInPath(opt.ffmpeg_path)) {
      const resolvedPath = utils.resolvePath(opt.ffmpeg_path);
      console.log(`Found ffmpeg from preferences; using ${resolvedPath}`);
      return resolvedPath;
    }
    console.warn(`Configured ffmpeg path was not found: ${opt.ffmpeg_path}`);
  }

  const which = await utils.exec("/usr/bin/which", ["ffmpeg"]);
  const whichPath = which.stdout.trim();
  if (which.status === 0 && whichPath) {
    console.log(`Found ffmpeg using which; using ${whichPath}`);
    return whichPath;
  }

  const candidates = [
    "/opt/homebrew/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/opt/local/bin/ffmpeg",
    "/sw/bin/ffmpeg",
  ];
  for (const candidate of candidates) {
    if (utils.fileInPath(candidate)) {
      console.log(`Found ffmpeg; using ${candidate}`);
      return candidate;
    }
  }

  console.warn("ffmpeg was not found; yt-dlp may be unable to merge best video and audio formats");
  return null;
}

function formatNeedsFFmpeg(format: string | null): boolean {
  return !!format && format.includes("+");
}

export async function downloadVideo(url: string, player: string) {
  const { path, jsRuntime } = await findBinary();
  const resolvedJsRuntime = jsRuntime ? utils.resolvePath(jsRuntime) : "";
  const ffmpegLocation = await findFFmpegLocation();
  let format = opt.format;
  if (!ffmpegLocation && formatNeedsFFmpeg(format)) {
    console.warn(`ffmpeg was not found; falling back from ${format} to best`);
    global.postMessage(
      player,
      "downloadWarning",
      "ffmpeg not found; downloading lower-quality single-file format",
    );
    format = "best";
  }
  console.log(`Using download format: ${format}`);

  const filenameArgs = ["--format", format];
  if (resolvedJsRuntime) {
    filenameArgs.push("--js-runtimes", resolvedJsRuntime);
  }
  if (ffmpegLocation) {
    filenameArgs.push("--ffmpeg-location", ffmpegLocation);
  }
  filenameArgs.push("--get-filename", "--", url);
  const filename = (await utils.exec(path, filenameArgs)).stdout.replaceAll("\n", "");
  console.log(filename);

  let destFolder = `~/Downloads`;

  const task = new DownloadTask(
    player,
    url,
    filename,
    destFolder,
    path,
    resolvedJsRuntime,
    format,
    ffmpegLocation,
  );
  if (!ffmpegLocation && formatNeedsFFmpeg(opt.format)) {
    task.warningMessage =
      "ffmpeg not found; downloading lower-quality single-file format. Set the ffmpeg path in plugin preferences to enable best video and audio downloads.";
  }
  tasks.push(task);
  task.start();
}
