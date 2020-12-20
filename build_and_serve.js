import { build } from "./build.js";
import { serve } from "./serve.js";

export async function buildAndServe(sourcePath, targetPath, componentsPath) {
    buildAndWatch(sourcePath, targetPath, componentsPath);

    // Give first build time to finish
    setTimeout(() => serve(targetPath), 600);
}

async function buildAndWatch(sourcePath, targetPath, componentsPath) {
    build(sourcePath, targetPath, componentsPath);

    const watcher = Deno.watchFs(sourcePath);

    let lastBuild = 0;

    for await (const event of watcher) {
        if ((Date.now() - lastBuild) < 200) {
            continue;
        }

        lastBuild = Date.now();
        build(sourcePath, targetPath, componentsPath);

        console.log();
        console.log("Rebuilding...");
        console.log();
    }
}
