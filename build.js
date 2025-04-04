import { path, marked } from "./deps.js";
import { exists } from "./utils/exists.js";
import { walk } from "./utils/walk.js";
import { parse as frontmatterParse } from "./utils/frontmatter.js";

const WATCH_BUILD_DEBOUNCE = 100;

let state;

export async function build(options) {
    state = initState(options);

    await ensureDirectories();

    // Force Rebuild on the first build
    const specifiedForceRebuild = state.forceRebuild;
    const firstBuildForceRebuild = true;
    state.forceRebuild = firstBuildForceRebuild;

    await runBuild();

    // Revert to specified value on subsequent rebuilds
    state.forceRebuild = specifiedForceRebuild;

    if (state.getWatchBuildCallbackFromInitialBuildCallback) {
        state.watchBuildCallback = await state.initialBuildCallback();
    } else {
        state.initialBuildCallback();
    }

    if (state.buildWatch) {
        let watchBuildTimeout = null;
        for await (const event of Deno.watchFs(state.sourcePath)) {
            if (watchBuildTimeout) {
                clearTimeout(watchBuildTimeout);
            }
            watchBuildTimeout = setTimeout(async () => {
                await runBuild();
                await state.watchBuildCallback();
                watchBuildTimeout = null;
            }, WATCH_BUILD_DEBOUNCE);
        }
    }
}



/*  =====================================================================
    Init
    ===================================================================== */

function initState(options) {
    let state = {};

    const defaults = {
        sourcePath: path.join(Deno.cwd(), 'src'),
        buildPath: path.join(Deno.cwd(), 'docs'),
        includesPath: path.join(Deno.cwd(), 'src', '_includes'),
        layoutsPath: path.join(Deno.cwd(), 'src', '_layouts'),
        siteContentFilePath: path.join(Deno.cwd(), 'docs', 'site_content.json'),
        forceRebuild: false,
        buildWatch: false,
        getWatchBuildCallbackFromInitialBuildCallback: false,
        initialBuildCallback: () => { },
        watchBuildCallback: () => { }
    };

    state = { ...defaults, ...options };
    state.siteContent = [];
    state.lastBuild = 0;

    return state;
}

async function ensureDirectories() {
    if (!await exists(state.sourcePath)) {
        console.log();
        console.error('Source folder not found:', state.sourcePath);
        console.log();
        console.log('Create the folder and try again.');
        console.log();
        Deno.exit(1);
    }

    if (!await exists(state.includesPath)) {
        console.log();
        console.error('Includes folder not found:', state.includesPath);
        console.log();
        console.log('Create the folder and try again.');
        console.log();
        Deno.exit(1);
    }

    if (!await exists(state.layoutsPath)) {
        console.log();
        console.error('Layouts folder not found:', state.layoutsPath);
        console.log();
        console.log('Create the folder and try again.');
        console.log();
        Deno.exit(1);
    }
}



/*  =====================================================================
    Helpers
    ===================================================================== */

const isHtmlFile = sourceFilePath => path.extname(sourceFilePath) === '.html';
const isSvgFile = sourceFilePath => path.extname(sourceFilePath) === '.svg';
const isMarkdownFile = sourceFilePath => path.extname(sourceFilePath) === '.md';
const isHtmlOrSvgOrMarkdownFile = sourceFilePath => isHtmlFile(sourceFilePath) || isSvgFile(sourceFilePath) || isMarkdownFile(sourceFilePath);

async function getIncludesAndLayoutsLastModifiedTime() {
    let includesAndLayoutsLastModifiedTime = new Date(0);

    const includeFiles = await walk(state.includesPath);
    const layoutFiles = await walk(state.layoutsPath);

    for (const infi of includeFiles) {
        const itemInfo = await Deno.lstat(infi);
        if (itemInfo.mtime > includesAndLayoutsLastModifiedTime) {
            includesAndLayoutsLastModifiedTime = itemInfo.mtime;
        }
    }

    for (const lf of layoutFiles) {
        const itemInfo = await Deno.lstat(lf);
        if (itemInfo.mtime > includesAndLayoutsLastModifiedTime) {
            includesAndLayoutsLastModifiedTime = itemInfo.mtime;
        }
    }

    return includesAndLayoutsLastModifiedTime;
}

async function isBuildNeeded(sourceFilePath, buildFilePath) {
    if (state.forceRebuild) {
        return [true, 'Build forced'];
    }

    try {
        const [sourceFileInfo, buildFileInfo] = await Promise.all([
            Deno.stat(sourceFilePath),
            Deno.stat(buildFilePath),
        ]);

        if (sourceFileInfo.mtime > buildFileInfo.mtime) {
            return [true, path.relative(Deno.cwd(), sourceFilePath) + ' was modified'];
        }

        if (isHtmlFile(buildFilePath) && state.includesAndLayoutsLastModifiedTime > buildFileInfo.mtime) {
            return [true, 'Includes or layouts were modified'];
        }
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            return [true, 'New file'];
        } else {
            throw error;
        }
    }

    return [false, ''];
}

async function pairWalk(originPath, pairPath, omit = []) {

    // Recursively walk the origin path and collect
    // all file and folder paths into a flat array.
    // For each one, create a corresponding "pairPath"
    // that has the same path, but starting from a
    // different root folder (the pairPath).

    const pathPairs = [];

    for await (const item of Deno.readDir(originPath)) {
        const oPath = path.join(originPath, item.name);
        let pPath = path.join(pairPath, item.name);

        if (omit.includes(oPath)) {
            continue;
        }

        if (item.isDirectory) {
            pathPairs.push({ originPath: oPath, pairPath: pPath, type: 'folder' });

            const nestedPaths = await pairWalk(oPath, pPath, omit);
            pathPairs.push(...nestedPaths);

        } else {

            pathPairs.push({ originPath: oPath, pairPath: pPath, type: 'file' });
        }
    }

    return pathPairs;
}



/*  =====================================================================
    Build
    ===================================================================== */

async function runBuild() {
    console.log('\nBuilding...\n');

    const buildStart = Date.now();

    state.lastBuild = Date.now();

    state.includesAndLayoutsLastModifiedTime = await getIncludesAndLayoutsLastModifiedTime();
    await recursiveBuild(state.sourcePath, state.buildPath);
    await recursiveDelete(state.sourcePath, state.buildPath);
    await buildSiteContentFile();
    await misc();

    console.log(Date.now() - buildStart, 'ms');
}

async function recursiveBuild(sourcePath, buildPath) {
    if (!await exists(buildPath)) {
        await Deno.mkdir(buildPath, { recursive: true });
    }

    const paths = await pairWalk(sourcePath, buildPath, [state.includesPath, state.layoutsPath]);

    await Promise.all(paths.filter(p => p.type === 'folder').map(async p => {
        if (await exists(p.pairPath)) {
            return;
        }
        await Deno.mkdir(p.pairPath, { recursive: true });
    }));

    await Promise.all(paths.filter(p => p.type === 'file').map(async p => {
        await buildFile(p.originPath, p.pairPath);
    }));
}

async function buildFile(sourceFilePath, buildFilePath) {

    if (isMarkdownFile(sourceFilePath)) {
        buildFilePath = buildFilePath.slice(0, -2) + 'html';
    }

    const [buildNeeded, buildReason] = await isBuildNeeded(sourceFilePath, buildFilePath)

    if (!buildNeeded) {
        return;
    }

    console.log('Building', path.relative(Deno.cwd(), buildFilePath), '--', buildReason);

    try {
        if (isHtmlOrSvgOrMarkdownFile(sourceFilePath)) {

            const sourceContent = await Deno.readTextFile(sourceFilePath);

            const sourceItem = frontmatterParse(sourceContent);

            if (isMarkdownFile(sourceFilePath)) {
                sourceItem.content = marked.parse(sourceItem.content);
            }

            if (sourceItem.data.layout) {
                sourceItem.content = await renderLayout(sourceItem.content, sourceItem.data.layout);
            }

            sourceItem.content = renderIncludesAndVariables(sourceItem.content, sourceItem.data);

            await Deno.writeTextFile(buildFilePath, sourceItem.content);

        } else {
            await Deno.copyFile(sourceFilePath, buildFilePath);
        }
    } catch (err) {
        console.log();
        console.log(err);
        console.log(`%cCould not build file ${path.relative(Deno.cwd(), sourceFilePath)}`, 'font-weight:bold;color:#f44;');
        console.log();
    }
}



/*  =====================================================================
    Build Helpers
    ===================================================================== */

async function renderLayout(text, layout) {

    let layoutText;

    try {
        const layoutPath = path.join(state.layoutsPath, layout);
        layoutText = await Deno.readTextFile(layoutPath);
    } catch (err) {
        console.log();
        console.log(`%cCouldn't find layout ${layout}`, 'font-weight:bold;color:#f44;');
        console.log();
        return text;
    }

    const matcher = /{{ ?content ?}}/;

    if (!matcher.test(layoutText)) {
        console.log();
        console.log(`%cThe layout ${layout} is missing a {{ content }} expression`, 'font-weight:bold;color:#f44;');
        console.log();
        return text;
    }

    return layoutText.replace(matcher, text);
}

function renderIncludesAndVariables(text, data) {
    text = renderVariables(text, data);

    if (!/<!--.*?-->/.test(text)) {
        return text;
    }

    return text.replace(/<!--.*?-->/g, match => {

        if (!match.includes('.html') && !match.includes('.svg')) {
            // Assume it's just a reglar html commment, no need to log an error.
            return match;
        }

        const [includeName, includeProps] = parseIncludeExpression(match);

        let includeText = '';

        try {
            includeText = Deno.readTextFileSync(path.join(state.includesPath, includeName));
        } catch (err) {
            console.log();
            console.log(`%cCouldn't find the include ${includeName}`, 'font-weight:bold;color:#f44;');
            console.log();
            return match;
        }

        return renderIncludesAndVariables(includeText, { ...data, ...includeProps });
    });
}

function renderVariables(text, data) {
    return text.replace(/{{(.*?)}}/g, (match, group) => {

        let [variableName, defaultValue] = group.split('||').map(x => x.trim());

        if (data[variableName]) {
            return data[variableName];
        }

        if (typeof defaultValue === "undefined") {
            return match;
        }

        return defaultValue;
    });
}

function parseIncludeExpression(match) {
    match = match.replace('<!--', '').replace('-->', '').trim();

    const idx = match.indexOf(',');

    if (idx === -1) {
        return [match, {}];
    }

    const [name, propsString] = [match.slice(0, idx).trim(), match.slice(idx + 1).trim()];

    let props = {};

    try {

        props = eval(`(${propsString})`);

        if (props === null || typeof props !== 'object') {
            throw "Not a javascript object.";
        }

    } catch (err) {
        console.log();
        console.log(`%cInclude file ${name} was passed invalid props: ${propsString}`, 'font-weight:bold;color:#f44;');
        console.log('=> Props should be a javascript object, like: { name: "piko" }');
        console.log();
        props = {};
    }

    return [name, props];
}



/*  =====================================================================
    Delete Files
    ===================================================================== */

async function recursiveDelete(sourcePath, buildPath) {
    const paths = await pairWalk(buildPath, sourcePath);

    await Promise.all(paths.filter(p => p.type === 'file').map(async p => {
        await deleteFile(p.pairPath, p.originPath);
    }));

    await Promise.all(paths.filter(p => p.type === 'folder').map(async p => {
        await deleteDir(p.pairPath, p.originPath);
    }));
}

async function deleteDir(sourcePath, buildPath) {
    if (!await exists(buildPath)) {
        return;
    }

    if (await exists(sourcePath)) {
        return;
    }

    await Deno.remove(buildPath, { recursive: true });

    console.log(`%cDeleted ${path.relative(Deno.cwd(), buildPath)}`, 'font-weight:bold;color:#f44;');
}

async function deleteFile(sourcePath, buildPath) {
    if (!await exists(buildPath)) {
        return;
    }

    if (await exists(sourcePath)) {
        return;
    }

    const basename = path.basename(buildPath);

    if (basename.toLowerCase() === 'cname') {
        await Deno.copyFile(buildPath, sourcePath);
        return;
    }

    if (basename === '.nojekyll') {
        return;
    }

    if (buildPath === state.siteContentFilePath) {
        return;
    }

    if (isHtmlFile(sourcePath)) {
        const sMarkdownPath = sourcePath.slice(0, -4) + 'md';
        if (await exists(sMarkdownPath)) {
            return;
        }
    }

    await Deno.remove(buildPath);

    console.log(`%cDeleted ${path.relative(Deno.cwd(), buildPath)}`, 'font-weight:bold;color:#f44;');
}



/*  =====================================================================
    Build Site Content File
    ===================================================================== */

async function buildSiteContentFile() {
    state.siteContent = [];

    await recursiveBuildSiteContent(state.buildPath);

    let siteContentString = JSON.stringify(state.siteContent, null, 4);

    await Deno.writeTextFile(state.siteContentFilePath, siteContentString);
}

async function recursiveBuildSiteContent(buildPath) {
    for await (const item of Deno.readDir(buildPath)) {
        const itemPath = path.join(buildPath, item.name);

        if (item.isDirectory) {
            await recursiveBuildSiteContent(itemPath);
            continue;
        }

        if (!isHtmlFile(itemPath)) {
            continue;
        }

        if (item.name === '404.html') {
            continue;
        }

        const pageItem = await createPageItem(itemPath);

        state.siteContent.push(pageItem);
    }
}

async function createPageItem(pagePath) {
    const pageMarkup = await Deno.readTextFile(pagePath);
    return {
        title: titleTagContent(pageMarkup),
        description: descriptionMetaContent(pageMarkup),
        url: '/' + path.relative(state.buildPath, pagePath).replaceAll('\\', '/'),
        content: collapseSpaces(stripTags(stripAsides(mainTagContent(pageMarkup))))
    };
}

function titleTagContent(str) {
    let titleContent = '';
    const m = str.match("<title>(.*?)</title>");
    if (m) titleContent = m[1];
    return titleContent;
}

function descriptionMetaContent(str) {
    let descriptionContent = '';
    const d = str.match('<meta name="description" content="(.*?)" />');
    if (d) descriptionContent = d[1];
    return descriptionContent;
}

function mainTagContent(str) {
    let mainContent = '';
    const m = str.match(/<main[^>]*>([^<]*(?:(?!<\/?main)<[^<]*)*)<\/main\s*>/i);
    if (m) mainContent = m[1];
    return mainContent;
}

function collapseSpaces(str) {
    return str.replace(/\s+/g, " ").trim();
}

function stripAsides(str) {
    return str.replace(/<aside([\s\S]*?)<\/aside>/g, '');
}

function stripTags(str) {
    return str.replace(/<\/?[^>]+>/g, "");
}



/*  =====================================================================
    Misc
    ===================================================================== */

async function misc() {

    // Ensure .nojekyll file exist in buildPath. This is to instruct
    // github pages to serve underscored prefixed folders.
    const nojekllPath = path.join(state.buildPath, '.nojekyll');
    const nojekllExist = await exists(nojekllPath);
    if (!nojekllExist) {
        await Deno.writeTextFile(nojekllPath, '');
    }
}