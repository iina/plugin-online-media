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
    document.getElementById("content").style.display = "block";
    document.getElementById("content").innerHTML = mustache.render(TEMPLATE, msg);
  });

  iina.onMessage("actionInProgress", ({ msg }) => {
    action_in_progress(msg);
  });

  iina.onMessage("actionDone", ({ res, msg }) => {
    action_done(res, msg);
  });

  iina.onMessage("disableDownload", () => {
    disableDownload();
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

function disableDownload() {
  document.getElementById("download-binary").disabled = true;
}

function action_in_progress(msg) {
  document.getElementById("action-result").style.display = "none";
  document.getElementById("spinner-container").style.display = "block";
  document.getElementById("spinner-message").textContent = msg;
}

function action_done(res, msg) {
  document.getElementById("spinner-container").style.display = "none";
  document.getElementById("action-result").style.display = "block";
  document.getElementById("action-result").style.color = res.status === 0 ? "" : "#ff3b30";
  document.getElementById("action-result").innerHTML =
    (msg ? msg : "") + "<pre>" + (res.status === 0 ? res.stdout : res.stderr) + "</pre>";
}

function updateBinaryInfo() {
  action_in_progress("Verifying...");
  iina.postMessage("getBinaryInfo");
  iina.onMessage("binaryInfo", ({ path, res }) => {
    let desc = "";
    if (path === null) {
      desc = `Unable to find yt-dlp.
        Troubleshooting:
        - Reinstall IINA (IINA-bundled yt-dlp is missing)
        - If you have an existing installation of yt-dlp,
        either put it in $PATH or set its path in 'Plugins>Online Media>Settings>Use custom yt-dlp installation'`;
    } else if (path === "iina-ytdl") {
      desc = `You are using yt-dlp bundled with IINA.
        It is recommended to keep it up to date.`;
    } else {
      binaryLocation = path;
      desc = `You are using yt-dlp configured by you in plugin settings.
        You may need to update it manually.`;
      disableDownload();
    }
    const msg =
      desc +
      "<br><br>" +
      (path && path !== "iina-ytdl" ? `<pre>Path: ${path}</pre>` : "") +
      (res.status === 0 ? "<pre>Version: </pre>" : "");
    action_done(res, msg);
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
