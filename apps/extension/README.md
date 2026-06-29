# LinguaTrace extension

Chrome Manifest V3 extension for in-page selected-text translation, OCR, and history.

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

Development builds can fall back to the web `VITE_LOGTO_*` values. Production
extension builds require explicit `VITE_EXTENSION_LOGTO_APP_ID` and
`VITE_EXTENSION_LOGTO_API_RESOURCE` values. Register this Logto redirect URI on
the extension Logto application:

```text
https://<extension-id>.chromiumapp.org/
```

For an unpacked build, copy the extension ID from `chrome://extensions` after
loading `apps/extension/dist`.

Package zip:

```bash
bun --filter @app/extension package
```
