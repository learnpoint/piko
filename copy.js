import { path, decode } from "./deps.js";

const EXCLUDE_FILES = ['LICENSE', 'CNAME', 'README.md', 'CODE_OF_CONDUCT.md', 'CONTRIBUTING.md', 'SECURITY.md', '.gitignore', '.gitattributes'];

const state = {
    githubPath: null,
    downloadPath: null,
    downloadFolderName: null,
    deleteDownloadPathOnExitWithError: false
}

export async function copy(githubPath, newFolderName) {
    console.log();

    ensureGithubPathOrExit(githubPath);
    state.githubPath = githubPath;

    if (!newFolderName || newFolderName === '.') {
        state.downloadPath = Deno.cwd();
        state.downloadFolderName = 'current folder';
    } else {
        state.downloadPath = path.join(Deno.cwd(), newFolderName);
        createFolderOrExit(state.downloadPath);
        state.deleteDownloadPathOnExitWithError = true;
        state.downloadFolderName = newFolderName;
    }

    await copyGithubRepoOrExit();

    writeSuccess();
}

function ensureGithubPathOrExit(githubPath) {
    if (!githubPath) {
        exitWithError('Missing github path.');
    }

    const pathParts = githubPath.split('/');

    if (!pathParts.length === 2) {
        exitWithError('Unvalid github path. Must have format {owner}/{repo}.');
    }
}

async function createFolderOrExit(folderPath) {
    try {
        await Deno.mkdir(folderPath);
    } catch (err) {
        if (err instanceof Deno.errors.AlreadyExists) {
            exitWithError([`Folder ${folderPath} already exists.`, 'Delete the folder or choose another name.']);
        } else {
            exitWithError('Unexpected error.', err);
        }
    }
}

function getRepoNameFromGithubPath(githubPath) {
    return githubPath.split('/')[1];
}

async function copyGithubRepoOrExit() {
    try {
        const repoResponse = await fetch(`https://api.github.com/repos/${state.githubPath}`);
        const repoData = await repoResponse.json();
        ensureGithubResponseOrExit(repoResponse, repoData);

        const branchResponse = await fetch(`https://api.github.com/repos/${state.githubPath}/branches/${repoData.default_branch}`);
        const branchData = await branchResponse.json();
        ensureGithubResponseOrExit(branchResponse, branchData);

        const treeUrl = branchData.commit.commit.tree.url + '?recursive=1';
        const treeResponse = await fetch(treeUrl);
        const treeData = await treeResponse.json();
        ensureGithubResponseOrExit(treeResponse, treeData);

        for (const node of treeData.tree) {
            if (EXCLUDE_FILES.includes(node.path)) {
                continue;
            }
            await downloadGithubBlobOrExit(path.join(state.downloadPath, node.path), node);
        }
        console.log();
    } catch (err) {
        exitWithError(`Error when copying ${state.githubPath}`, err);
    }
}

async function downloadGithubBlobOrExit(path, node) {
    try {
        if (node.type !== 'blob') {
            Deno.mkdir(path);
            return;
        }

        console.log(`Downloading ${node.path}`);

        const blobResponse = await fetch(node.url);
        const blobData = await blobResponse.json();
        ensureGithubResponseOrExit(blobResponse, blobData);

        const contentWithoutLineBreaks = blobData.content.replace(/[\r\n]+/gm, '');

        await Deno.writeFile(path, decode(contentWithoutLineBreaks));
    } catch (err) {
        exitWithError(`Error when downloading ${node.path} from github.`, err);
    }
}

function ensureGithubResponseOrExit(res, data) {
    if (!res.ok) {
        const message = `Error when fetching ${state.githubPath} from Github: ` + data.message;
        exitWithError(message);
    }
}

function exitWithError(messages, error) {
    if (typeof messages === 'string') {
        console.log(messages);
        console.log();
    } else {
        for (const message of messages) {
            console.log(message);
            console.log();
        }
    }

    if (error) {
        console.log(error);
    }

    if (state.deleteDownloadPathOnExitWithError) {
        try {
            Deno.remove(state.downloadPath, { recursive: true });
        } catch (err) {
            // Created folder could not be removed.
        }
    }

    Deno.exit(1);
}

function writeSuccess() {
    console.log(`Successfully copied ${state.githubPath} into ${state.downloadFolderName}`);
    console.log();
}
