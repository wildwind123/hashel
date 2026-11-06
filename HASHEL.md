# About hashel
## This vite extension, alternative for storybook

### About `nip.io`

When i open url like this `http://book.127-0-0-1.nip.io:5173`.

This url will open local host on ip 127.0.0.1:5173 with host `book.127-0-0-1.nip.io`.

This dynamic url.

### Main logick and feature.

filePattern = `*.el.*.{ext} or *.el.{ext}`

This extension will work with files extension like `filePattern`, this can be configurable.

`hashel` extension, create on every files with name `filePattern` uniq name, hash name.

Example.

```ts
hashel['hash1'] = [ "./src/SomeFile.el.vue" ]
hashel['hash2'] = [ "./src/SomeFile1.el.vue" ]
```


When user open page like this `http://book.127-0-0-1.nip.io:5173`

On left menu should list elements of this files based their path three.

When click on left side should open this element on iframe, example url `http://hash1.127-0-0-1.nip.io:5173`.

Extension `hashel` find file via hash name, and detect, which entrypoint files should use for this.

Which `index.html`, `main.ts`.

All this files can be declared on `vite.config.ts`

```ts
hashel({ indexHtml : 'src/index.html', ext : 'vue' })
```

ext - file extension, which will searched via `filePattern`

if indexHtml empty should be default value

```html
<!doctype html>
<html lang="">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/hashel.ts"></script>
  </body>
</html>
```


```ts
// example /src/hashel.ts
import { createApp } from 'vue'
import { Component } from 'hashel'

createApp(Component).mount('#app')
```