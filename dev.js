import { path } from "./deps.js";
import { build } from "./build.js";
import { serve } from "./serve.js";

export async function dev(options) {
    const defaults = {
        sourcePath: path.join(Deno.cwd(), 'src'),
        buildPath: path.join(Deno.cwd(), 'docs'),
        componentsPath: path.join(Deno.cwd(), 'src', 'components'),
        layoutsPath: path.join(Deno.cwd(), 'src', '_layouts'),
        forceRebuild: false,
        buildWatch: true,
        firstBuildDoneCallback: () => serve(path.join(Deno.cwd(), 'docs'))
    };

    options = { ...defaults, ...options };

    build(options);
}
