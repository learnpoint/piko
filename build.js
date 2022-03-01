import { path, marked } from "./deps.js";
import { exists } from "./utils/exists.js";
import { parse as frontmatterParse } from "./utils/frontmatter.js";

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
        layoutsPath:  path.join(Deno.cwd(), 'src', '_layouts'),
        forceRebuild: false,
        buildWatch: false,
        firstBuildDoneCallback: () => { },
        watchBuildDoneCallback: () => { }
    };

    state = { ...defaults, ...options };
    state.siteDb = [];
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

    state.siteDb = [];
    await recursiveBuildSiteDb(state.buildPath);
    let stringifiedSiteDb = JSON.stringify(state.siteDb, null, 4)
    if (Deno.build.os === 'windows') {
        stringifiedSiteDb = stringifiedSiteDb.replaceAll("\n", "\r\n");
    }
    await Deno.writeTextFile(path.join(state.buildPath, 'site_db.json'), stringifiedSiteDb);

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

        if (sPath === state.layoutsPath) {
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

        if (dirEntry.name === 'site_db.json') {
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

const isHtmlFile = sourceFilePath => path.extname(sourceFilePath) === '.html';
const isMarkdownFile = sourceFilePath => path.extname(sourceFilePath) === '.md';
const isHtmlOrMarkdownFile = sourceFilePath => isHtmlFile(sourceFilePath) || isMarkdownFile(sourceFilePath);
const lineNumber = (pos, str) => str.substring(0, pos).split('\n').length;

async function buildFile(sourceFilePath, buildFilePath) {
    try {
        if (isHtmlOrMarkdownFile(sourceFilePath)) {

            const sourceContent = await Deno.readTextFile(sourceFilePath);
            const sourceItem = frontmatterParse(sourceContent);

            if (isMarkdownFile(sourceFilePath)) {
                sourceItem.content = marked.parse(sourceItem.content);
            }

            await applyLayout(sourceItem);

            // TODO: How to pass original content to renderHtmlFile? Right now, error messages don't know the correct line number in source file.
            await Deno.writeTextFile(buildFilePath, renderHtmlFile(sourceItem.content, sourceFilePath, sourceItem.content));

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

async function applyLayout(sourceItem) {
    if (!sourceItem.data.layout) {
        return;
    }

    const layoutPath = path.join(state.layoutsPath, sourceItem.data.layout);

    const layoutContent = await Deno.readTextFile(layoutPath);
    
    // Render content first, then the whole layout.
    sourceItem.content = renderTemplate(sourceItem.content, sourceItem.data);
    sourceItem.content = renderTemplate(layoutContent, { ...sourceItem.data, content: sourceItem.content });
}

function renderTemplate(text, data) {
    return text.replace(/{{.*?}}/g, match => {
        const variableExpression = match.replace('{{', '').replace('}}', '').trim();
        const [variableName, defaultValue = ''] = variableExpression.split('||').map(x => x.trim());
        if (data[variableName]) {
            return data[variableName];
        } else {
            return defaultValue;
        }
    });
}

function renderHtmlFile(data, sourceFilePath, originalSourceContent) {
    const originalSourceContentString = originalSourceContent.toString();
    const dataString = data.toString();

    return dataString.replace(/<!--.*?-->/g, (match, matchPos) => {
        if (match === '<!-- site_db:off -->' || match === '<!-- site_db:on -->') {
            return match;
        }

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

async function recursiveBuildSiteDb(buildPath) {
    for await (const dirEntry of Deno.readDir(buildPath)) {
        const pagePath = path.join(buildPath, dirEntry.name);

        if (dirEntry.isDirectory) {
            await recursiveBuildSiteDb(pagePath);
            continue;
        }

        if (!isHtmlFile(pagePath)) {
            continue;
        }

        if (dirEntry.name === '404.html') {
            continue;
        }

        const siteDbRecord = await createSiteDbRecord(pagePath);

        state.siteDb.push(siteDbRecord);
    }
}

async function createSiteDbRecord(pagePath) {
    const pageMarkup = await Deno.readTextFile(pagePath);
    return {
        title: titleTagContent(pageMarkup),
        description: descriptionMetaContent(pageMarkup),
        url: '/' + path.relative(state.buildPath, pagePath).replaceAll('\\', '/'),
        content: collapseSpaces(stripTags(stripEscapedFragments(mainTagContent(pageMarkup))))
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

function stripEscapedFragments(str) {
    return str.replace(/<!-- site_db:off -->([\s\S]*?)<!-- site_db:on -->/g, '');
}

function stripTags(str) {
    return str.replace(/<\/?[^>]+>/g, "");
}
