# @cognizant-ai-lab/ui-common

React components and utilities for building Neuro-San AI applications: chat interfaces, multi-agent flow
visualization, theming, and typed clients for the Neuro-San API.

Works in Vite, Next.js, or any bundler that understands ES modules, with no Node polyfills to configure. Ships
TypeScript declarations for every export.

## Requirements

| Requirement | Version                              |
| ----------- | ------------------------------------ |
| React       | 19.2.4 or newer                      |
| MUI         | 7.3.1 or newer (7, 8, or 9)          |
| Module type | ES modules (the package is ESM-only) |

## Installation

Install the package together with its peer dependencies:

```bash
npm install @cognizant-ai-lab/ui-common \
    @mui/material @mui/system @mui/icons-material @mui/x-tree-view \
    @emotion/react @emotion/styled
```

If you use npm 7 or newer, the peer dependencies are installed automatically and you can shorten this to
`npm install @cognizant-ai-lab/ui-common`. Yarn and pnpm do not install peers automatically, so list them
explicitly as above.

`next-auth` is an optional peer. You only need it if you use the authentication components described in
[Authentication](#authentication).

## Quickstart

Create a React app, if you do not have one already. Any React 19 setup works. Vite is the quickest:

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
```

Add the library and its peers:

```bash
npm install @cognizant-ai-lab/ui-common \
    @mui/material @mui/system @mui/icons-material @mui/x-tree-view \
    @emotion/react @emotion/styled
```

Replace `src/App.tsx` with the Multi-Agent Accelerator, a demo application that showcases the components in this
package. You will need a running Neuro-San API backend to talk to:

```tsx
import {MultiAgentAccelerator} from "@cognizant-ai-lab/ui-common/components/MultiAgentAccelerator/MultiAgentAccelerator"

export default function App() {
    return (
        <MultiAgentAccelerator
            username="Alice"
            defaultNeuroSanUrl="https://my-neuro-san-api.example.com"
        />
    )
}
```

Run it with `npm run dev`. You can select an agent, chat with it, and visualize the agent network flow. The
Neuro-San URL is editable from within the UI, so `defaultNeuroSanUrl` is only the starting value.

## Importing

Every module is available at a subpath that mirrors the source layout, and the whole public surface is also
re-exported from the package root.

```typescript
// Recommended: import the module you need.
import {MUIDialog} from "@cognizant-ai-lab/ui-common/components/Common/MUIDialog"
import {testConnection} from "@cognizant-ai-lab/ui-common/controller/agent/Agent"
import {useEnvironmentStore} from "@cognizant-ai-lab/ui-common/state/Environment"

// Also supported: the package root.
import {MUIDialog, testConnection, useEnvironmentStore} from "@cognizant-ai-lab/ui-common"
```

Prefer subpath imports. The package root is a barrel that references every module, so importing from it pulls the
entire library, including MUI and the flow visualization, into your bundle. Importing a single dialog through a
subpath costs a few hundred kilobytes; importing it through the root costs several megabytes.

The available subpath prefixes are `components/*`, `controller/*`, `state/*`, `utils/*`, `Theme/*`, and `const`.

## Components

### MultiAgentAccelerator

The full demo application: sidebar, agent flow graph, and chat.

| Prop                 | Type     | Description                                                                |
| -------------------- | -------- | -------------------------------------------------------------------------- |
| `username`           | `string` | Identifier used for backend interactions, for personalization and tracking |
| `defaultNeuroSanUrl` | `string` | Initial Neuro-San API URL. The user can change this in the UI              |

### ChatCommon

The chat interface on its own. See `ChatCommonProps` for the full list of props.

```tsx
import {ChatCommon} from "@cognizant-ai-lab/ui-common/components/AgentChat/ChatCommon/ChatCommon"
import {useState} from "react"

function ChatInterface() {
    const [isAwaitingLlm, setIsAwaitingLlm] = useState(false)
    const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)

    return (
        <ChatCommon
            id="agent-network-ui"
            currentUser="Alice"
            selectedNetwork={selectedNetwork}
            setSelectedNetwork={setSelectedNetwork}
            isAwaitingLlm={isAwaitingLlm}
            setIsAwaitingLlm={setIsAwaitingLlm}
            onChunkReceived={(chunk) => {
                console.log("Received chunk:", chunk)
                return true
            }}
        />
    )
}
```

### Other components

Dialogs and alerts (`MUIDialog`, `MUIAlert`, `ConfirmationModal`, `Snackbar`), chrome (`Navbar`, `Footer`,
`NeuroAIBreadcrumbs`), loading states (`LoadingSpinner`, `PageLoader`), error handling (`ErrorBoundary`), and the
agent flow pieces (`AgentFlow`, `Sidebar`, `AgentConversations`).

## Controllers

Functions for talking to a Neuro-San backend. These are plain TypeScript with no React or MUI dependency, so they
are safe to use in a non-React context.

```typescript
import {getAgentNetworks, testConnection} from "@cognizant-ai-lab/ui-common/controller/agent/Agent"

const result = await testConnection("https://api.example.com")
if (result.success) {
    const networks = await getAgentNetworks("https://api.example.com")
    console.log(networks)
}
```

`sendChatQuery` streams a reply from an agent. If you use `ChatCommon` you do not need to call it yourself.

```typescript
import {sendChatQuery} from "@cognizant-ai-lab/ui-common/controller/agent/Agent"

const controller = new AbortController()

await sendChatQuery(
    neuroSanUrl,
    controller.signal,
    "What is the weather in 90210 today?",
    "weather_agent",
    (chunk) => console.log("Received chunk:", chunk),
    chatContext,
    slyData,
    "Alice"
)
```

`sendLlmRequest`, in `controller/llm/LlmChat`, is the lower-level interface used by `sendChatQuery`. It also works
with legacy agents that accept chat messages over the LLM API rather than the Agent API.

## State

State is managed with [Zustand](https://zustand.docs.pmnd.rs/). Each store is a hook you can call from any
component:

```typescript
import {useEnvironmentStore} from "@cognizant-ai-lab/ui-common/state/Environment"
import {useSettingsStore} from "@cognizant-ai-lab/ui-common/state/Settings"
import {useUserInfoStore} from "@cognizant-ai-lab/ui-common/state/UserInfo"
```

`Announcements`, `ChatHistory`, `IconSuggestions`, `TemporaryNetworks`, and `Tour` stores are available under the
same `state/*` prefix.

## Theming

Components follow the active MUI theme, including dark mode, so wrap them in your own `ThemeProvider` as usual.
`Theme/Theme` exports helpers such as `isDarkMode`, `isLightColor`, and `adjustBrightness`, and `Theme/Palettes`
exports the `PALETTES` used for agent visualization.

## Authentication

Nothing in this package requires an authentication library. Components that show a signed-in user, such as
`Navbar`, take that information as props, and everything works with no session at all.

This applies to `ErrorBoundary` too. It hands the session details you give it to the error page it renders as a
fallback, so wire it up with whatever your app already knows about the user:

```tsx
import {ErrorBoundary} from "@cognizant-ai-lab/ui-common"

export default function App({children}) {
    return (
        <ErrorBoundary
            id="error-boundary"
            userInfo={{name: "Ada", image: "https://example.com/ada.png"}}
            authenticationType="None"
            signOut={() => endYourSession()}
        >
            {children}
        </ErrorBoundary>
    )
}
```

Two modules do use [next-auth](https://authjs.dev/): `components/Authentication/Auth`, a guard that redirects
anonymous visitors to a login screen, and `utils/Authentication`, which reads the signed-in user and signs them out.
Neither is re-exported from the package root, so you only pull next-auth in if you import them by subpath:

```tsx
import {Auth} from "@cognizant-ai-lab/ui-common/components/Authentication/Auth"
```

`next-auth` is an optional peer dependency, needed only for those two modules:

```bash
npm install next-auth@beta
```

## Troubleshooting

**`ERESOLVE` or peer dependency warnings on install.** Check that you are on React 19.2.4 or newer, and on MUI 7.3.1
or newer.

**`Failed to resolve import "next-auth/react"`.** Only `components/Authentication/Auth` and `utils/Authentication`
import next-auth. If you see this, something in your app imports one of them; either install `next-auth` or stop
importing it. The package root does not reach either module.

**Large bundle.** Import through subpaths rather than the package root. See [Importing](#importing).

## Development

This package is part of the [Neuro-San UI](https://github.com/cognizant-ai-lab/neuro-san-ui) monorepo.

```bash
yarn install
yarn generate    # Regenerate the Neuro-San OpenAPI types
yarn build
```

For a real-world application built on these components, see
[MAUI](https://github.com/cognizant-ai-lab/neuro-san-ui/tree/main/apps/main), the Multi-Agent Accelerator UI.

## Contributing

Please refer to the
[contribution guidelines](https://github.com/cognizant-ai-lab/neuro-san-ui/blob/main/CONTRIBUTING.md).

## Support

For questions or issues, contact the Cognizant Neuro AI support team at NeuroAiSupport@cognizant.com.

## Related projects

- [neuro-san](https://github.com/cognizant-ai-lab/neuro-san) - Neuro-San core library
- [neuro-san-studio](https://github.com/cognizant-ai-lab/neuro-san-studio) - Neuro-San examples and studio
- [nsflow](https://github.com/cognizant-ai-lab/nsflow) - Agent network client

## License

Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
