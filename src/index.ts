import { runYTDLHook } from "./ytdl-hook";
import { opt, isBlacklisted } from "./options";
import { chapterList } from "./add-video";

const { core, console, global, mpv } = iina;

if (!opt.try_ytdl_first) {
  mpv.addHook("on_load", 10, async (next) => {
    console.log("ytdl:// hook");
    const url = mpv.getString("stream-open-filename");
    if (url.startsWith("ytdl://")) {
      await runYTDLHook(url);
    }
    next();
  });
}

mpv.addHook(
  opt.try_ytdl_first ? "on_load" : "on_load_fail",
  10,
  async (next) => {
    console.log("ytdl full hook");
    const url = mpv.getString("stream-open-filename");
    if (
      url.startsWith("ytdl://") ||
      url.startsWith("http://") ||
      url.startsWith("https://")
    ) {
      if (!isBlacklisted(url)) {
        await runYTDLHook(url);
      }
    }
    next();
  },
);

mpv.addHook("on_preloaded", 10, () => {
  console.log("ytdl preload hook");
  if (chapterList.length > 0) {
    mpv.set("chapter-list", chapterList);
    chapterList.length = 0;
  }
});

global.onMessage("downloading", () => {
  core.osd("Video downloading");
});

global.onMessage("downloaded", () => {
  core.osd("Video downloaded");
});
