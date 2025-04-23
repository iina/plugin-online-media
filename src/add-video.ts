import {
  setHTTPHeaders,
  isSafeURL,
  optionWasSet,
  edlTrackJoined,
  optionWasSetLocally,
  edlEscape,
  ytdlCodecToMpvCodec,
} from "./utils";
import { opt } from "./options";
import { currentURL } from "./ytdl-hook";

const { core, console, global, mpv, menu } = iina;

interface Chapter {
  time: number;
  title: string;
}

export let chapterList: Chapter[] = [];
export let isSwitchingFormat = false;
let currentVideoFormat: string;
let currentAudioFormat: string;

function matchTime(line: string): number | null {
  const match = line.match(/((\d+):)?(\d\d?):(\d\d)/);
  if (!match) return null;
  const [, , a, b, c] = match;
  return (a ? parseInt(a) : 0) * 3600 + parseInt(b) * 60 + parseInt(c);
}

function extractChapters(data: string, videoLength: number) {
  const lines = data.split(/\r|\n/);
  const result: Chapter[] = [];
  for (const line of lines) {
    if (!line) continue;
    const time = matchTime(line);
    if (time && time < videoLength) {
      result.push({ time: time, title: line });
    }
  }
  result.sort((a, b) => a.time - b.time);
  return result;
}

function isValidManifest(json: YTDL.Entity) {
  const reqfmt = json.requested_formats
    ? json.requested_formats[1]
    : ({} as YTDL.Entity);
  if (!reqfmt.manifest_url && !json.manifest_url) return false;
  const proto = reqfmt.protocol || json.protocol || "";
  return proto === "http_dash_segments"
    ? hasNativeDashDemuxer()
    : proto.startsWith("m3u8");
}

function hasNativeDashDemuxer() {
  const demuxers = mpv.getNative<string[]>("demuxer-lavf-list") || [];
  return demuxers.indexOf("dash") >= 0;
}

function processVideo(reqfmts: YTDL.Video[], json?: YTDL.Entity) {
  let streamURL = "";
  let maxBitrate = 0;

  if (opt.use_manifests && isValidManifest(json)) {
    // prefer manifect_url if present
    const mpdURL = reqfmts ? reqfmts[0].manifest_url : json.manifest_url;
    if (!mpdURL) {
      console.error("No manifest URL found in JSON data.");
      return;
    } else if (!isSafeURL(mpdURL)) {
      return;
    }
    streamURL = mpdURL;
    if (reqfmts) {
      maxBitrate = Math.max.apply(
        null,
        reqfmts.map((fmt) => fmt.tbr),
      );
    } else if (json.tbr) {
      maxBitrate = Math.max(maxBitrate, json.tbr);
    }
  } else if (reqfmts) {
    // DASH/split tracks
    for (const track of reqfmts) {
      const edlTrack = edlTrackJoined(
        track.fragments,
        track.protocol,
        json.is_live,
        track.fragment_base_url,
      );
      if (!edlTrack && !isSafeURL(track.url)) return;
      if (track.vcodec && track.vcodec !== "none") {
        // vide track
        streamURL = edlTrack || track.url;
      } else if (track.vcodec == "none") {
        // according to ytdl, if vcodec is None, it's audio
        mpv.command("audio-add", [
          edlTrack || track.url,
          "auto",
          track.format_note || "",
        ]);
      }
    }
  } else if (json.url) {
    const edlTrack = edlTrackJoined(
      json.fragments,
      json.protocol,
      json.is_live,
      json.fragment_base_url,
    );
    if (!edlTrack && !isSafeURL(json.url)) return;

    // normal video or single track
    streamURL = edlTrack || json.url;
    setHTTPHeaders(json.http_headers);
  } else {
    console.error("No URL found in JSON data.");
    return;
  }

  console.log(`streamurl: ${streamURL}`);

  mpv.set("stream-open-filename", streamURL.replace(/^data/, "data://"));
  mpv.set("file-local-options/force-media-title", json.title);

  // set hls-bitrate for dash track selection
  if (
    maxBitrate > 0 &&
    !optionWasSet("hls-bitrate") &&
    !optionWasSetLocally("hls-bitrate")
  ) {
    mpv.set("file-local-options/hls-bitrate", maxBitrate * 1000);
  }

  // add subtitles
  if (json.requested_subtitles) {
    Object.keys(json.requested_subtitles).forEach((lang) => {
      const subInfo = json.requested_subtitles[lang];
      console.log(subInfo);

      console.log(`adding subtitle [${lang}]`);
      const sub = subInfo.data
        ? `memory://${subInfo.data}`
        : subInfo.url && isSafeURL(subInfo.url)
        ? subInfo.url
        : null;

      if (sub) {
        const codec = ytdlCodecToMpvCodec(subInfo.ext);
        const codecStr = codec ? `,codec=${codec};` : ";";
        const edl = `edl://!no_clip;!delay_open,media_type=sub${codecStr}${edlEscape(
          sub,
        )}`;
        const title = subInfo.name || subInfo.ext;
        mpv.command("sub-add", [edl, "auto", title, lang]);
      } else {
        console.log(`No subtitle data/url for ${lang}`);
      }
    });
  }

  // add chapters
  if (json.chapters) {
    console.log("Adding pre-parsed chapters");
    for (let i = 0; i < json.chapters.length; i++) {
      const chapter = json.chapters[i];
      const title = chapter.title || `Chapter ${i}`;
      chapterList.push({ time: chapter.start_time, title: title });
    }
  } else if (json.description && json.duration) {
    chapterList = extractChapters(json.description, json.duration);
  }

  // set start time
  if (
    json.start_time &&
    !optionWasSet("start") &&
    !optionWasSetLocally("start")
  ) {
    console.log(`Setting start to: ${json.start_time} secs`);
    mpv.set("file-local-options/start", json.start_time);
  }

  // set aspect ratio for anamorphic video
  if (json.stretched_ratio && !optionWasSet("video-aspect")) {
    mpv.set("file-local-options/video-aspect", json.stretched_ratio);
  }

  let streamOpts =
    mpv.getNative<Record<string, string>>("file-local-options/stream-lavf-o") ||
    {};

  // for rtmp
  if (json.protocol == "rtmp") {
    streamOpts = {
      rtmp_tcurl: streamURL,
      rtmp_pageurl: json.page_url,
      rtmp_playpath: json.play_path,
      rtmp_swfverify: json.player_url,
      rtmp_swfurl: json.player_url,
      rtmp_app: json.app,
      ...streamOpts,
    };
  }
  if (json.proxy) {
    Object.assign(streamOpts, { http_proxy: json.proxy });
  }

  mpv.set("file-local-options/stream-lavf-o", streamOpts);
}

function formatDescription(f: YTDL._BaseEntity): string {
  return f.dynamic_range ? `${f.format} ${f.dynamic_range}` : f.format;
}

export function addVideo(json: YTDL.Entity) {
  let reqfmts = json.requested_formats;

  if (json.formats) {
    if (isSwitchingFormat) {
      const af = json.formats.find((f) => f.format_id === currentAudioFormat);
      const vf = json.formats.find((f) => f.format_id === currentVideoFormat);
      if (af && vf) {
        reqfmts = [af, vf];
        isSwitchingFormat = false;
      }
    } else {
      currentVideoFormat = json.requested_formats.find(
        (f) => f.vcodec !== "none",
      ).format_id;
      currentAudioFormat = json.requested_formats.find(
        (f) => f.vcodec === "none",
      ).format_id;
    }

    // add to menu
    console.log("reconstruct menu");

    menu.removeAllItems();
    menu.addItem(menu.separator());

    menu.addItem(
      menu.item(
        "Download this video",
        () => {
          core.osd("Preparing for download");
          global.postMessage("downloadVideo", currentURL);
        },
        { keyBinding: "Meta+d" },
      ),
    );

    const videoItem = menu.item("Video Quality");
    const audioItem = menu.item("Audio Quality");

    for (const f of json.formats) {
      if (f.vcodec === "none") {
        audioItem.addSubMenuItem(
          menu.item(
            formatDescription(f),
            () => {
              currentAudioFormat = f.format_id;
              isSwitchingFormat = true;
              mpv.command("loadfile", [mpv.getString("path")]);
            },
            { selected: f.format_id === currentAudioFormat },
          ),
        );
      } else {
        videoItem.addSubMenuItem(
          menu.item(
            formatDescription(f),
            () => {
              currentVideoFormat = f.format_id;
              isSwitchingFormat = true;
              mpv.command("loadfile", [mpv.getString("path")]);
            },
            { selected: f.format_id === currentVideoFormat },
          ),
        );
      }
    }
    menu.addItem(videoItem);
    menu.addItem(audioItem);
    menu.forceUpdate();
  }

  processVideo(reqfmts, json);
}
