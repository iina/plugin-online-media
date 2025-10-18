import { opt } from "./options";

const { core, console, utils } = iina;

export async function updateBinary() {
  return await utils.exec("iina-ytdl", ["-U"]);
}

export function findBinary(): string | null {
  const searchList = [opt.ytdl_path, "iina-ytdl"];
  for (const item of searchList) {
    if (utils.fileInPath(item)) {
      console.log(`Found binary at ${item}`);
      return item;
    }
  }
  return null;
}
