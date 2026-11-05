# JobMatch frontend

React 19 + Vite single-page app for JobMatch. Setup, demo logins and tests are documented in the [root README](../README.md), and the architecture in [docs/architecture.md](../docs/architecture.md).

```bash
npm install
npm run dev       # http://localhost:5173, expects the API on http://localhost:5001
npm run lint
npm run build     # output in dist/
```

Set `VITE_API_BASE` at build time to point at a different API, for example `VITE_API_BASE=https://api.example.com/api npm run build`.

| Folder | Contents |
|---|---|
| `src/api.js` | `fetch` wrapper that adds the JWT and turns error responses into exceptions |
| `src/pages/` | One folder per role (`Applicant/`, `Employer/`, `DBA/`) plus login and register |
| `src/components/Common.jsx` | Sidebar, spinner, error box, toast |
| `src/styles.js` | Shared inline style objects |
