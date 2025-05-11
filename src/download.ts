import { findBinary } from "./binary";
import { updateDownloadsWindow } from "./global";
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
  downloadedBytes: number = 0;
  totalBytes: number = 0;
  eta: number | null = null;

  constructor(
    public player: string,
    public url: string,
    public filename: string,
    public destFolder: string,
    public ytdl: string,
    public format: string,
  ) {}

  get dest() {
    return `${this.destFolder}/${this.filename}`;
  }

  private get args() {
    const args: string[] = [];
    args.push("-P", this.destFolder);
    // args.push("--format", this.format);
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
      dl: formatFileSize(this.downloadedBytes),
      total: formatFileSize(this.totalBytes),
      eta: formatSeconds(this.eta),
    };
  }
}

export async function downloadVideo(url: string, player: string) {
  // const hasFFmpeg =
  //   (await utils.exec("/bin/bash", ["-c", "'which ffmpeg'"])).status === 0;
  // const format = hasFFmpeg ? "bestvideo+bestaudio/best" : "best";
  // console.log(`FFmpeg found: ${hasFFmpeg}; using format: ${format}`);
  const format = null;

  const ytdl = findBinary();
  const filename = (await utils.exec(ytdl, ["--get-filename", url])).stdout.replaceAll("\n", "");
  console.log(filename);

  let destFolder = `~/Downloads`;
  const args: string[] = [];

  const task = new DownloadTask(player, url, filename, destFolder, ytdl, format);
  tasks.push(task);
  task.start();
}
