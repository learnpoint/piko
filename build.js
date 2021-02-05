import { path, bold, yellow, red, marked } from "./deps.js";
import { exists } from "./exists.js";

const markdown = marked.default;
markdown.setOptions({
    headerIds: false
});

const buildArgs = {};

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

    options = { ...defaults, ...options };

    await ensureDirectories(options);

    buildArgs.componentsPath = options.componentsPath;
    buildArgs.forceRebuild = options.forceRebuild;
    buildArgs.componentsLastModifiedTime = await getComponentsLastModifiedTime();
    buildArgs.pages = [];

    await recursiveBuild(options.sourcePath, options.buildPath);
    await recursiveDelete(options.sourcePath, options.buildPath);
    await recursiveBuildPagesData(options.buildPath, options.buildPath, buildArgs.pages);
    await Deno.writeTextFile(path.join(options.buildPath, 'pages.json'), JSON.stringify(buildArgs.pages, null, 4));

    options.firstBuildDoneCallback();

    if (options.buildWatch) {
        const watcher = Deno.watchFs(options.sourcePath);

        let lastBuild = Date.now();

        for await (const event of watcher) {
            if ((Date.now() - lastBuild) < 200) {
                continue;
            }

            lastBuild = Date.now();
            buildArgs.componentsLastModifiedTime = await getComponentsLastModifiedTime();
            buildArgs.pages = [];

            console.log();
            console.log("Rebuilding...");
            console.log();

            await recursiveBuild(options.sourcePath, options.buildPath);
            await recursiveDelete(options.sourcePath, options.buildPath);
            buildArgs.pages = [];
            await recursiveBuildPagesData(options.buildPath, options.buildPath, buildArgs.pages);
            await Deno.writeTextFile(path.join(options.buildPath, 'pages.json'), JSON.stringify(buildArgs.pages, null, 4));

            options.watchBuildDoneCallback();
        }
    }
}

async function ensureDirectories(options) {
    if (!await exists(options.sourcePath)) {
        console.log();
        console.error('Source folder not found:', options.sourcePath);
        console.log();
        console.log('Create the folder and try again.');
        console.log();
        Deno.exit(1);
    }

    if (!await exists(options.componentsPath)) {
        console.log();
        console.error('Components folder not found:', options.componentsPath);
        console.log();
        console.log('Create the folder and try again.');
        console.log();
        Deno.exit(1);
    }

    // Do not test build path. Will be created if not exists.
}

async function recursiveBuild(sourcePath, buildPath) {
    await Deno.mkdir(buildPath, { recursive: true });

    for await (const dirEntry of Deno.readDir(sourcePath)) {
        const sPath = path.join(sourcePath, dirEntry.name);
        let bPath = path.join(buildPath, dirEntry.name);

        if (sPath === buildArgs.componentsPath) {
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
                console.log(red(bold('Deleted')), red(bold(path.relative(Deno.cwd(), bPath))));
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
        console.log(red(bold('Deleted')), red(bold(path.relative(Deno.cwd(), bPath))));
    }
}

async function getComponentsLastModifiedTime() {
    let componentsLastModifiedTime = new Date(0);

    for await (const item of Deno.readDir(buildArgs.componentsPath)) {
        const itemPath = path.join(buildArgs.componentsPath, item.name);
        const itemInfo = await Deno.lstat(itemPath);

        if (itemInfo.mtime > componentsLastModifiedTime) {
            componentsLastModifiedTime = itemInfo.mtime;
        }
    }
    return componentsLastModifiedTime;
}

async function isBuildNeeded(sourceFilePath, buildFilePath) {
    if (buildArgs.forceRebuild) {
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

        if (isHtmlFile(buildFilePath) && buildArgs.componentsLastModifiedTime > buildFileInfo.mtime) {
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
            const markedupContent = markdown(sourceContent);
            await Deno.writeTextFile(buildFilePath, renderHtmlFile(markedupContent, sourceFilePath, sourceContent));
        } else {
            await Deno.copyFile(sourceFilePath, buildFilePath);
        }
    } catch (err) {
        console.log('Could not build file', path.relative(Deno.cwd(), sourceFilePath));
    }
}

const isHtmlFile = sourceFilePath => path.extname(sourceFilePath) === '.html';
const isMarkdownFile = sourceFilePath => path.extname(sourceFilePath) === '.md';

const renderHtmlFile = (data, sourceFilePath, originalSourceContent) => {
    const originalSourceContentString = originalSourceContent.toString();
    const dataString = data.toString();

    return dataString.replace(/<!--.*?-->/g, (match, matchPos) => {
        const [error, renderedContent] = renderComponent(match.replace('<!--', '').replace('-->', ''));

        if (error) {
            console.log();
            console.log(bold(yellow('Error in:')), bold(yellow(path.relative(Deno.cwd(), sourceFilePath))), 'line', lineNumber(matchPos, originalSourceContentString));
            console.log(bold('=== >'), bold(error));
            console.log();
            return match; // Leave unchanged
        }

        return renderedContent;
    });
};

const lineNumber = (pos, str) => str.substring(0, pos).split('\n').length;

const renderComponent = componentString => {
    let error = null;

    const componentName = componentString.split(',')[0].trim();

    let componentContent = '';
    try {
        componentContent = Deno.readTextFileSync(path.join(buildArgs.componentsPath, componentName));
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
};

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

async function recursiveBuildPagesData(buildPath, rootBuildPath, pagesArray) {
    for await (const dirEntry of Deno.readDir(buildPath)) {
        const pagePath = path.join(buildPath, dirEntry.name);

        if (dirEntry.isDirectory) {
            await recursiveBuildPagesData(pagePath, rootBuildPath, pagesArray);
            continue;
        }

        if (!isHtmlFile(pagePath)) {
            continue;
        }

        if (dirEntry.name === '404.html') {
            continue;
        }

        const pageObject = await createPageObject(pagePath, rootBuildPath);

        pagesArray.push(pageObject);
    }
}

async function createPageObject(pagePath, buildPath) {
    const pageMarkup = await Deno.readTextFile(pagePath);
    return {
        title: titleTagContent(pageMarkup),
        url: '/' + path.relative(buildPath, pagePath).replaceAll('\\', '/'),
        content: collapseSpaces(stripTags(bodyTagContent(pageMarkup)))
    };
}

function titleTagContent(str) {
    let titleContent = '';
    const m = str.match("<title>(.*?)</title>");
    if (m) titleContent = m[1];
    return titleContent;
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
