<img src="piko.svg" height="24px">

*A minimal toolkit for html writing.*

We use piko at [Learnpoint](https://github.com/learnpoint) for writing html pages. It's not a static site generator with templating, blogging, or other fancy features. Rather, it's the smallest step up possible from writing html completely by hand.

Please do note that piko is written with our own specific use cases in mind. We will not accept pull requests or fix issues that we don't experience at Learnpoint. We've written piko for fun and for our own use. That said, feel free to use piko or create your own [fork](https://docs.github.com/en/free-pro-team@latest/github/getting-started-with-github/fork-a-repo).

To use piko, you need to [install Deno](https://deno.land/manual/getting_started/installation) version ```1.6.1```.

## serve

**serve** is a static http server.

1. Serves ```index.html``` on directory requests.
2. Serves ```404.html``` if file not found.
3. Reloads browser on file changes.

```js
import { serve } from "https://cdn.jsdelivr.net/gh/learnpoint/piko@0.0.3/mod.js";

serve({
    targetPath: "/absolute/path"
});
```

## build

**build** copies files from a source folder to a target folder.

1. Markdown files in the source folder will be translated into html.
2. Source files can include component files.

```js
import { build } from "https://cdn.jsdelivr.net/gh/learnpoint/piko@0.0.3/mod.js";

build({
    sourcePath: "/absolute/path/to/source/files",
    componentsPath: "/absolute/path/to/component/files",
    targetPath: "/absolute/path/to/target/files"
});
```

Components are included by passing the name of the component file through a html comment:

```html
<!-- header.html -->

<h1>Welcome</h1>

<!-- footer.html -->
```

You can pass arguments to a component using a JavaScript object:
```html
<!-- header.html, { title: "Home"} -->

<h1>Welcome</h1>

<!-- footer.html -->
```

Inside the component, you can access passed arguments with ```{{ prop }}``` syntax:
```html
<title>{{ title }}</title>
```

You can define a default value for passed argument:
```html
<title>{{ title || 'Index' }}</title>
```

## buildAndServe

**buildAndServe** starts **serve** and then automatically runs **build** in the background when source files are changed.

```js
import { buildAndServe } from "https://cdn.jsdelivr.net/gh/learnpoint/piko@0.0.3/mod.js";

buildAndServe({
    sourcePath: "/absolute/path/to/source/files",
    componentsPath: "/absolute/path/to/components",
    targetPath: "/absolute/path/to/target/files"
});
```
