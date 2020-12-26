<img src="piko.svg" height="24px">

_A minimal toolkit for html writing_

We use Piko at [Learnpoint](https://github.com/learnpoint) for writing html pages. Piko is not a front-end framework, or a static site generator with preprocessing, bundling or any other fancy features. Rather, Piko is the smallest step up possible from writing every single html page completely by hand.

If your site consists of a single html page, you don't need Piko. But when your site grow to more than one page, keeping the ```head``` tag up to date between the pages can become error prone and annoying. This is where Piko comes in. Piko lets you extract the ```head``` tag into a separate snippet that can be included and reused on multiple pages. A typical scenario for Piko would be a portfolio site with several html pages.

Please note that Piko is written with our own specific use cases in mind. We will not accept pull requests or fix issues that we don't experience at Learnpoint. We've written Piko for fun and for our own use. That said, feel free to [create your own fork](https://docs.github.com/en/free-pro-team@latest/github/getting-started-with-github/fork-a-repo), or use Piko in any way you wish! ❤️

## Requirements

In order to use Piko, you need [Deno](https://deno.land/manual/getting_started/installation) version ```1.6.1```

## Installation

```bash
$ deno install -A https://cdn.jsdelivr.net/gh/learnpoint/piko@0.9.0/piko.js
```

Verify the installation:

```bash
$ piko

piko 0.9.0
```

## Upgrading

```bash
$ deno install -f -A https://cdn.jsdelivr.net/gh/learnpoint/piko@0.9.0/piko.js
```

## Getting started

1. Use the **```create```** command to create a new site:

    ```bash
    $ piko create my-site
    ```
2. Use the **```dev```** command, from inside the created folder, to start the Piko dev server:

    ```bash
    $ cd my-site
    $ piko dev
    ```

3. Verify that you site is running at ```http://127.0.0.1:3333```

4. Edit ```src/index.html```. The dev server should rebuild your site and reload your browser.

5. Stop the dev server using ```Ctrl+C```.

6. Deploy the ```docs``` folder to your web host.

## Understanding the folder structure

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

There are three important folders in a Piko site:

- The **```docs```** folder contains the build (compiled) version of your site. You should never make manual edits in this folder. Let Piko manage all of its content. When you deploy your site to a web host, like GitHub Pages, Heroku, or Netlify, this is the folder you should deploy. 

- The **```src```** folder is where you do all your html writing. When Piko builds your site, it basically copies the contents of the ```src``` folder into the ```docs``` folder.

- The **```src/snippets```** folder contains your html snippets.

## Using snippets

Each file in the ```src/snippets``` folder is a snippet that can be included in a page. A snippet can only contain html markup.

Include two snippets in a html page:

```html
<!-- header.html -->

<h1>Welcome</h1>

<!-- footer.html -->
```

You can pass props to a snippet using a JavaScript object. Use a comma to separate the object from the snippet name:

```html
<!-- header.html, { title: "Welcome"} -->

<h1>Welcome</h1>

<!-- footer.html -->
```

Inside a snippet, you can access the passed props with ```{{ prop }}``` syntax:

```html
<title>{{ title }}</title>
```

You can provide a default value for a prop:

```html
<title>{{ title || Home }}</title>
```

## Using markdown

You can write you pages in markdown. Piko uses [Marked](https://github.com/markedjs/marked) to parse your markdown into html.

Snippets can be used in markdown pages just as in html pages:

```md
<!-- header.html, { title: "Welcome"} -->

# Welcome

<!-- footer.html -->
```

Snippets only supports html, so you can not write your snippets in markdown.

## A note on Git Bash for Windows

On Windows, Piko is installed as a ```.cmd``` executable. Unfortunately, Git Bash for Windows does not properly recognize ```.cmd``` as an executable file extension.

To run Piko with Git Bash for Windows, you have to specify the ```.cmd``` extension:

```bash
$ piko.cmd

piko 0.9.0
```

If you don't like typing the file extension, there is a simple workaround:

1. Create a file named ```piko``` (without file extension).

2. Save the file _in the same folder_ as ```piko.cmd```. On Windows, this folder is typically located at ```C:\Users\USER\.deno\bin```. If you have trouble finding the folder in which ```piko.cmd``` is installed, you can consult the documentation for the [Deno script installer](https://deno.land/manual@v1.6.2/tools/script_installer) which is used for Piko installation.

3. Put the following content in the ```piko``` file that you created:

    ```bash
    #!/bin/sh
    piko.cmd "$@"
    ```

You should now be able to run Piko without specifying the file extension:

```bash
$ piko

piko 0.9.0
```

## A note on the CNAME file for GitHub Pages

[GitHub Pages](https://pages.github.com/) is a great web host for Piko sites.

When you enable GitHub Pages for your Piko site, GitHub stores a ```CNAME``` file in the ```docs``` folder. You should copy this file into the ```src``` folder. This way, you can safely delete the entire ```docs``` folder if there are any file mismatch problems, and restart the Piko dev server to rebuild the site, without loosing your ```CNAME``` file.

