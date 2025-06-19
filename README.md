# <img src="piko.svg" height="20px">


_Toolkit for Learnpoint Developers._


- **Serve** — A disturbingly fast static server. With auto reload, caching, and compression.
- **Share** — Share your work with colleagues or test your site from a different device.
- **Copy** — Copy files from a github repo.
- **Build**, **Dev** and **Create** — SSG utils.



## Requirements

- **Deno v2.3.6** or later.
- **Cloudflare Tunnel** (only required for using the Share tool).



## Installation


### Deno Installation

Follow the [instructions on this page](https://docs.deno.com/runtime/getting_started/installation/).

Verify Deno installation (the command should display the installed version):

```bash
deno --version
```

Upgrade Deno:

```bash
deno upgrade
```



### Cloudflare Tunnel Installation on Windows

Cloudflare Tunnel is only required when using the **Share** tool.

1. Download the 64-bit version (for Windows) from the [Cloudflare Tunnel downloads page](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. Rename the downloaded file to `cloudflared.exe`.
3. Create a folder named `C:\Program Files (x86)\cloudflared`.
4. Copy the (downloaded and renamed) file to the (created) folder.
5. Add `C:\Program Files (x86)\cloudflared` to your PATH environment variable.

Verify Cloudflare Tunnel installation (the command should display the installed version):

```bash
cloudflared -v
```

Upgrading Cloudflare Tunnel must be done manually on Windows:

1. Download the new version from the [Cloudflare Tunnel downloads page](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. Rename the downloaded file to `cloudflared.exe`.
3. Copy the file to `C:\Program Files (x86)\cloudflared`. Accept the warning to overwrite the existing file.



### Piko Installation

```bash
deno install -g -A --location https://piko.learnpoint.io/ https://cdn.jsdelivr.net/gh/learnpoint/piko@3.1.0/piko.js
```

Verify Piko installation (the command should display the installed version):

```bash
piko -v
```

Upgrade Piko:

```bash
piko upgrade
```

*NOTE:* It's not possible to upgrade from Piko v2.2.14 (or earlier) using Deno v2. In this situation you can just re-install piko:

```bash
deno install -g -f -A --location https://piko.learnpoint.io/ https://cdn.jsdelivr.net/gh/learnpoint/piko@3.1.0/piko.js
```



## Serve

:fire: Serve is a static web server that's offensively fast.

Launch from any folder:

```bash
piko serve
```

Launch using a specific port:

```bash
piko serve 5151
```

Stop Serve with `Ctrl+C`.

Serve details:

- All common file types are supported.
- `index.html` is served by default on requests to folders.
- Browser(s) are automatically reloaded on file changes. The reload functionality is implemented through websockets using dynamic javascript page injection.
- Multiple instances of Serve are allowed. When you start (a new instance of) Serve, without specifying a port, the port is dynamically selected and printed to the terminal. Default port is `3333`.
- Requests to non-existing files will recieve a 404 response. If a there's a `404.html` file in the root folder, the response will be populated with the content of that file.
- Responses are compressed with gzip or brotly (whatever the browser supports).
- Only http is supported. There's no plan to implement https, h2 or h3. Serve is not designed for production.
- Responses are marked with a weak etag header for client caching. The etag headers are re-calculated when Serve is restarted.



## Share

:lock: Share your development server without exposing your local environment.

Start sharing your dev server:

```bash
piko share <NAME> [PORT]
```

Example:

```bash
piko share learnpoint 53444
```

When you start Share, a public address is generated and printed to the terminal. All requests to that address will be tunneled (by Cloudflare) to your dev server.


The `[PORT]` is saved when you run the command. On subsequent invocations, the port can be omitted:

```bash
piko share <NAME>
```

Example:

```bash
piko share learnpoint
```

List all saved ports:

```bash
piko share list
```

Delete all saved ports:

```bash
piko share clear
```

Stop Share with `Ctrl+C`.

***Note:*** You don't need Share if you're able to use Cloudflare Tunnel directly. Share doesn't add any functionality. But some dev servers only accepts requests to `localhost` and will deny requests coming through the tunnel. Share solves this problem by running a reverse proxy (with host header rewriting) that sits between your dev server and the tunnel. From the perspective of your dev server, all requests are made to `localhost`.


## Copy

Copy files from a github repository:

```bash
piko copy <OWNER/REPO> [FOLDER_NAME]
```

Example: Create a folder named `demo` and copy the files from `https://github.com/ekmwest/empty` into that folder:

```bash
piko copy ekmwest/empty demo
```

Example: Copy the files from `https://github.com/ekmwest/empty` into current folder:

```bash
piko copy ekmwest/empty
```

***Note:*** The following files will **not** be copied:
- `LICENSE`
- `CNAME`
- `README.md`
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `.gitignore`
- `.gitattributes`


## SSG Utils



### Introduction

Piko has basic functionality for generating static sites. It supports front matter, layouts, includes, and markdown.



### Understanding the folder structure

```
static-site
 ├── docs
 |    ├── about.html
 |    ├── index.html
 |    └── site_content.json
 └── src
      ├── _layouts
      |    ├── default.html
      ├── _includes
      |    ├── header.html
      |    └── footer.html
      ├── about.md
      └── index.html
```

At the top level, there are two required folders:

- **`docs`** contains the generated site.
- **`src`** contains the source pages, layouts and includes.

Inside the `src` folder, there are two required folders:

- **`_layouts`** contains the layouts.
- **`_includes`** contains the includes.



### The `build` command

The build command generates a static site. Input is taken from the `src` folder and the site is generated in `docs`:

```bash
piko build
```



### The `dev` server

The dev server continuously runs build in the background and starts Serve in the generated site folder:

```bash
piko dev
```

Start the dev server and specify the port that Serve should use:

```bash
piko dev 5252
```


Stop the dev server with `Ctrl + C`.



### The `create` command

Create a Piko SSG site with default folder structure and example pages, layouts and includes:

```bash
piko create [FOLDER_NAME]
```

Example: Create a folder named `static-site` and populate it with a Piko SSG example site:

```bash
piko create static-site
```

Example: Populate current folder with an example Piko SSG site:

```bash
piko create
```



### Working with layouts

A layout is a wrapper for a page.

Every layout must contain a `{{ content }}` directive that specify where the page content should be rendered:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Static Site</title>
</head>
<body>
    <main>
        {{ content }}
    </main>
</body>
</html>
```

Inside a page, use front matter to specify the layout:

```html
---
layout: default.html
---
<h1>Hello World</h1>
```

You can pass variables from the page to the layout using front matter:

```html
---
layout: default.html
title: Home
---
<h1>Hello World</h1>
```

Inside the layout, the passed variables are rendered with `{{ variableName }}` syntax. Default values are declared using `{{ variableName || default value}}` syntax:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>{{ title || My Site }}</title>
</head>
<body>
    <main>
        {{ content }}
    </main>
</body>
</html>
```



### Working with includes

Includes are html or svg files that can be inserted into pages (and layouts) with `<!-- include-name.html -->` syntax:

```html
---
layout: default.html
title: Home
---

<h1>Hello World</h1>

<!-- footer-nav.html -->
```

Variables can be passed to includes with javascript object syntax:

```html
---
layout: default.html
title: Home
---

# Hello World

<!-- save-button.html, { theme: 'primary' } -->
```

Inside an include, variables are rendered with `{{ name }}` syntax:

```html
<button class="{{ theme || default }}">Save</button>
```

***Note:*** Variables defined in front matter also are available inside includes.



### Working with markdown

Pages can be written in markdown:

```html
---
layout: default.html
title: Home
---

# Hello World

<!-- footer-nav.html -->
```

***Note:*** Layouts and includes doesn't support markdown. They must be written in html.



### Using site_content.json

When generating a static site, Piko creates a `site_content.json` file in the `docs` folder that contains an array with page objects. The json file can be used to implement search functionality in the browser.

Each page object has four properties: title, description, url, and content. Example:

```json
[
    {
        "title": "Home",
        "description": "My home page",
        "url": "/",
        "content": "Welcome to my home page..."
    },
    {
        "title": "About",
        "description": "About me",
        "url": "/about/",
        "content": "I am a web developer..."
    }
]
```

***Notes:***
- HTML tags are stripped from the content.
- Only the text inside the `<main>` element is added to the content property.
- Text inside `<aside>` tags are stripped from the content property, *even if is't inside a `<main>` element*.



### Deploying a Piko site

A static site that's generated with Piko is easy to deploy. Configure the host to serve the `docs` folder. No build steps are required.



### A note about the CNAME file

When deploying a site to github pages, a file named CNAME will be added to the `docs` folder (this file is added by github). If the build command detects such a file, it will copy that file back into the `src` folder. This is to make sure you can safely delete the `docs` folder and rebuild the site without loosing the CNAME file.



### A note about the .nojekyll file

The build command will always ensure there's a file named `.nojekyll` inside the `docs` folder (or add it if it doesn't exist). This is to make sure that folders prefixed with an underscore are properly served by github pages.



## Other useful Piko commands

### Version

Show installed version of Piko and Deno:

```bash
piko version
```



### Help

Show help documentation:

```bash
piko help
```


## Working on Piko development

If you want to work on Piko itself, you should configure a local dev environment:

1. Clone the Piko repository.
2. Locate the Piko binary on your file system. The default path is `$HOME/.deno/bin`.
3. Copy the files `piko` and `piko.cmd` and name the copies `pilo` and `pilo.cmd` ("pilo" is short for "piko local").
4. Edit the files (`pilo` and `pilo.cmd`) and change the `piko.js` URL into a path to your local repo. Here's an example of how the `pilo` file could look like:
    ```bash
    #!/bin/sh
    deno "run" "--allow-all" "--location" "https://piko.learnpoint.io/" "--no-config" "/c/src/github/learnpoint/piko/piko.js" "$@"
    ```

Now you should be able to run Piko directly from your local repository using the command `pilo`, for example:

```bash
pilo version
```


## Contributing

Piko is written with our specific use cases at [Learnpoint](https://github.com/learnpoint) in mind. We will not accept pull requests or fix issues that we don't experience at Learnpoint. We've written Piko for fun and for our own use.

That said, feel free to [create your own fork](https://docs.github.com/en/get-started/quickstart/fork-a-repo), or use Piko in any way you wish! ❤️
