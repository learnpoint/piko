import { path } from "./deps.js";

export async function create(projectName) {
    console.log();

    if (!projectName) {
        exitWithError('Missing name of folder to create.');
    }

    const projectPath = path.join(Deno.cwd(), projectName);

    try {
        await Deno.mkdir(projectPath);
    } catch (err) {
        if (err instanceof Deno.errors.AlreadyExists) {
            exitWithError(`Folder ${projectName} already exists.`);
        } else {
            exitWithError('Error', err);
        }
    }

    const sourcePath = path.join(projectPath, 'src');
    const includesPath = path.join(sourcePath, '_includes');
    const layoutsPath = path.join(sourcePath, '_layouts');

    await Deno.mkdir(sourcePath);
    await Deno.mkdir(includesPath);
    await Deno.mkdir(layoutsPath);

    Deno.writeTextFile(path.join(sourcePath, 'index.html'), indexPageContent());
    Deno.writeTextFile(path.join(sourcePath, 'about.md'), aboutPageContent());
    Deno.writeTextFile(path.join(sourcePath, '404.html'), notFoundPageContent());
    Deno.writeTextFile(path.join(sourcePath, 'style.css'), styleContent());
    Deno.writeTextFile(path.join(layoutsPath, 'default.html'), defaultLayoutContent());
    Deno.writeTextFile(path.join(includesPath, 'nav.html'), navIncludeContent(projectName));

    console.log(`piko successfully created the folder /${projectName}`);
    console.log();
    console.log(`1. Open /${projectName} in your html editor.`);
    console.log(`2. Start a terminal in /${projectName}.`);
    console.log('3. Run the command "piko dev" in the terminal.');
    console.log();
    console.log('Happy html writing!');
    console.log();
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

    Deno.exit(1);
}

const indexPageContent = () => `---
layout: default.html
---

<h1>Hello World</h1>

<p>This is the index page.</p>`;

const aboutPageContent = () => `---
layout: default.html
description: We're all about fast sites
title: About
---

# About

This is the about page.`;

const notFoundPageContent = () => `---
layout: default.html
title: Page not found
---

<h1>Page not found</h1>`;

const styleContent = () => `body {
    font-family: -apple-system, 'Segoe UI', sans-serif;
    background-color: #f0f0f0;
}

nav {
    margin: 2em 0 1em;
    text-align: center;
}

main {
    width: 640px;
    margin: 0 auto;
    padding: 1em 1em 2em;
    border-radius: .5em;
    background-color: #fff;
    text-align: center;
}`;

const defaultLayoutContent = () => `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>{{ title || Hello World }}</title>
    <meta name="description" content="{{ description || This site was created by Piko }}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="/style.css" />
</head>

<body>
    <!-- nav.html -->
    <main>
        {{ content }}
    </main>
</body>

</html>`;

const navIncludeContent = projectName => `<aside>
<nav>
    <a href="/index.html">Home</a>
    <a href="/about.html">About</a>
</nav>
</aside>`;


