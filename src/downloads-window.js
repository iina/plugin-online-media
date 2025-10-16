import mustache from "mustache";

function init() {
  iina.postMessage("requestUpdate", { force: true });

  let interval = null;

  const startUpdate = () =>
    (interval = setInterval(() => {
      iina.postMessage("requestUpdate", { force: false });
    }, 1000));
  const stopUpdate = () => clearInterval(interval);

  iina.onMessage("update", (msg) => {
    if (msg.active) {
      startUpdate();
    } else {
      stopUpdate();
    }
    msg.data.forEach((item) => {
      item[`is_${item.status}`] = true;
      item.dest_base64 = utf8_to_b64(item.dest);
    });
    document.getElementById("content").innerHTML = mustache.render(TEMPLATE, msg);
  });

  iina.onMessage("updatingBinary", () => {
    document.getElementById("binary-desc").textContent = "";
    document.getElementById("binary-version").textContent = "";
    document.getElementById("download-info").textContent = "";
    document.getElementById("downloading").style.display = "block";
  });

  iina.onMessage("binaryUpdated", ({ res }) => {
    document.getElementById("downloading").style.display = "none";
    document.getElementById("download-info").textContent =
      res.status === 0 ? res.stdout : res.stderr;
    document.getElementById("download-info").style.color = res.status === 0 ? "" : "#ff3b30";
  });

  window.openFile = function (file) {
    iina.postMessage("openFile", { file: b64_to_utf8(file) });
  };

  window.revealFile = function (file) {
    iina.postMessage("revealFile", { fileName: b64_to_utf8(file) });
  };

  document.getElementById("check-binary").addEventListener("click", () => {
    updateBinaryInfo();
  });

  document.getElementById("download-binary").addEventListener("click", () => {
    iina.postMessage("updateBinary");
  });
}

document.addEventListener("DOMContentLoaded", init);

function utf8_to_b64(str) {
  return window.btoa(unescape(encodeURIComponent(str)));
}

function b64_to_utf8(str) {
  return decodeURIComponent(escape(window.atob(str)));
}

function updateBinaryInfo() {
  document.getElementById("download-info").textContent = "";
  document.getElementById("binary-desc").textContent = "Checking for yt-dlp...";
  iina.postMessage("getBinaryInfo");
  iina.onMessage("binaryInfo", ({ path, version, errorMessage }) => {
    let desc = "";
    if (path === null) {
      desc = `Unable to find yt-dlp.
        Troubleshooting:
        - Reinstall IINA (IINA-bundled yt-dlp is missing)
        - If you have an existing installation of yt-dlp,
        either put it in $PATH or set its path in 'Plugins>Online Media>Settings>Use custom yt-dlp installation'`;
    } else if (path === "iina-ytdl") {
      desc = `You are using yt-dlp bundled with IINA.
        It is recommended to keep it up to date using the button below.`;
    } else {
      binaryLocation = path;
      desc = `You are using yt-dlp configured by you in plugin settings.
        You may need to update it manually.`;
      document.getElementById("download-binary").style.display = "none";
    }
    document.getElementById("binary-desc").textContent = desc;

    const info = `Version: ${version}` + (path && path !== "iina-ytdl" ? `<br>Path: ${path}` : "");
    document.getElementById("binary-version").innerHTML = errorMessage ? errorMessage : info;
  });
}

const TEMPLATE = `
<div class="downloads-window">
{{#data}}
<div class="download-item">
<div class="filename">{{filename}}</div>
<div class="progress">
<div class="left">
{{#is_pending}}
Pending
{{/is_pending}}
{{#is_downloading}}
{{dl}}/{{total}} (ETA {{eta}})
{{/is_downloading}}
{{#is_done}}
Done
{{/is_done}}
{{#is_error}}
Error: {{error}}
{{/is_error}}
</div>
<div class="right task-options">
{{#is_done}}
<a href="#" onclick="openFile('{{dest_base64}}')">Open</a>
<a href="#" onclick="revealFile('{{dest_base64}}')">Reveal in Finder</a>
{{/is_done}}
</div>
</div>
</div>
{{/data}}
{{^data}}
<div class="no-task">No downloads. If you just started a download, it may take a few seconds to show up here.</div>
{{/data}}
</div>
`;
