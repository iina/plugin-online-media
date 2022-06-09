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
    document.getElementById("content").innerHTML = mustache.render(
      TEMPLATE,
      message,
    );
  });

  window.openFile = function (file) {
    iina.postMessage("openFile", { file: b64_to_utf8(file) });
  };

  window.revealFile = function (file) {
    iina.postMessage("revealFile", { file: b64_to_utf8(file) });
  };
}

document.addEventListener("DOMContentLoaded", init);

function utf8_to_b64(str) {
  return window.btoa(unescape(encodeURIComponent(str)));
}

function b64_to_utf8(str) {
  return decodeURIComponent(escape(window.atob(str)));
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
<div class="right">
{{#is_done}}
<a href="#" onclick="openFile('{{dest_base64}}')">Open</a>
<a href="#" onclick="revealFile('{{dest_base64}}')">Reveal in Finder</a>
{{/is_done}}
</div>
</div>
</div>
{{/data}}
{{^data}}
<center>No downloads</center>
{{/data}}
</div>
`;
