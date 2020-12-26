import { path } from "./deps.js";
import { build } from "./build.js";
import { serve } from "./serve.js";

export async function dev(options) {
    const defaults = {
        sourcePath: path.join(Deno.cwd(), 'src'),
        buildPath: path.join(Deno.cwd(), 'docs'),
        snippetsPath: path.join(Deno.cwd(), 'src', 'snippets'),
        forceRebuild: false,
        buildWatch: true
    };

    options = { ...defaults, ...options };

    setTimeout(() => build(options), 0);
    setTimeout(() => serve(options.buildPath), 600);
}
