import mustache from "mustache";

function init() {
  iina.postMessage("requestUpdate", { force: true });

  let interval = null;

  const startUpdate = () =>
    (interval = setInterval(() => {
      iina.postMessage("requestUpdate", { force: false });
    }, 1000));
  const stopUpdate = () => clearInterval(interval);

  iina.onMessage("update", function (message) {
    if (message.active) {
      startUpdate();
    } else {
      stopUpdate();
    }
    message.data.forEach((item) => {
      item[`is_${item.status}`] = true;
      item.dest_base64 = utf8_to_b64(item.dest);
    });
    document.getElementById("content").innerHTML = mustache.render(TEMPLATE, message);
  });

  iina.onMessage("updatingBinary", () => {
    const downloadContainer = Array.prototype.find.call(
      document.querySelectorAll(".download-container"),
      (el) => el.style.display === "block",
    );
    if (!downloadContainer) {
      console.error("No active download container found for updatingBinary message");
      return;
    }
    downloadContainer.querySelector(".download-error").textContent = "";
    downloadContainer.querySelector(".download-info").textContent = "";
    downloadContainer.querySelector(".downloading").style.display = "block";
  });

  iina.onMessage("downloadingDeno", () => {
    const downloadContainer = document.querySelector("#js-runtime-alert .download-container");
    if (!downloadContainer) {
      console.error("No download container found for downloadingDeno message");
      return;
    }
    downloadContainer.querySelector(".download-error").textContent = "";
    downloadContainer.querySelector(".download-info").textContent = "";
    downloadContainer.querySelector(".downloading").style.display = "block";
  });

  iina.onMessage("binaryUpdated", ({ updated, error }) => {
    const downloadContainer = Array.prototype.find.call(
      document.querySelectorAll(".download-container"),
      (el) => el.style.display === "block",
    );
    if (!downloadContainer) {
      console.error("No active download container found for binaryUpdated message");
      return;
    }
    downloadContainer.querySelector(".downloading").style.display = "none";
    if (updated) {
      downloadContainer.querySelector(".download-info").textContent =
        "Binary updated successfully. Please allow a few seconds preparing and verifying the new binary.";
      verifyBinaryInfo();
    } else {
      downloadContainer.querySelector(
        ".download-error",
      ).textContent = `Failed to update binary: ${error}`;
    }
  });

  iina.onMessage("denoDownloaded", ({ downloaded, error }) => {
    const downloadContainer = document.querySelector("#js-runtime-alert .download-container");
    downloadContainer.querySelector(".downloading").style.display = "none";
    if (downloaded) {
      downloadContainer.querySelector(".download-info").textContent =
        "Deno downloaded successfully.";
      setTimeout(() => {
        verifyBinaryInfo();
      }, 2000);
    } else {
      downloadContainer.querySelector(
        ".download-error",
      ).textContent = `Failed to download Deno: ${error}`;
    }
  });

  window.openFile = function (file) {
    iina.postMessage("openFile", { file: b64_to_utf8(file) });
  };

  window.revealFile = function (file) {
    iina.postMessage("revealFile", { fileName: b64_to_utf8(file) });
  };

  document.getElementById("check-binary").addEventListener("click", () => {
    verifyBinaryInfo();
  });

  document.getElementById("download-binary").addEventListener("click", () => {
    document.querySelector(".status-bundled .download-container").style.display = "block";
    iina.postMessage("downloadBinary");
  });

  document.getElementById("update-managed-binary").addEventListener("click", () => {
    document.querySelector(".status-managed .download-container").style.display = "block";
    iina.postMessage("updateManagedBinary");
  });

  document.getElementById("show-binary-in-finder").addEventListener("click", () => {
    iina.postMessage("showBinaryInFinder");
  });

  document.getElementById("download-deno").addEventListener("click", () => {
    document.querySelector("#js-runtime-alert .download-container").style.display = "block";
    iina.postMessage("downloadDeno");
  });

  iina.postMessage("getBinaryPath");
  iina.onMessage("binaryPath", (path) => {
    updateBinaryStatus(path);
  });
}

document.addEventListener("DOMContentLoaded", init);

function utf8_to_b64(str) {
  return window.btoa(unescape(encodeURIComponent(str)));
}

function b64_to_utf8(str) {
  return decodeURIComponent(escape(window.atob(str)));
}

function updateBinaryStatus({ path, jsRuntime }) {
  console.log("Updating binary status:", path, jsRuntime);
  let statusClassName;
  if (!path || path === "youtube-dl") {
    statusClassName = "bundled";
  } else if (path === "@data/yt-dlp/yt-dlp_macos") {
    statusClassName = "managed";
  } else {
    statusClassName = "custom";
  }
  document.querySelectorAll(".binary-status").forEach((el) => {
    el.style.display = "none";
  });
  const el = document.querySelector(`.binary-status.status-${statusClassName}`);
  if (el) {
    el.style.display = "block";
  }

  // We assume a custom binary (almost always installed by a package manager) has built-in JS runtime support
  const shouldShowJsRuntimeAlert = statusClassName !== "custom" && !jsRuntime;
  document.getElementById("js-runtime-alert").style.display = shouldShowJsRuntimeAlert
    ? "block"
    : "none";
}

function verifyBinaryInfo() {
  document.getElementById("binary-desc").textContent = "Checking for yt-dlp binary...";
  iina.postMessage("getBinaryInfo");
  iina.onMessage("binaryInfo", ({ path, version, jsRuntime, errorMessage }) => {
    let description,
      binaryLocation = "";
    if (path === "youtube-dl") {
      description = `You are using the yt-dlp bundled with IINA. This will be deprecated in the future.
        It is recommended to download the latest version using the button below.`;
    } else if (path === "@data/yt-dlp/yt-dlp_macos") {
      const managedPath = `~/Application Support/com.colliderli.iina/plugins/.data/io.iina.ytdl/yt-dlp`;
      description = `You are using the yt-dlp installation managed by this plugin. The binary is located at ${managedPath}.`;
    } else {
      binaryLocation = path;
      description = `It seems that you are using a custom yt-dlp binary. You may need to update it manually.`;
      document.getElementById("download-binary").style.display = "none";
    }
    if (errorMessage) {
      document.getElementById("binary-version").textContent = errorMessage;
    } else {
      let message = "Version: " + version;
      if (binaryLocation) {
        message += `<br>binary location: ${binaryLocation}`;
      }
      document.getElementById("binary-version").innerHTML = message;
    }
    document.getElementById("binary-desc").textContent = description;
    updateBinaryStatus({ path, jsRuntime });
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
