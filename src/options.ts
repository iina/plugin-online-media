const { console, preferences } = iina;

export const opt = {
  get exclude(): string {
    return preferences.get("excluded_urls");
  },
  get try_ytdl_first(): boolean {
    return preferences.get("try_ytdl_first");
  },
  get use_manifests(): boolean {
    return preferences.get("use_manifests");
  },
  get rawOptions(): string {
    return preferences.get("raw_options");
  },
  get format(): string {
    switch (preferences.get("video_quality")) {
      case "use_max":
        const maxHeight = preferences.get("max_video_height");
        return `bestvideo[height<=${maxHeight}]+bestaudio/best[height<=${maxHeight}]`;
      case "custom":
        return preferences.get("custom_ytdl_format");
      default:
        // best
        return "bestvideo+bestaudio/best";
    }
  },
};

let urlBlackList: RegExp[];

export function isBlacklisted(url: string) {
  if (opt.exclude === "") return false;
  if (!urlBlackList) {
    urlBlackList = opt.exclude.split("|").map((s) => new RegExp(s));
  }
  const match = url.match(/^https?:\/\/(.+?)$/);
  if (!match) return false;
  const body = match[1] || "";
  if (urlBlackList.some((b) => body.match(b))) {
    console.log("URL matches excluded substring. Skipping.");
    return true;
  }
  return false;
}
