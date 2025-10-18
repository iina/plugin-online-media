import { opt } from "./options";
import { updateBinary, findBinary } from "./binary";
import { downloadVideo, resetStatusNeedUpdate, statusNeedUpdate, tasks } from "./download";

const { console, global, menu, standaloneWindow, file, utils } = iina;

// Menu

menu.addItem(
  menu.item("Manage yt-dlp and Downloads...", async () => {
    showDownloadsWindow();
  }),
);

// Downloads window

global.onMessage("downloadVideo", async (url, player) => {
  if (url) {
    await downloadVideo(url.toString(), player);
    global.postMessage(player, "downloading", true);
    showDownloadsWindow();
  }
});

export function updateDownloadsWindow() {
  const active = !tasks.every((t) => t.status === "done" || t.status === "error");
  standaloneWindow.postMessage("update", {
    active,
    data: tasks.map((t) => t.serialize()),
  });
}

function showDownloadsWindow() {
  standaloneWindow.loadFile("downloads.html");
  standaloneWindow.setProperty({
    title: "Downloads",
    resizable: true,
    fullSizeContentView: false,
    hideTitleBar: false,
  });
  standaloneWindow.setFrame(320, 400);

  standaloneWindow.onMessage("requestUpdate", ({ force }) => {
    if (!force && !statusNeedUpdate) return;
    updateDownloadsWindow();
    resetStatusNeedUpdate();
  });

  standaloneWindow.onMessage("openFile", ({ file }) => {
    global.createPlayerInstance({ url: file });
  });

  standaloneWindow.onMessage("revealFile", ({ fileName }) => {
    file.showInFinder(fileName);
  });

  standaloneWindow.onMessage("getBinaryInfo", async () => {
    const ytdl = findBinary();
    console.log("Binary path: " + ytdl);
    const res = await utils.exec(ytdl, ["--version"]);
    standaloneWindow.postMessage("binaryInfo", {
      path: ytdl,
      res: res,
    });
  });

  standaloneWindow.onMessage("updateBinary", async () => {
    if (opt.ytdl_path) {
      standaloneWindow.postMessage("disableDownload", null);
      return;
    }
    standaloneWindow.postMessage("actionInProgress", { msg: "Downloading..." });
    const res = await updateBinary();
    standaloneWindow.postMessage("actionDone", { res });
  });

  standaloneWindow.open();
}
