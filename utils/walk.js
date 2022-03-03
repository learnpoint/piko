import { path } from "../deps.js";

export async function walk(folder) {

    const filePaths = [];

    await recursiveWalk(folder, filePaths);

    return filePaths;
}

async function recursiveWalk(folder, filePaths = []) {
    for await (const item of Deno.readDir(folder)) {
        const itemPath = path.join(folder, item.name);

        if (item.isDirectory) {
            await recursiveWalk(itemPath, filePaths);
            continue;
        }

        if (item.isSymlink) {
            continue;
        }

        filePaths.push(itemPath);
    }
}