# Bilme

Theme sharing for MistWarp and compatible Scratch mods, powered by the latest
[OSL](https://osl.mistium.com).

## Run

```sh
~/osl/osl run main.osl
```

Configuration:

- `PORT` defaults to `5609`.
- `APP_URL` defaults to `http://localhost:5609`.

## API

Every `/api` route supports cross-origin requests. Public browsing and export
routes need no credentials. Mutating routes accept a WarpTheme session as
`Authorization: Bearer <token>`.

Exchange a Rotur validator at `POST /api/auth?v=...` to receive that token.
Rotur user `mist` is the administrator and can delete any theme or resolve
reports through `/api/admin/reports` and `/api/admin/report/resolve`.

Run `tests/smoke.sh` for a local API smoke test.
