<img src="piko.svg" height="24px">

_A minimal toolkit for html writing_

We use Piko at [Learnpoint](https://github.com/learnpoint) for writing static html sites. Piko is not a frontend framework or a fancy site generator. Rather, it's the smallest step up possible from writing all html completely by hand.

If your site has one single html page, you don't need Piko. But when your site has several pages, keeping the ```head``` tag up to date can become error prone and annoying. Piko lets you extract the ```head``` tag into a separate snippet that can be included and reused on multiple pages.

## Requirements

[Install Deno](https://deno.land/manual/getting_started/installation) version ```1.7.0``` in order to use Piko.

## Installation

```bash
$ deno install -A https://cdn.jsdelivr.net/gh/learnpoint/piko@0.9.10/piko.js
```

Verify installation:

```bash
$ piko -v

piko 0.9.10
```

## Upgrading

```bash
$ piko upgrade
```

## Getting started

1. Create a new site:

    ```bash
    $ piko create my-site
    ```
2. Start the dev server:

    ```bash
    $ cd my-site
    $ piko dev
    ```

3. Verify that your site is running at ```http://127.0.0.1:3333```

4. Make a change to ```src/index.html``` and save the file. The dev server will rebuild your site and reload your browser.

5. Stop the dev server using ```Ctrl+C```.

6. Deploy the ```docs``` folder to your web host.

## Understanding the Piko folder structure

```
my-site
 ├── docs
 |    ├── about.html
 |    └── index.html
 └── src
      ├── snippets
      |    ├── header.html
      |    └── footer.html
      ├── about.md
      └── index.html
```

- The **```docs```** folder contains your build (compiled) site. This is the folder you would deploy to a web host. Avoid making manual edits in this folder. Let Piko manage its content.

- The **```src```** folder is where you do your html writing.

- The **```src/snippets```** folder contains snippets that can be included in pages.

## Using snippets

Place all your snippets in the ```src/snippets``` folder.

Include a snippet on a page with ```<!--  -->``` syntax:

```html
<!-- header.html -->

<h1>Welcome</h1>

<!-- footer.html -->
```

You can pass props to a snippet using a JavaScript object:

```html
<!-- header.html, { title: "Welcome" } -->

<h1>Welcome</h1>

<!-- footer.html -->
```

Inside the snippet, you can access passed props with ```{{ prop }}``` syntax:

```html
<title>{{ title }}</title>
```

You can provide a default value with ```||``` syntax:

```html
<title>{{ title || Home }}</title>
```

## Using markdown

You can write your pages in markdown.

Snippets can be included in markdown pages:

```md
<!-- header.html, { title: "Welcome"} -->

# Welcome

<!-- footer.html -->
```

Note that snippets cannot be written in markdown. They must be written in html.

## A note on the CNAME file for GitHub Pages

If you enable GitHub Pages, GitHub creates a ```CNAME``` file in the ```docs``` folder. You should make a copy of this file in the ```src``` folder. This way, you can safely delete the entire ```docs``` folder if there are any file mismatch problems, and restart the Piko dev server to rebuild the site without loosing the file.

## A note on Git Bash for Windows

On Windows, Piko is installed as a ```.cmd``` executable. Unfortunately, Git Bash for Windows does not recognize ```.cmd``` as an executable file extension.

```bash
$ piko

bash: piko: command not found
```

To run Piko with Git Bash for Windows, you must specify the ```.cmd``` extension:

```bash
$ piko.cmd
```

If you don't like typing the file extension, there is a simple workaround:

1. Create a file named ```piko``` (without file extension).

2. Save the file _in the same folder_ as ```piko.cmd```. On Windows, this folder is typically ```C:\Users\USER\.deno\bin```. If you have trouble finding the folder in which ```piko.cmd``` is installed, you can consult the documentation for the [Deno script installer](https://deno.land/manual@v1.6.3/tools/script_installer) which is used for the Piko installation.

3. Add the following content to the ```piko``` file:

    ```bash
    #!/bin/sh
    piko.cmd "$@"
    ```

You should now be able to run Piko without specifying the file extension.

## Contributing

Piko is written with our own specific use cases at [Learnpoint](https://github.com/learnpoint) in mind. We will not accept pull requests or fix issues that we don't experience at Learnpoint. We've written Piko for fun and for our own use.

That said, feel free to [create your own fork](https://docs.github.com/en/free-pro-team@latest/github/getting-started-with-github/fork-a-repo), or use Piko in any way you wish! ❤️
