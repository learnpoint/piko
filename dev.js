import { path } from "./deps.js";
import { build } from "./build.js";
import { serve } from "./serve.js";

export async function dev(options) {
    const defaults = {
        buildWatch: true,
        firstBuildDoneCallback: () => serve(path.join(Deno.cwd(), 'docs'))
    };

    options = { ...defaults, ...options };

    build(options);
}
