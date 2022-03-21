# <img src="piko.svg" height="20px">


_A toolkit for Learnpoint Developers._


- **Serve** — A disturbingly fast web server. With auto reload, caching, and compression.
- **Share** — Browse your localhost server from a mobile phone. Or share with curious colleagues!
- **Copy** — Copy files from a github template repository.
- **Build** and **Dev** — SSG utils.



## Requirements

- **Deno v1.20.1** or later.
- **Cloudflare Tunnel** is required for the Share tool.



## Installation


### Deno Installation

Follow the [instructions on this page](https://deno.land/manual/getting_started/installation).

Verify installation:

```bash
$ deno --version
deno 1.20.1 ...
```

Upgrade:
```bash
$ deno upgrade
```



### Cloudflare Tunnel Installation on Windows

Cloudflare Tunnel is only required for using the **Share** tool.

1. Download the 64-bit version (for Windows) from the [Cloudflare Tunnel downloads page](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/).
2. Rename the downloaded file to ```cloudflared.exe```
3. Create a folder named ```C:\Program Files (x86)\cloudflared```
4. Copy the (downloaded and renamed) file to the (created) folder.
5. Add ```C:\Program Files (x86)\cloudflared``` to your PATH environment variable.

Verify installation:

```bash
$ cloudflared -v
cloudflared version ...
```

Upgrading Cloudflare Tunnel must be done manually on Windows:

1. Download the new version from the [Cloudflare Tunnel downloads page](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/).
2. Rename the downloaded file to ```cloudflared.exe```
3. Copy the file to ```C:\Program Files (x86)\cloudflared```. Accept the warning to overwrite the existing file.



### Piko Installation

```bash
$ deno install -A https://cdn.jsdelivr.net/gh/learnpoint/piko@0.9.51/piko.js
```

Verify installation:

```bash
$ piko -v
piko 0.9.51...
```

Upgrade:

```bash
$ piko upgrade
```



## Serve

Serve is a static web server that's offensively fast. :fire:

Launch from any folder:

```bash
$ piko serve

Server started at http://localhost:3333/
```

Stop Serve with `Ctrl+C`.

Serve details:

- All common file types are supported.
- ```index.html``` is served for requests to folders.
- Browser(s) are automatically reloaded on file changes. The reload functionality is implemented through websockets using javascript dynamic page injection.
- Multiple instances of Serve is allowed. When you start (a new instance of) Serve, the port is selected dynamically and displayed in the terminal. The default port is ```3333```.
- Requests to non-existing files will get a 404 response. If a there's a ```404.html``` file, the response body will be populated with the content of that file.
- Responses are compressed with gzip or brotly (whatever the browser supports).
- Only http is supported. There's no plan to implement https, h2 or h3.
- Responses are marked with a weak etag header for client caching. The etag headers are re-calculated when Serve is restarted.



## Share

Share your localhost server in a secure manner without exposing your local precious environment. :lock:

Start sharing your localhost server:

```bash
$ piko share <NAME> [PORT]
```

Example:

```bash
$ piko share learnpoint 53444
```

A public address is generated and printed to the terminal. That address will tunnel requests to your localhost server.


The ```[PORT]``` is saved when you run the command. On subsequent invocations, it can be omitted:

```bash
$ piko share <NAME>
```

Example:

```bash
$ piko share learnpoint
```

List all saved name/port pairs:

```bash
$ piko share list
```

Delete all saved name/port pairs:

```bash
$ piko share clear
```

Stop Share with ```Ctrl+C```.


## Copy

Copy files from a github template repository:

```bash
$ piko copy <OWNER/REPO> [FOLDER_NAME]
```

Example: Create a folder named ```empty``` and copy the files from ```https://github.com/ekmwest/empty``` into that folder:

```bash
$ piko copy ekmwest/empty
```

Example: Create a folder named ```fake``` and copy the files from  ```https://github.com/ekmwest/empty``` into that folder:

```bash
$ piko copy ekmwest/empty fake
```

Example: Copy the files from ```https://github.com/ekmwest/empty``` into current folder:

```bash
$ piko copy ekmwest/empty .
```



## SSG Utils



### Introduction

Piko has basic, but highly opinionated, functionality for generating static sites. It supports markdown, layouts, front matter, and components.



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
      ├── _components
      |    ├── header.html
      |    └── footer.html
      ├── about.md
      └── index.html
```

At the top level, there are two required folders:

- **`docs`** contains the generated site.
- **`src`** contains the source pages, layouts and components.

Inside the `src` folder, there are two required folders:

- **`_layouts`** contains the layouts.
- **`_components`** contains the components.



### The build command

The build command generates a static site. Input is taken from the `src` folder and the site is generated in `docs`:

```bash
$ piko build
```



### The dev server

The dev server runs build in the background and starts Serve for the generated site:

```bash
$ piko dev
```

Stop the dev server using `Ctrl + C`.



### The create command

The create command scaffolds an example site with example pages, layouts and components:

```bash
$ piko crate <FOLDER_NAME>
```

Example: Create a folder named `static-site` with a proper folder structure including example pages, layouts and components:

```bash
$ piko create static-site
```



### Working with layouts

Layouts can be used as wrappers for pages.

The layout must contain a `{{ content }}` directive that specify where the page content should be placed:

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

Use front matter in the page to specify the layout:

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

Inside the layout, the passed variables are rendered with `{{ variableName }}` syntax. Default values can be defined using `{{ variableName || default value}}` syntax:

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



### Working with components

Components are plain html files that can be included in pages or layouts with `<!-- component-name.html -->` syntax:

```html
---
layout: default.html
title: Home
---

<h1>Hello World</h1>

<!-- footer-nav.html -->
```

Variables can be passed to components with javascript object syntax:

```html
---
layout: default.html
title: Home
---

# Hello World

<!-- save-button.html, { theme: 'primary' } -->
```

Inside a component, variables are rendered with `{{ name }}` syntax:

```html
<button class="{{ theme || default }}">Save</button>
```

*Note*: Variables defined in front matter also are available inside the components.



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

*Note*: Layouts and components doesn't support markdown. They must be written in html.



### Using site_content.json

When generating a static site, Piko creates a `site_content.json` file in the `docs` folder that contains an array with page objects. The json file can be used to implement search functionality in the browser.

Each page object contains title, description, url, and content. Example:

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

*Notes*:
- HTML tags are stripped from the content.
- Only the text inside the `<main>` element is added to the content property.
- Text inside `<aside>` tags are stripped from the content property, *even if is't inside a `<main>` element*.



### Deploying a Piko site

A static site that's generated with Piko is easy to deploy. Configure the host to serve the `docs` folder. No build steps are required.



### A note about the CNAME file

When deploying a site to github pages, a file named CNAME will be added to the `docs` folder (this file is added by github). If the build command detects such a file, it will copy that file back into the `src` folder.



### A note about the .nojekyll file

The build command will always ensure there's a file named `.nojekyll` inside the `docs` folder (or add it if it doesn't exist). This is to make sure that folders prefixed with an underscore are properly served by the github server.



## Other useful Piko commands

### Version

Show installed version of Piko and Deno:

```bash
$ piko version
```



### Help

Show help documentation:

```bash
$ piko help
```



## Contributing

Piko is written with our specific use cases at [Learnpoint](https://github.com/learnpoint) in mind. We will not accept pull requests or fix issues that we don't experience at Learnpoint. We've written Piko for fun and for our own use.

That said, feel free to [create your own fork](https://docs.github.com/en/get-started/quickstart/fork-a-repo), or use Piko in any way you wish! ❤️
