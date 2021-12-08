declare namespace YTDL {
  export type Protocol =
    | "http"
    | "https"
    | "rtsp"
    | "rtmp"
    | "rtmpe"
    | "mms"
    | "f4m"
    | "ism"
    | "http_dash_segments"
    | "m3u8"
    | "m3u8_native";
  export interface Chapter {
    start_time: number;
    end_time: number;
    title: string;
  }

  interface _BaseEntity {
    _type?: string;

    id: string;
    title: string;
    description: string;
    format: string;
    format_id: string;
    format_note: string;
    url: string;
    manifest_url?: string;
    app: string;
    play_path: string;
    player_url: string;
    ext: string;
    width: number;
    height: number;
    vcodec: string;
    acodec: string;
    fps: number;
    filesize: number;
    tbr: number;
    quality: number;
    duration?: number;
    start_time: number;
    stretched_ratio: number;
    is_live?: boolean;
    fragments?: URLLike[];
    fragment_base_url?: string;
    protocol?: Protocol;
    http_headers?: Record<string, string>;
    chapters: Chapter[];

    requested_subtitles?: Record<
      string,
      { url: string; ext: string; data: string; _auto: boolean }
    >;
    formats?: Video[];
    requested_formats?: Video[];

    proxy?: string;

    extractor: string;
    extractor_key: string;
    page_url: string;
    webpage_url: string;

    direct?: boolean;
  }

  export interface Playlist extends _BaseEntity {
    _type: "playlist" | "multi_video";
    entries: URLLike[];
  }

  export interface Video extends _BaseEntity {
    _type?: "video";
    playlist: string;
    playlist_index: number;
  }

  export interface URLLike extends _BaseEntity {
    _type: "url" | "url_transparent";
    url: string;
    extract_flat: boolean;
    path?: string;
  }

  export interface URL extends URLLike {
    _type: "url";
  }

  export interface URLTransparent extends URLLike {
    _type: "url_transparent";
  }

  export type Entity = Playlist | Video | URL | URLTransparent;
}
