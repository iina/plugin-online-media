import { downloadYTDLP } from "./binary";
import {
  downloadVideo,
  resetStatusNeedUpdate,
  statusNeedUpdate,
  tasks,
} from "./download";

let { console, core, global, menu, standaloneWindow, utils } = iina;

// Menu

menu.addItem(
  menu.item("Update yt-dlp...", async () => {
    const hasUnfinishedTasks =
      tasks.findIndex(
        (t) => t.status === "downloading" || t.status === "pending",
      ) >= 0;
    if (hasUnfinishedTasks) {
      utils.ask("Please wait until all downloads are finished.");
    }

    showDownloadYTDLPWindow();
    let error = await downloadYTDLP();
    if (error) {
      standaloneWindow.setContent(`Error downloading yt-dlp<br>${error}`);
    } else {
      standaloneWindow.setContent(`Updated.`);
      await new Promise((r) => setTimeout(r, 1000));
      standaloneWindow.close();
    }
  }),
);

menu.addItem(
  menu.item("Show Downloads", async () => {
    showDownloadsWindow();
  }),
);

// Downloads window

standaloneWindow.onMessage("requestUpdate", ({ force }) => {
  if (!force && !statusNeedUpdate) return;
  updateDownloadsWindow();
  resetStatusNeedUpdate();
});

global.onMessage("downloadVideo", async (url, player) => {
  if (url) {
    await downloadVideo(url.toString(), player);
    global.postMessage(player, "downloading", true);
    showDownloadsWindow();
  }
});

standaloneWindow.onMessage("openFile", ({ file }) => {
  global.createPlayerInstance({ url: file });
});

standaloneWindow.onMessage("revealFile", ({ file }) => {
  utils.exec("open", ["-R", file]);
});

export function updateDownloadsWindow() {
  const active = !tasks.every(
    (t) => t.status === "done" || t.status === "error",
  );
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
  standaloneWindow.open();
}

// Update yt-dlp window

function showDownloadYTDLPWindow() {
  standaloneWindow.simpleMode();

  standaloneWindow.setContent(`
    <div class="message">Downloading yt-dlp...</div>
    <div class="spinner"><div></div><div></div><div></div><div></div></div>`);

  standaloneWindow.setStyle(`
  body {
    user-select: none;
    pointer-events: none;
    text-align: center;
    padding: 20px 10px 10px 10px;
  }
  .message {
    margin-bottom: 6px;
  }
  ${spinnerCSS}
  `);

  standaloneWindow.setProperty({
    resizable: false,
    fullSizeContentView: true,
    hideTitleBar: true,
  });
  standaloneWindow.setFrame(400, 112);

  standaloneWindow.open();
}

let spinnerCSS = `
.spinner {
  display: inline-block;
  position: relative;
  width: 80px;
  height: 20px;
}
.spinner div {
  position: absolute;
  top: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  animation-timing-function: cubic-bezier(0, 1, 1, 0);
}
.spinner div:nth-child(1) {
  left: 28px;
  animation: spinner1 0.6s infinite;
}
.spinner div:nth-child(2) {
  left: 28px;
  animation: spinner2 0.6s infinite;
}
.spinner div:nth-child(3) {
  left: 40px;
  animation: spinner2 0.6s infinite;
}
.spinner div:nth-child(4) {
  left: 52px;
  animation: spinner3 0.6s infinite;
}
@keyframes spinner1 {
  0% {
    transform: scale(0);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes spinner3 {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(0);
  }
}
@keyframes spinner2 {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(12px, 0);
  }
}`;
