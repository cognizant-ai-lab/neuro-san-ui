# Project Overview

- This is the Neuro SAN UI repo, aka "MAUI", and also includes a reusable library of React.js components (ui-common).
- **Tech Stack:** Typescript 5.9.3, Next.js 16.4.3, MUI 9+ for UI widgets, Node 26+, yarn 4+.

## Repository layout

It is organized as a YARN monorepo.

- `apps/main`: the Next.js web app (Neuro SAN UI / "Multi-Agent Accelerator"). Uses the **Pages router** (`pages/`).
  `app/` only holds the NextAuth route. It is a thin shell: pages mostly render components from `ui-common`.
- `packages/ui-common`: the shared component library, published to npm as `@cognizant-ai-lab/ui-common`. Nearly all
  UI, state and API code lives here. `index.ts` is its public export surface.
- `packages/dev-common`: shared ESLint and knip configs.
- `__tests__/common` (root): shared test helpers and mocks (`withStrictMocks`, `NetworksListMock`, etc.).

`apps/main` imports `ui-common` by **relative path** (`../../../packages/ui-common/...`), not by package name. Tests
live in `__tests__/` directories mirroring the source tree in each workspace.

`apps/main/AGENTS.md` (auto-written by `next dev`) warns that the installed Next.js version differs from what you may
know. Check `node_modules/next/dist/docs/` before relying on Next.js APIs.

## Architecture

**Data flow.** The browser talks directly to a Neuro SAN server for agent work (`controller/agent/Agent.ts`: networks
list, connectivity, streaming chat, function info). Paths come from the generated `ApiPaths` enum with the agent name
substituted in. Things that need server-side secrets go through Next.js API routes in `apps/main/pages/api/`. These
include LLM calls for icon and branding suggestions, `userInfo`, and the publishing proxy (`publish/[...path].ts`, which
adds the bearer token). `pages/api/environment` serves runtime config (Neuro SAN URL, feature flags, publishing server
URL, etc.) that `_app.tsx` loads into `useEnvironmentStore`.

**State.** Zustand stores in `packages/ui-common/state/`. Most persist to `localStorage` (`Settings`, `Tour`,
`Announcements`, `TemporaryNetworks`). Chat history uses IndexedDB (`IndexedDBStorage.ts`). API keys (BYOK) are
deliberately kept in `sessionStorage` only, not `localStorage`. `Settings` has a versioned `migrate`. Bump
`SETTINGS_STORAGE_VERSION` for one-off upgrades of persisted settings.

**Main screen.** `components/MultiAgentAccelerator/MultiAgentAccelerator.tsx` is the hub. It holds a full-bleed
`AgentFlow` canvas (React Flow + dagre layout) with floating, resizable side panels: `Sidebar` (networks tree) on the
left, `AgentChat/ChatCommon` on the right. Also here: the guided tour (react-joyride; `TRIGGER_APP_TOUR_EVENT_NAME`
window event, or `?tour=true`), the network designer, temporary networks, and publishing. `ChatCommon` is reused
elsewhere (e.g. `ChatBot`), so changes there affect more than the MAA chat panel.

**Temporary networks.** Networks built by the agent network designer are stored client-side with an expiry and shown
under a `TEMPORARY_NETWORK_FOLDER` prefix. That prefix is stripped before calling the server.

**Pages.** Page components attach `CustomPageProps` (`authRequired`, `withBreadcrumbs`, `pageContext`) via
`Object.assign`. `_app.tsx` reads them for auth gating, layout and the command palette.

**Styling.** MUI with a custom "sheen" glass design system in `packages/ui-common/Theme/sheen.ts` (`glassSurface`,
`gradientBorder`, `getSheen(theme)`, radius and easing constants) plus palettes in `Palettes.ts`. Use the theme
helpers and `(theme.vars ?? theme)` rather than hard-coded colours. Stacking order goes through
`utils/zIndexLayers.ts`. `gradientBorder` makes its host `position: relative`, which affects which elements stack on
top of each other.

## Build, Lint & Test Commands

Run everything from the repo root.

```bash
yarn install
yarn generate          # Generate Neuro SAN API types (packages/ui-common/generated/) from the Neuro SAN dev server's OpenAPI spec
yarn dev               # Next.js dev server for apps/main on http://localhost:3000 (needs .env, see apps/main/DEVELOPMENT.md)

yarn test                                   # All Vitest tests
yarn test path/to/File.test.tsx             # One file
yarn test path/to/File.test.tsx -t "name"   # One test by name
yarn test --coverage                        # Run tests with coverage report. Important as CI enforces coverage.
yarn tsc                                    # Type-check (Next build skips type errors, so this is the real check)
yarn lint --max-warnings 0                  # ESLint, zero warnings allowed in CI
yarn check-format                           # Prettier
yarn knip                                   # Unused files/exports/dependencies
./build_scripts/CommitCheck.sh              # All of the above, as CI runs them. Slow, use only for final check.
```

- When addressing linter errors, run `yarn lint --fix` to automatically fix issues where possible.
- Run `yarn check-format --write <path>` to fix Prettier issues. `yarn lint --fix` won't fix long lines.
- Run `nvm use` first.
- A new git worktree has no `packages/ui-common/generated/`. Run `yarn generate` before linting or type-checking.

## Code Style & Conventions

- Use TypeScript and React. Avoid JavaScript, class components, and `any` type.
- Follow clean design principles and single responsibility.
- Annotate variables, functions, and components with types.
- Avoid reinventing the wheel; use existing libraries and components where possible.
- Source files carry the Apache 2.0 license header (copy it from a neighboring file).
- Follow Google TypeScript Style Guide and Airbnb React/JSX Style Guide. Format with prettier and lint with ESLint.
- Use camelCase for variable and function names, PascalCase for React components, and UPPER_CASE for constants.
- Use descriptive names for variables, functions, and components. Avoid abbreviations unless they are widely recognized.
- Use TypeScript types and interfaces to define props and state. Avoid heavy casts unless absolutely necessary.
- Prefer existing DOM and library types (e.g. `KeyboardEvent["key"]`) over a bare `string` or `number`.
- Fix the root cause, not the symptom. For example, add the missing prop or callback instead of remounting with `key`.
- Never disable an error from linting, type-checking, or a scanning tool (`eslint-disable`, `@ts-ignore`,
  `@ts-expect-error`) unless there's no way to fix it. Fix the root cause instead.
- Write comments that say what the code does, not what it replaced ("now does X instead of Y").
- Delete code your change leaves unused.
- Ask before changing user-facing copy.
- Check UI changes in both light and dark themes.
- Never use em dashes in code, comments, commit messages, PRs, or issues.

## Testing Guidelines

- Use Vitest for all unit and integration tests. Use React Testing Library for component testing.
- Write tests for all new features and bug fixes. All tests must pass before merging code. Aim for high coverage,
  but prioritize meaningful tests over coverage percentage.
- Vitest + Testing Library in jsdom, with globals enabled. Setup is in `vitest.setup.ts`.
- Focus on testing user interactions and component behavior.
- **Any console output fails the test** (`vitest-fail-on-console`, including `console.warn` and `console.log`). Mock
  or assert expected console calls with a spy.
- Call `withStrictMocks()` in each `describe`. It resets mocks, timers, storage and IndexedDB before each test.
  Zustand stores are module singletons and are not reset automatically, so reset the ones a test touches.
- Coverage thresholds are enforced (`yarn test --coverage`, used by CommitCheck and CI).
- jsdom does no layout, so visual problems (overlap, clipping, z-order) won't show up in tests.
- Never change production code to make a test pass or raise coverage. Test ids and selectors are the only exception.
- Don't copy-paste near-duplicate tests. Use `it.each` or a helper.
- Name tests for what the user sees or does, not for props or handlers.
- Query by role and accessible name, not test id. If an element has no accessible name, add an `aria-label`.
- Don't wrap `getBy*` in `toBeInTheDocument()`. `getBy*` already throws when the element is missing.
- Prefer `userEvent` over `fireEvent`.
- Use `toHaveBeenCalledWith` and similar matchers, not `mock.calls`.
- Use `vi.mocked()` instead of casting mocks.
- Use the constants the code exports instead of retyping string literals.
- For transient UI (spinners, toasts), also assert that it goes away.

## Git & Pull Requests

- Never commit to `main`.
- Open PRs as drafts.
- Keep commit messages short and in plain text.
- PR descriptions describe the final change against the base branch, not how it got there.
- Don't add extra line breaks at the end of PR descriptions.
- Don't hard-wrap PR descriptions, comments, or issues. GitHub wraps them.
- Don't @-mention people in PR descriptions.
- In PRs, comments, and issues, state only what you verified.
- Don't treat a README, doc, or PR description as proof of how something works. Read the code, workflow, or
  script, or run it.

## Guardrails & Anti-Patterns

- Explicit "Do Not" rules for common LLM mistakes in this repo:
    - Don't edit `packages/ui-common/generated/` by hand. Run `yarn generate` instead.
    - Don't edit `yarn.lock` by hand.
