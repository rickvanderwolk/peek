# Peek

<img src="assets/preview-optimized.png" alt="Peek preview" width="200">

A minimal, drop-in browser console for debugging on mobile or when devtools aren't available. Shows console logs, network requests, and storage.

## Usage

### CDN

```html
<script src="https://cdn.jsdelivr.net/gh/rickvanderwolk/peek@main/peek.js"></script>
```

### npm

```bash
npm install rickvanderwolk/peek
```

```js
import 'peek';
```

Add the script before other scripts to catch all logs. Then activate by adding `?peek=1` to your URL.

## Demo

https://rickvanderwolk.github.io/peek/demo.html?peek=1
