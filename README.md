<img src="piko.svg" height="24px">

_A minimal toolkit for html writing_

We use Piko at [Learnpoint](https://github.com/learnpoint) for writing static html sites. Piko is not a frontend framework or a fancy site generator. Rather, it's the smallest step up possible from writing all html completely by hand.

If your site has one single html page, you don't need Piko. But if it has several pages, keeping the ```head``` tag up to date can become error prone and annoying. Piko lets you extract the ```head``` tag into a separate component that can be included and reused on multiple pages.

## Requirements

[Deno](https://deno.land/manual/getting_started/installation) version ```1.8.1``` is required to use Piko.

## Installation

```bash
$ deno install -A https://cdn.jsdelivr.net/gh/learnpoint/piko@0.9.15/piko.js
```

Verify installation:

```bash
$ piko -v

piko 0.9.15
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
      ├── components
      |    ├── header.html
      |    └── footer.html
      ├── about.md
      └── index.html
```

- The **```docs```** folder contains your build (compiled) site. This is the folder you would deploy to a web host. Avoid making manual edits in this folder. Let Piko manage its content.

- The **```src```** folder is where you do your html writing.

- The **```src/components```** folder contains components that can be included in pages.

## Using components

A Piko component is just a file with some html markup. A component file can be included in any page.

Place all your components in the ```src/components``` folder.

Include a component on a page using ```<!--  -->``` syntax:

```html
<!-- header.html -->

<h1>Welcome</h1>

<!-- footer.html -->
```

You can pass props to a component using a JavaScript object:

```html
<!-- header.html, { title: "Welcome" } -->

<h1>Welcome</h1>

<!-- footer.html -->
```

Inside a component, you can access passed props with ```{{ prop }}``` syntax:

```html
<title>{{ title }}</title>
```

You can provide a default value with ```||``` syntax:

```html
<title>{{ title || Home }}</title>
```

## Using markdown

You can write your pages in markdown.

Components can be included in markdown pages:

```md
<!-- header.html, { title: "Welcome"} -->

# Welcome

<!-- footer.html -->
```

Note that components cannot be written in markdown. They must be written in html.

## Contributing

Piko is written with our own specific use cases at [Learnpoint](https://github.com/learnpoint) in mind. We will not accept pull requests or fix issues that we don't experience at Learnpoint. We've written Piko for fun and for our own use.

That said, feel free to [create your own fork](https://docs.github.com/en/free-pro-team@latest/github/getting-started-with-github/fork-a-repo), or use Piko in any way you wish!

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="#ef0000">
    <title>We love learning</title>
    <path d="M14 20.408c-.492.308-.903.546-1.192.709-.153.086-.308.17-.463.252h-.002a.75.75 0 01-.686 0 16.709 16.709 0 01-.465-.252 31.147 31.147 0 01-4.803-3.34C3.8 15.572 1 12.331 1 8.513 1 5.052 3.829 2.5 6.736 2.5 9.03 2.5 10.881 3.726 12 5.605 13.12 3.726 14.97 2.5 17.264 2.5 20.17 2.5 23 5.052 23 8.514c0 3.818-2.801 7.06-5.389 9.262A31.146 31.146 0 0114 20.408z"></path>
</svg>
