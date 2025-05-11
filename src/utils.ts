const { console, mpv } = iina;

const safeProtos = new Set([
  "http",
  "https",
  "ftp",
  "ftps",
  "rtmp",
  "rtmps",
  "rtmpe",
  "rtmpt",
  "rtmpts",
  "rtmpte",
  "data",
]);

export function ytdlCodecToMpvCodec(codec: string) {
  if (codec === "vtt") return "webvtt";
  if (codec === "opus" || codec === "vp9") return codec;
  if (codec.startsWith("avc")) return "h264";
  if (codec.startsWith("av0")) return "av1";
  if (codec.startsWith("mp4")) return "aac";
  return null;
}

export function optionWasSet(name: string) {
  return mpv.getFlag(`"option-info/${name}/set-from-commandline"`);
}

export function optionWasSetLocally(name: string) {
  return mpv.getFlag(`"option-info/${name}/set-locally"`);
}

export function setHTTPHeaders(headers: Record<string, string>) {
  if (!headers) return;

  const ua = headers["User-Agent"];
  if (ua && !optionWasSet("user-agent")) {
    mpv.set("file-local-options/user-agent", ua);
  }

  const mpvHeaders: string[] = [];
  for (const extraField of ["Cookie", "Referer", "X-Forwarded-For"]) {
    const value = headers[extraField];
    if (value) {
      mpvHeaders.push(`${extraField}: ${value}`);
    }
  }

  if (mpvHeaders.length > 0 && !optionWasSet("http-header-fields")) {
    mpv.set("file-local-options/http-header-fields", mpvHeaders);
  }
}

export function edlEscape(url: string) {
  return `%${url.length}%${url}`;
}

export function isSafeURL(url: string) {
  if (typeof url !== "string") return;
  const match = url.match(/^(.+?):\/\//);
  if (match[1] && safeProtos.has(match[1])) {
    return true;
  }
  console.log(`Ignoring potentially unsafe url ${url}`);
  return false;
}

export function getIndexFromYouTubePlaylist(url: string, json: YTDL.Playlist) {
  if (!json.extractor || json.extractor !== "youtube:playlist") return null;

  const index = url.indexOf("?");
  if (index < 0 || index === url.length - 1) return null;
  const query = url
    .substr(index + 1)
    .split("&")
    .map((x) => x.split("="));

  const args: Record<string, string> = {};
  query.forEach(([name, value]) => (args[name] = value));

  const maybeIdx = parseInt(args.index);

  if (maybeIdx && json.entries.length >= maybeIdx && json.entries[maybeIdx].id === args.v) {
    console.log("index matches requested video");
    return maybeIdx;
  }

  const idx = json.entries.findIndex((e) => e.id === args.v);
  if (idx >= 0) return idx;

  console.log("requested video not found in playlist");
  return null;
}

function joinURL(baseURL: string, fragment: YTDL.URLLike) {
  if (baseURL && fragment.path) {
    // make absolute url
    const url = fragment.path;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const [, proto, domain, rest] = baseURL.match(/(https?:\/\/)([^\/]+\/)(.*)\/?/);
    const segs = rest.split("/").concat(url.split("/"));
    const resolved: string[] = [];
    for (const seg of segs) {
      if (seg === "..") {
        resolved.pop();
      } else if (seg !== ".") {
        resolved.push(seg);
      }
    }
    return `${proto}${domain}${resolved.join("/")}`;
  } else {
    return fragment.url || "";
  }
}

export function edlTrackJoined(
  fragments: YTDL.URLLike[],
  protocol?: YTDL.Protocol,
  isLive?: boolean,
  base?: string,
) {
  if (!fragments || fragments.length === 0) {
    console.log("No fragments to join into EDL");
    return null;
  }

  const parts: string[] = [];

  if (protocol === "http_dash_segments" && !fragments[0].duration && !isLive) {
    // assume MP4 DASH initialization segment
    parts.push(`!mp4_dash,init=${edlEscape(joinURL(base, fragments[0]))}`);

    for (let i = 1; i < fragments.length; i++) {
      if (!fragments[i].duration) {
        console.error("EDL doesn't support fragments without duration with MP4 DASH");
        return null;
      }
    }
  }

  for (const frag of fragments) {
    if (!isSafeURL(joinURL(base, frag))) return null;
    parts.push(edlEscape(joinURL(base, frag)) + frag.duration ? `,length=${frag.duration}` : "");
  }

  return `edl://${parts.join(";")};`;
}

export function formatFileSize(bytes: number, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + " B";
  }

  const units = si
    ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

  return bytes.toFixed(dp) + " " + units[u];
}

export function formatSeconds(sec: number) {
  return new Date(sec * 1000).toISOString().substring(sec < 3600 ? 14 : 11, 19);
}
