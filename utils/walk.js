import { path } from "../deps.js";

export async function walk(folder, files = []) {

    for await (const item of Deno.readDir(folder)) {
        const itemPath = path.join(folder, item.name);

        if (item.isDirectory) {
            await walk(itemPath, files);
            continue;
        }

        if (item.isSymlink) {
            continue;
        }

        files.push(itemPath);
    }

    return files;
}
