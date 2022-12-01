(()=>{const{console:t,mpv:e}=iina,o=new Set(["http","https","ftp","ftps","rtmp","rtmps","rtmpe","rtmpt","rtmpts","rtmpte","data"]);function r(t){return e.getFlag(`"option-info/${t}/set-from-commandline"`)}function s(t){return e.getFlag(`"option-info/${t}/set-locally"`)}function n(t){if(!t)return;const o=t["User-Agent"];o&&!r("user-agent")&&e.set("file-local-options/user-agent",o);const s=[];for(const e of["Cookie","Referer","X-Forwarded-For"]){const o=t[e];o&&s.push(`${e}: ${o}`)}s.length>0&&!r("http-header-fields")&&e.set("file-local-options/http-header-fields",s)}function i(t){return`%${t.length}%${t}`}function l(e){if("string"!=typeof e)return;const r=e.match(/^(.+?):\/\//);return!(!r[1]||!o.has(r[1]))||(t.log(`Ignoring potentially unsafe url ${e}`),!1)}function a(e,o){if(!o.extractor||"youtube:playlist"!==o.extractor)return null;const r=e.indexOf("?");if(r<0||r===e.length-1)return null;const s=e.substr(r+1).split("&").map((t=>t.split("="))),n={};s.forEach((([t,e])=>n[t]=e));const i=parseInt(n.index);if(i&&o.entries.length>=i&&o.entries[i].id===n.v)return t.log("index matches requested video"),i;const l=o.entries.findIndex((t=>t.id===n.v));return l>=0?l:(t.log("requested video not found in playlist"),null)}function u(t,e){if(t&&e.path){const o=e.path;if(o.startsWith("http://")||o.startsWith("https://"))return o;const[,r,s,n]=t.match(/(https?:\/\/)([^\/]+\/)(.*)\/?/),i=n.split("/").concat(o.split("/")),l=[];for(const t of i)".."===t?l.pop():"."!==t&&l.push(t);return`${r}${s}${l.join("/")}`}return e.url||""}function d(e,o,r,s){if(!e||0===e.length)return t.log("No fragments to join into EDL"),null;const n=[];if("http_dash_segments"===o&&!e[0].duration&&!r){n.push(`!mp4_dash,init=${i(u(s,e[0]))}`);for(let o=1;o<e.length;o++)if(!e[o].duration)return t.error("EDL doesn't support fragments without duration with MP4 DASH"),null}for(const t of e){if(!l(u(s,t)))return null;n.push(i(u(s,t))+t.duration?`,length=${t.duration}`:"")}return`edl://${n.join(";")};`}const{console:c,preferences:f}=iina,p={get exclude(){return f.get("excluded_urls")},get ytdl_path(){return f.get("ytdl_path")},get try_ytdl_first(){return f.get("try_ytdl_first")},get use_manifests(){return f.get("use_manifests")},get rawOptions(){return f.get("raw_options")},get format(){switch(f.get("video_quality")){case"use_max":const t=f.get("max_video_height");return`bestvideo[height<=${t}]+bestaudio/best[height<=${t}]`;case"custom":return f.get("custom_ytdl_format");default:return"bestvideo+bestaudio/best"}}};let m;function g(t){if(""===p.exclude)return!1;m||(m=p.exclude.split("|").map((t=>new RegExp(t))));const e=t.match(/^https?:\/\/(.+?)$/);if(!e)return!1;const o=e[1]||"";return!!m.some((t=>o.match(t)))&&(c.log("URL matches excluded substring. Skipping."),!0)}const{core:h,console:_,global:y,mpv:b,menu:v}=iina;let $,x,w=[],q=!1;function I(t){const e=t.match(/((\d+):)?(\d\d?):(\d\d)/);if(!e)return null;const[,,o,r,s]=e;return 3600*(o?parseInt(o):0)+60*parseInt(r)+parseInt(s)}function S(t){const e=t.requested_formats?t.requested_formats[1]:{};if(!e.manifest_url&&!t.manifest_url)return!1;const o=e.protocol||t.protocol||"";return"http_dash_segments"===o?(b.getNative("demuxer-lavf-list")||[]).indexOf("dash")>=0:o.startsWith("m3u8")}function E(t,e){let o="",i=0;if(p.use_manifests&&S(e)){const r=t?t[0].manifest_url:e.manifest_url;if(!r)return void _.error("No manifest URL found in JSON data.");if(!l(r))return;o=r,t?i=Math.max.apply(null,t.map((t=>t.tbr))):e.tbr&&(i=Math.max(i,e.tbr))}else if(t)for(const r of t){const t=d(r.fragments,r.protocol,e.is_live,r.fragment_base_url);if(!t&&!l(r.url))return;r.vcodec&&"none"!==r.vcodec?o=t||r.url:"none"==r.vcodec&&b.command("audio-add",[t||r.url,"auto",r.format_note||""])}else{if(!e.url)return void _.error("No URL found in JSON data.");{const t=d(e.fragments,e.protocol,e.is_live,e.fragment_base_url);if(!t&&!l(e.url))return;o=t||e.url,n(e.http_headers)}}if(_.log(`streamurl: ${o}`),b.set("stream-open-filename",o.replace(/^data/,"data://")),b.set("file-local-options/force-media-title",e.title),i>0&&!r("hls-bitrate")&&!s("hls-bitrate")&&b.set("file-local-options/hls-bitrate",1e3*i),e.requested_subtitles&&Object.keys(e.requested_subtitles).forEach((t=>{const o=e.requested_subtitles[t];_.log(`adding subtitle [${t}]`);const r=o.data?`memory://${o.data}`:o.url&&l(o.url)?o.url:null;r?b.command("sub-add",[r,"auto",o.ext,t]):_.log(`No subtitle data/url for ${t}`)})),e.chapters){_.log("Adding pre-parsed chapters");for(let t=0;t<e.chapters.length;t++){const o=e.chapters[t],r=o.title||`Chapter ${t}`;w.push({time:o.start_time,title:r})}}else e.description&&e.duration&&(w=function(t,e){const o=t.split(/\r|\n/),r=[];for(const t of o){if(!t)return;const o=I(t);o&&o<e&&r.push({time:o,title:t})}return r.sort(((t,e)=>t.time-e.time)),r}(e.description,e.duration));!e.start_time||r("start")||s("start")||(_.log(`Setting start to: ${e.start_time} secs`),b.set("file-local-options/start",e.start_time)),e.stretched_ratio&&!r("video-aspect")&&b.set("file-local-options/video-aspect",e.stretched_ratio);let a=b.getNative("file-local-options/stream-lavf-o")||{};"rtmp"==e.protocol&&(a={rtmp_tcurl:o,rtmp_pageurl:e.page_url,rtmp_playpath:e.play_path,rtmp_swfverify:e.player_url,rtmp_swfurl:e.player_url,rtmp_app:e.app,...a}),e.proxy&&Object.assign(a,{http_proxy:e.proxy}),b.set("file-local-options/stream-lavf-o",a)}function O(t){return t.dynamic_range?`${t.format} ${t.dynamic_range}`:t.format}function k(t){let e=t.requested_formats;if(t.formats){if(q){const o=t.formats.find((t=>t.format_id===x)),r=t.formats.find((t=>t.format_id===$));o&&r&&(e=[o,r],q=!1)}else $=t.requested_formats.find((t=>"none"!==t.vcodec)).format_id,x=t.requested_formats.find((t=>"none"===t.vcodec)).format_id;_.log("reconstruct menu"),v.removeAllItems(),v.addItem(v.separator()),v.addItem(v.item("Download this video",(()=>{h.osd("Preparing for download"),y.postMessage("downloadVideo",A)}),{keyBinding:"Meta+d"}));const o=v.item("Video Quality"),r=v.item("Audio Quality");for(const e of t.formats)"none"===e.vcodec?r.addSubMenuItem(v.item(O(e),(()=>{x=e.format_id,q=!0,b.command("loadfile",[b.getString("path")])}),{selected:e.format_id===x})):o.addSubMenuItem(v.item(O(e),(()=>{$=e.format_id,q=!0,b.command("loadfile",[b.getString("path")])}),{selected:e.format_id===$}));v.addItem(o),v.addItem(r),v.forceUpdate()}E(e,t)}const{core:F,console:M,http:N,utils:W}=iina;function L(){let t="youtube-dl";const e=[p.ytdl_path,"@data/yt-dlp","yt-dlp","youtube-dl"];for(const o of e)if(W.fileInPath(o)){M.log(`Found youtube-dl; using ${o}`),t=o;break}return t}const{core:U,console:j,event:P,mpv:D,menu:R,utils:V}=iina;let A;async function H(t){q?U.osd("Switching quality…"):U.osd("Fetching online media information…");let e=p.format,o=!0;const s={proxy:null,usePlaylist:!1};t.startsWith("ytdl://")&&(t=t.substring(7)),A=t;const u=["--no-warnings","--dump-single-json","--flat-playlist","--sub-format","ass/srt/best"];"no"===D.getString("options/vid")&&(e="bestaudio/best",j.log("Video is disabled. Only use audio")),u.push("--format",e);const c=p.rawOptions;c.split(" ").forEach(((t,e)=>{if(t.startsWith("--")){const r=t.substring(2),n=c[e+1];"sub-lang"===r&&n?o=!0:"proxy"===r&&n?s.proxy=n:"yes-playlist"===r&&(s.usePlaylist=!0)}t&&u.push(t)})),o&&u.push("--all-subs"),s.usePlaylist||u.push("--no-playlist"),u.push("--",t);try{j.log("Running youtube-dl...");const e=L(),o=await V.exec(e,u);if(0!==o.status)return U.osd("Failed to run youtube-dl"),void j.error(`Error running youtube-dl: ${o.stderr}`);j.log("Finished running youtube-dl");try{let e=JSON.parse(o.stdout);j.log("Youtube-dl succeeded."),function(t,e,o){if(U.osd("Opening media…"),e.proxy=e.proxy||o.proxy,e.direct)return void j.log("Got direct URL");if("playlist"===e._type||"multi_video"===e._type){if(0===e.entries.length)return void j.warn("Got empty playlist, nothing to play");const s="url_transparent"!==e.entries[0]._type&&e.entries[0].webpage_url&&e.entries[0].webpage_url===e.webpage_url;if(s)if(e.entries.length>1&&"m3u8_native"===e.entries[0].protocol&&e.entries[0].url){j.log("Multi-arc video detected, building EDL");const t=d(e.entries);if(j.log(`EDL: ${t}`),!t)return;n(e.entries[0].http_headers),D.set("stream-open-filename",t),e.title&&D.set("file-local-options/force-media-title",e.title);const o=e.entries.find((t=>t.requested_subtitles));if(o&&o.duration){const t=o.requested_subtitles;Object.keys(t).forEach((o=>{let r="edl://";for(const t of e.entries)t.requested_subtitles&&t.requested_subtitles[o]&&l(t.requested_subtitles[o].url)?r+=i(t.requested_subtitles[o].url):r+=i("memory://WEBVTT"),r=`${r},length=${t.duration};`;j.log(`${o} sub EDL: ${r}`),D.command("sub-add",[r,"auto",t[o].ext,o])}))}}else 1===e.entries.length&&(j.log("Playlist with single entry detected"),k(e.entries[0]));else{const n=a(t,e),i=["#EXTM3U"];for(const t of e.entries){let e=t.url;const o=t.title;if(o&&i.push(`#EXTINF:0,${o.replace(/\s+/," ")}`),t.webpage_url&&!s&&(e=t.webpage_url),e.indexOf("://")<0){const t=e.indexOf(":")>=0?"ytdl://":"https://youtu.be/";i.push(`${t}${e}`)}else l(e)&&i.push(e)}o.usePlaylist&&r("playlist-start")&&n&&D.set("playlist-start",n),D.set("stream-open-filename",`memory://${i.join("\n")}`)}}else k(e)}(t,e,s)}catch{U.osd("Failed to fetch online media information"),j.error("Failed to parse youtube-dl's output")}}catch(t){U.osd("Unknown error."),j.error(`Unexpected error: ${t}`)}}const{core:T,console:J,global:X,mpv:B}=iina;p.try_ytdl_first||B.addHook("on_load",10,(async t=>{J.log("ytdl:// hook");const e=B.getString("stream-open-filename");e.startsWith("ytdl://")&&await H(e),t()})),B.addHook(p.try_ytdl_first?"on_load":"on_load_fail",10,(async t=>{J.log("ytdl full hook");const e=B.getString("stream-open-filename");(e.startsWith("ytdl://")||e.startsWith("http://")||e.startsWith("https://"))&&(g(e)||await H(e)),t()})),B.addHook("on_preloaded",10,(()=>{J.log("ytdl preload hook"),w.length>0&&(B.set("chapter-list",w),w.length=0)})),X.onMessage("downloading",(()=>{T.osd("Video downloading")})),X.onMessage("downloaded",(()=>{T.osd("Video downloaded")}))})();
//# sourceMappingURL=index.js.map