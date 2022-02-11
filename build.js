import { path, marked } from "./deps.js";
import { exists } from "./utils/exists.js";

marked.setOptions({
    headerIds: false
});

const WATCH_BUILD_DEBOUNCE = 200;

let state = {};

export async function build(options) {
    const defaults = {
        sourcePath: path.join(Deno.cwd(), 'src'),
        buildPath: path.join(Deno.cwd(), 'docs'),
        componentsPath: path.join(Deno.cwd(), 'src', 'components'),
        forceRebuild: false,
        buildWatch: false,
        firstBuildDoneCallback: () => { },
        watchBuildDoneCallback: () => { }
    };

    state = { ...defaults, ...options };
    state.pages = [];
    state.lastBuild = 0;

    await ensureDirectories();

    await runBuild(state.firstBuildDoneCallback);

    if (state.buildWatch) {
        for await (const event of Deno.watchFs(state.sourcePath)) {
            if ((Date.now() - state.lastBuild) < WATCH_BUILD_DEBOUNCE) {
                continue;
            }
            runBuild(state.watchBuildDoneCallback);
        }
    }
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

    if (!await exists(state.componentsPath)) {
        console.log();
        console.error('Components folder not found:', state.componentsPath);
        console.log();
        console.log('Create the folder and try again.');
        console.log();
        Deno.exit(1);
    }

    // Don't ensure build path. It will be created if not exists.
}

async function runBuild(doneCallback) {
    state.lastBuild = Date.now();
    state.componentsLastModifiedTime = await getComponentsLastModifiedTime();

    console.log();
    console.log('Building...');
    console.log();

    await recursiveBuild(state.sourcePath, state.buildPath);
    await recursiveDelete(state.sourcePath, state.buildPath);

    state.pages = [];
    await recursiveBuildPagesData(state.buildPath);
    let stringifiedPagesData = JSON.stringify(state.pages, null, 4)
    if (Deno.build.os === 'windows') {
        stringifiedPagesData = stringifiedPagesData.replaceAll("\n", "\r\n");
    }
    await Deno.writeTextFile(path.join(state.buildPath, 'pages.json'), stringifiedPagesData);

    doneCallback();
}

async function getComponentsLastModifiedTime() {
    let componentsLastModifiedTime = new Date(0);

    for await (const item of Deno.readDir(state.componentsPath)) {
        const itemPath = path.join(state.componentsPath, item.name);
        const itemInfo = await Deno.lstat(itemPath);

        if (itemInfo.mtime > componentsLastModifiedTime) {
            componentsLastModifiedTime = itemInfo.mtime;
        }
    }
    return componentsLastModifiedTime;
}

async function recursiveBuild(sourcePath, buildPath) {
    await Deno.mkdir(buildPath, { recursive: true });

    for await (const dirEntry of Deno.readDir(sourcePath)) {
        const sPath = path.join(sourcePath, dirEntry.name);
        let bPath = path.join(buildPath, dirEntry.name);

        if (sPath === state.componentsPath) {
            continue;
        }

        if (dirEntry.isDirectory) {
            await recursiveBuild(sPath, bPath);
            continue;
        }

        if (isMarkdownFile(bPath)) {
            // Change build file extension from .md to .html
            bPath = bPath.slice(0, -2) + 'html';
        }

        const [buildNeeded, buildReason] = await isBuildNeeded(sPath, bPath)
        if (buildNeeded) {
            console.log('Building', path.relative(Deno.cwd(), bPath), '--', buildReason);
            await buildFile(sPath, bPath);
        }
    }
}

async function recursiveDelete(sourcePath, buildPath) {

    // Delete all files and folders in buildPath
    // that don't exist in sourcePath.

    for await (const dirEntry of Deno.readDir(buildPath)) {
        const bPath = path.join(buildPath, dirEntry.name);
        let sPath = path.join(sourcePath, dirEntry.name);

        if (dirEntry.isDirectory) {
            if (await exists(sPath)) {
                await recursiveDelete(sPath, bPath);
                continue;
            } else {
                await Deno.remove(bPath, { recursive: true });
                console.log(`%cDeleted ${path.relative(Deno.cwd(), bPath)}`, 'font-weight:bold;color:#f44;');
                continue;
            }
        }

        if (await exists(sPath)) {
            continue;
        }

        if (dirEntry.name.toLowerCase() === 'cname') {
            await Deno.copyFile(bPath, sPath);
            console.log('Copied', path.relative(Deno.cwd(), bPath), 'to', path.relative(Deno.cwd(), sPath));
            continue;
        }

        if (dirEntry.name === 'pages.json') {
            continue;
        }

        if (isHtmlFile(sPath)) {
            const sMarkdownPath = sPath.slice(0, -4) + 'md';
            if (await exists(sMarkdownPath)) {
                continue;
            }
        }

        await Deno.remove(bPath);
        console.log(`%cDeleted ${path.relative(Deno.cwd(), bPath)}`, 'font-weight:bold;color:#f44;');

    }
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

        if (isHtmlFile(buildFilePath) && state.componentsLastModifiedTime > buildFileInfo.mtime) {
            return [true, 'Component(s) was modified'];
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

async function buildFile(sourceFilePath, buildFilePath) {
    try {
        if (isHtmlFile(sourceFilePath)) {
            const sourceContent = await Deno.readTextFile(sourceFilePath);
            await Deno.writeTextFile(buildFilePath, renderHtmlFile(sourceContent, sourceFilePath, sourceContent));
        } else if (isMarkdownFile(sourceFilePath)) {
            const sourceContent = await Deno.readTextFile(sourceFilePath);
            const markedupContent = marked.parse(sourceContent);
            await Deno.writeTextFile(buildFilePath, renderHtmlFile(markedupContent, sourceFilePath, sourceContent));
        } else {
            await Deno.copyFile(sourceFilePath, buildFilePath);
        }
    } catch (err) {
        console.log(`%cCould not build file ${path.relative(Deno.cwd(), sourceFilePath)}`, 'font-weight:bold;color:#f44;');
    }
}

const isHtmlFile = sourceFilePath => path.extname(sourceFilePath) === '.html';
const isMarkdownFile = sourceFilePath => path.extname(sourceFilePath) === '.md';
const lineNumber = (pos, str) => str.substring(0, pos).split('\n').length;

function renderHtmlFile(data, sourceFilePath, originalSourceContent) {
    const originalSourceContentString = originalSourceContent.toString();
    const dataString = data.toString();

    return dataString.replace(/<!--.*?-->/g, (match, matchPos) => {
        const [error, renderedContent] = renderComponent(match.replace('<!--', '').replace('-->', ''));

        if (error) {
            console.log();
            console.log(`%cError in: ${path.relative(Deno.cwd(), sourceFilePath)} line ${lineNumber(matchPos, originalSourceContentString)}`, 'font-weight:bold;color:#f44;');
            console.log(`%c===> ${error}`, 'font-weight:bold;');
            console.log();
            return match; // Leave unchanged
        }

        return renderedContent;
    });
}

function renderComponent(componentString) {
    let error = null;

    const componentName = componentString.split(',')[0].trim();
    const componentPath = path.join(state.componentsPath, componentName);

    let componentContent = '';
    try {
        componentContent = Deno.readTextFileSync(componentPath);
        componentContent = renderHtmlFile(componentContent, componentPath, componentContent)
    } catch {
        error = 'Component file not found: "' + componentName + '"';
    }

    let componentData = {};

    if (!error && componentString.includes(',')) {
        const componentDataString = componentString.substring(componentString.indexOf(',') + 1).trim();
        try {
            componentData = eval(`(${componentDataString})`);

            if (componentData === null || typeof componentData !== 'object') {
                error = 'Component props is not a valid javascript object: ' + componentDataString;
                componentData = {};
            }
        } catch (err) {
            error = 'Component props is not a valid javascript object: ' + componentDataString;
            componentData = {};
        }
    }

    return [error, componentContent.replace(/{{.*?}}/g, match => renderComponentData(match.replace('{{', '').replace('}}', ''), componentData))];
}

const renderComponentData = (componentDataString, componentData) => {
    let dataKey = componentDataString.split('||')[0].trim();

    if (componentData[dataKey]) {
        return componentData[dataKey];
    }

    if (componentDataString.includes('||')) {
        return componentDataString.substring(componentDataString.indexOf('||') + 2).trim();
    }

    return '';
};

async function recursiveBuildPagesData(buildPath) {
    for await (const dirEntry of Deno.readDir(buildPath)) {
        const pagePath = path.join(buildPath, dirEntry.name);

        if (dirEntry.isDirectory) {
            await recursiveBuildPagesData(pagePath);
            continue;
        }

        if (!isHtmlFile(pagePath)) {
            continue;
        }

        if (dirEntry.name === '404.html') {
            continue;
        }

        const pageObject = await createPageObject(pagePath);

        state.pages.push(pageObject);
    }
}

async function createPageObject(pagePath) {
    const pageMarkup = await Deno.readTextFile(pagePath);
    return {
        title: titleTagContent(pageMarkup),
        description: descriptionMetaContent(pageMarkup),
        url: '/' + path.relative(state.buildPath, pagePath).replaceAll('\\', '/'),
        content: collapseSpaces(stripTags(bodyTagContent(pageMarkup)))
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

function bodyTagContent(str) {
    let bodyContent = '';
    const m = str.match(/<body[^>]*>([^<]*(?:(?!<\/?body)<[^<]*)*)<\/body\s*>/i);
    if (m) bodyContent = m[1];
    return bodyContent;
}

function collapseSpaces(str) {
    return str.replace(/\s+/g, " ").trim();
}

function stripTags(str) {
    return str.replace(/<\/?[^>]+>/g, "");
}
