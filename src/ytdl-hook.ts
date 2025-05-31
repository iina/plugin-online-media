import {
  setHTTPHeaders,
  isSafeURL,
  edlEscape,
  optionWasSet,
  getIndexFromYouTubePlaylist,
  edlTrackJoined,
} from "./utils";
import { addVideo, isSwitchingFormat } from "./add-video";
import { opt } from "./options";
import { findBinary } from "./binary";

const { core, console, mpv, utils } = iina;

export let currentURL: string;

interface TempOption {
  proxy: string | null;
  usePlaylist: boolean;
}

export async function runYTDLHook(url: string) {
  if (isSwitchingFormat) {
    core.osd("Switching quality…");
  } else {
    core.osd("Fetching online media information…");
  }

  let format = opt.format;
  let allsubs = true;
  const option: TempOption = {
    proxy: null,
    usePlaylist: false,
  };

  if (url.startsWith("ytdl://")) {
    url = url.substring(7);
  }

  currentURL = url;

  const args = [
    "--no-warnings",
    "--dump-single-json",
    "--flat-playlist",
    "--sub-format",
    "ass/srt/best",
  ];

  if (mpv.getString("options/vid") === "no") {
    format = "bestaudio/best";
    console.log("Video is disabled. Only use audio");
  }

  args.push("--format", format);

  const rawOptions = opt.rawOptions;
  const includeSubs = opt.includeSubs;
  const includeAutoSubs = includeSubs && opt.includeAutoSubs;

  rawOptions.split(" ").forEach((rawArg, index) => {
    let arg = rawArg;
    if (rawArg.includes("—")) {
      arg = rawArg.replace("—", "--");
      console.warn(`Argument ${rawArg} contains "—", trying to autocorrect`);
    }
    if (arg.startsWith("--")) {
      let argName: string;
      let argValue: string;
      // handle both --arg=value and --arg value cases
      if (arg.includes("=")) {
        const splitted = arg.split("=");
        argName = splitted[0];
        argValue = splitted[1];
      } else {
        argName = arg.substring(2);
        argValue = rawOptions[index + 1];
      }
      if (["sub-lang", "sub-langs", "srt-lang"].includes(argName) && argValue) {
        allsubs = false;
      } else if (argName === "proxy" && argValue) {
        option.proxy = argValue;
      } else if (argName === "yes-playlist") {
        option.usePlaylist = true;
      }
    }
    if (arg) args.push(arg);
  });

  if (allsubs && includeSubs) {
    args.push("--sub-langs", "all");
  }
  if (includeAutoSubs) {
    args.push("--write-auto-subs");
  }
  if (!option.usePlaylist) {
    args.push("--no-playlist");
  }

  args.push("--", url);

  try {
    console.log("Running youtube-dl...");

    // find the binary
    const ytdl = findBinary();

    // execute
    const out = await utils.exec(ytdl, args);
    if (out.status !== 0) {
      core.osd("Failed to run youtube-dl");
      console.error(`Error running youtube-dl: ${out.stderr}`);
      return;
    }
    console.log("Finished running youtube-dl");

    // parse the result
    try {
      let json = JSON.parse(out.stdout);
      console.log("Youtube-dl succeeded.");
      ytdlSuccess(url, json, option);
    } catch {
      core.osd("Failed to fetch online media information");
      console.error(`Failed to parse youtube-dl's output`);
    }
  } catch (err) {
    core.osd("Unknown error.");
    console.error(`Unexpected error: ${err}`);
  }
}

function ytdlSuccess(url: string, json: YTDL.Entity, option: TempOption) {
  core.osd("Opening media…");
  json.proxy = json.proxy || option.proxy;

  if (json.direct) {
    console.log("Got direct URL");
    return;
  } else if (json._type === "playlist" || json._type === "multi_video") {
    // a playlist
    if (json.entries.length === 0) {
      console.warn("Got empty playlist, nothing to play");
      return;
    }

    const isSelfRedirectingURL =
      json.entries[0]._type !== "url_transparent" &&
      json.entries[0].webpage_url &&
      json.entries[0].webpage_url === json.webpage_url;

    if (isSelfRedirectingURL) {
      if (
        json.entries.length > 1 &&
        json.entries[0].protocol === "m3u8_native" &&
        json.entries[0].url
      ) {
        console.log("Multi-arc video detected, building EDL");

        const playlist = edlTrackJoined(json.entries);
        console.log(`EDL: ${playlist}`);
        if (!playlist) return;

        setHTTPHeaders(json.entries[0].http_headers);
        mpv.set("stream-open-filename", playlist);
        if (json.title) {
          mpv.set("file-local-options/force-media-title", json.title);
        }

        // there might not be subs for the first segment
        const entryWithSubs = json.entries.find((entry) => entry.requested_subtitles);
        if (entryWithSubs && entryWithSubs.duration) {
          const subs = entryWithSubs.requested_subtitles;
          Object.keys(subs).forEach((lang) => {
            let subFile = "edl://";
            for (const entry of json.entries) {
              if (
                entry.requested_subtitles &&
                entry.requested_subtitles[lang] &&
                isSafeURL(entry.requested_subtitles[lang].url)
              ) {
                subFile += edlEscape(entry.requested_subtitles[lang].url);
              } else {
                subFile += edlEscape("memory://WEBVTT");
              }
              subFile = `${subFile},length=${entry.duration};`;
            }
            console.log(`${lang} sub EDL: ${subFile}`);
            mpv.command("sub-add", [subFile, "auto", subs[lang].ext, lang]);
          });
        }
      } else if (json.entries.length === 1) {
        console.log("Playlist with single entry detected");
        addVideo(json.entries[0]);
      }
    } else {
      const playlistIndex = getIndexFromYouTubePlaylist(url, json);
      const playlist = ["#EXTM3U"];

      for (const entry of json.entries) {
        let site = entry.url;
        const title = entry.title;
        if (title) playlist.push(`#EXTINF:0,${title.replace(/\s+/, " ")}`);

        if (entry.webpage_url && !isSelfRedirectingURL) {
          site = entry.webpage_url;
        }

        if (site.indexOf("://") < 0) {
          const prefix = site.indexOf(":") >= 0 ? "ytdl://" : "https://youtu.be/";
          playlist.push(`${prefix}${site}`);
        } else if (isSafeURL(site)) {
          playlist.push(site);
        }
      }

      if (option.usePlaylist && optionWasSet("playlist-start") && playlistIndex) {
        mpv.set("playlist-start", playlistIndex);
      }

      mpv.set("stream-open-filename", `memory://${playlist.join("\n")}`);
    }
  } else {
    // single video
    addVideo(json);
  }
}
