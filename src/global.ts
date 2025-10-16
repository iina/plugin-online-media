import { updateBinary, findBinary } from "./binary";
import { downloadVideo, resetStatusNeedUpdate, statusNeedUpdate, tasks } from "./download";

let { console, global, menu, standaloneWindow, file, utils } = iina;

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
    const path = findBinary();
    console.log("Binary path: " + path);
    const res = await utils.exec(path, ["--version"]);
    if (res.status === 0) {
      const version = res.stdout;
      console.log("Version: " + version);
      standaloneWindow.postMessage("binaryInfo", {
        path,
        version,
        errorMessage: "",
      });
    } else {
      const errorMessage =
        "Error when executing the binary: " + (res.stderr ? res.stderr : "No error message");
      console.log(errorMessage);
      standaloneWindow.postMessage("binaryInfo", {
        path,
        version: "",
        errorMessage,
      });
    }
  });

  standaloneWindow.onMessage("updateBinary", () => {
    updateYTDLP();
  });

  standaloneWindow.open();
}

// Update yt-dlp window

async function updateYTDLP() {
  standaloneWindow.postMessage("updatingBinary", null);
  let res = await updateBinary();
  standaloneWindow.postMessage("binaryUpdated", { res });
}

async function showDownloadYTDLPWindow() {
  showDownloadsWindow();
  await new Promise((r) => setTimeout(r, 1000));
  updateYTDLP();
}
