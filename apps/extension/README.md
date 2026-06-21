# LinguaTrace extension

Chrome Manifest V3 side panel for selected-text translation, OCR, and history.

## Build / dev

```bash
bun --filter @app/extension build
# or watch mode:
bun --filter @app/extension dev
```

Load `apps/extension/dist` in `chrome://extensions`.

## Required build env

```bash
VITE_EXTENSION_API_BASE_URL=https://example.com/api
VITE_EXTENSION_LOGTO_ENDPOINT=https://auth.example.com
VITE_EXTENSION_LOGTO_APP_ID=lingua-trace-extension
VITE_EXTENSION_LOGTO_API_RESOURCE=https://api.example.com
```

`VITE_EXTENSION_LOGTO_*` falls back to the web `VITE_LOGTO_*` values. Register this Logto redirect URI:

```text
https://<extension-id>.chromiumapp.org/
```

Package zip:

```bash
bun --filter @app/extension package
```
