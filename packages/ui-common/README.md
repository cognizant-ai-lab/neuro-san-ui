# @cognizant-ai-lab/ui-common

A comprehensive React component library and utilities package for building user interfaces for Neuro-san AI
applications. Contains components for chat interfaces, multi-agent flow visualization, theming and more.

## Copyright

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

## Quickstart

If you don't already have a ReactJS application, create one, for example, using [Create React App](https://create-react-app.dev/):
The following assumes you're using TypeScript (recommended):
```bash
npx create-react-app my-app --template typescript
cd my-app
```

Install the library:

```bash
npm install @cognizant-ai-lab/ui-common
```

Then edit `src/App.tsx` (assuming TypeScript) and replace the contents with the code below:

```tsx
export default function MyApp() {
    // Animation time for the left and right panels to slide in or out when launching the animation
    // For access to logged-in session and current username
    const {
        user: {image: userImage, name: userName},
    } = useAuthentication().data

    const {backendNeuroSanApiUrl} = useEnvironmentStore()

    return (
        <MultiAgentAccelerator
            userInfo={{userName: "Alice", userImage: "https://example.com/alice.png"}}
            backendNeuroSanApiUrl={backendNeuroSanApiUrl}
        />
    )
}
```

Run your app with `npm start` or `yarn start`, and you should see the Multi-Agent Accelerator interface, 
which is a demo application showcasing the components in this package. You can select an agent, chat with that agent 
via the chat interface, and visualize the agent network flow.

## Features

- **UI Components**: Ready-to-use React components for AI chat interfaces, navigation, dialogs, and more
- **Multi-Agent Visualization**: Interactive flow diagrams for visualizing agent networks
- **Authentication**: Built-in authentication components supporting multiple providers
- **State Management**: Zustand-based stores for environment, settings, and user info
- **Theme Support**: Dark mode support with customizable, MUI-based theming
- **Type Safety**: Full TypeScript support with generated OpenAPI types
- **LLM Integration**: Controllers for interacting with language models and AI agents

## Technologies Used

Among the technologies and libraries used in this package are:

- ESLint and Prettier (for code quality)
- Jest and React Testing Library (for testing)
- MUI
- next-auth (for authentication)
- React
- React Flow (for multi-agent visualization)
- TypeScript
- Zustand

## Package Structure

```
ui-common/
├── components/         # React components
│   ├── AgentChat/      # Chat interface components
│   ├── Authentication/ # Auth components
│   ├── ChatBot/        # ChatBot components
│   ├── Common/         # Common UI components (dialogs, navbar, etc.)
│   ├── ErrorPage/      # Error handling components
│   ├── MultiAgentAccelerator/ # Agent flow visualization
│   └── Settings/       # Settings dialog components
├── controller/         # Backend interaction controllers
│   ├── agent/         # Agent API controllers
│   └── llm/           # LLM interaction controllers
├── state/             # Zustand state stores
├── Theme/             # Theming utilities
├── utils/             # Utility functions
└── generated/         # Auto-generated API types
```

## Usage

#### Example application

Refer to [MAUI](https://github.com/cognizant-ai-lab/neuro-san-ui/tree/main/apps/main), the Multi-Agent Accelerator UI,
for a real-world application example that uses these components.

### Basic Import

```typescript
import {ChatCommon, Navbar, MUIDialog, LoadingSpinner, useEnvironment, useUserInfo} from "@cognizant-ai-lab/ui-common"
```

### Using Components

#### ChatCommon

See `ChatCommonProps` for all available props and their types. Here's a basic example of how to use the `ChatCommon`
component in a React application:

```tsx
import {ChatCommon} from "@cognizant-ai-lab/ui-common"
import {AIMessage, HumanMessage} from "@langchain/core/messages"
import {useState} from "react"

function ChatInterface() {
    const [isAwaitingLlm, setIsAwaitingLlm] = useState(false)

    return (
        <ChatCommon
            id="agent-network-ui"
            ref={chatRef} // If you need to access internal methods, like calling "Stop" when user clicks stop
            neuroSanURL={neuroSanURL} // Base URL for Neuro-san API. Must point to a valid Neuro-san server
            currentUser="Alice" // Current user's name, used for chat attribution in API calls and display
            setIsAwaitingLlm={setIsAwaitingLlm} // Used to set whether we're currently waiting for an LLM response,
            // which can be used to disable input and show loading states
            isAwaitingLlm={isAwaitingLlm} // Used to indicate whether we're currently waiting for an LLM response
            targetAgent={selectedNetwork} // The agent we're currently chatting with in Neuro-san.
            onChunkReceived={onChunkReceived} // Callback function that will be called with each new chunk of response
            // from the LLM. You can use this to update your UI in real time
            // as the response comes in.
        />
    )
}
```

### Using Controllers

#### Test Agent Connection

Used for testing connectivity to a Neuro-san server and retrieving version information.

```typescript
import {testConnection} from "@cognizant-ai-lab/ui-common"

async function checkServer() {
    const result = await testConnection("https://api.example.com")

    if (result.success) {
        console.log(`Connected! Version: ${result.version}`)
    } else {
        console.error(`Connection failed: ${result.status}`)
    }
}
```

### Send Chat Query

Send a chat query to the Agent LLM API. If you are using `ChatCommon`, you shouldn't need to call this directly.

```typescript
import {sendChatQuery} from "@cognizant-ai-lab/ui-common"
async function sendMessage() {
    const controller = new AbortController()

    const response = await sendChatQuery(
        neuroSanURL,
        controller.signal,
        "What is the weather in 90210 today?",
        "weather_agent",
        (chunk) => console.log("Received chunk:", chunk),
        chatContext,
        slyData,
        currentUser
    )
}
```

#### Send LLM Request

Lower-level interface to send chat messages to a designated LLM and stream response tokens to the supplied callback
function. You should not need to call this directly if you are using `ChatCommon`. It is a lower-level interface than
`sendChatQuery` and is used by that function under the hood. This function can also be used to send messages to
"legacy" agents, which are not built using the Agent API but still accept chat messages via the LLM API.

```typescript
import {sendLlmRequest} from "@cognizant-ai-lab/ui-common"
import {HumanMessage} from "@langchain/core/messages"

async function chatWithAgent() {
    const controller = new AbortController()

    await sendLlmRequest(
        (token) => console.log("Received:", token),
        controller.signal,
        "/api/chat",
        {temperature: 0.7},
        "What is the weather?",
        [new HumanMessage("Hello")],
        "user-123"
    )
}
```

### Theme Support

The package includes built-in theme support using MUI theming. The components will automatically respond to
the currently active MUI theme.

## Available Components

### AgentChat

- `ChatCommon` - Main chat interface component
- `ControlButtons` - Chat control buttons (clear, scroll, etc.)
- `LlmChatButton` - Button to initiate LLM chat
- `SendButton` - Message send button
- `UserQueryDisplay` - Display user queries

### Multi-Agent Accelerator

- `MultiAgentAccelerator` - Main multi-agent flow component
- `AgentFlow` - Agent flow visualization
- `Sidebar` - Agent networks sidebar

## API Controllers

### Agent Controller

Various functions for interacting with the Neuro-san Agent API, such as retrieving lists of
agent networks and sending chat messages to agents.

## TypeScript Support

This package is written in TypeScript and includes full type definitions. All components, utilities, and API types are
exported for use in your TypeScript projects.

## Development

### Building from Source

```bash
# Install dependencies
yarn install

# Generate OpenAPI types
yarn generate

# Build the package
yarn build

```

## Contributing

This package is part of the [Neuro-san UI](https://github.com/cognizant-ai-lab/neuro-san-ui) project.
Please refer to the main repository [contribution guidelines](https://github.com/cognizant-ai-lab/neuro-san-ui/blob/main/CONTRIBUTING.md).

## License

Apache License 2.0 - See LICENSE file for details

## Support

For questions or issues, contact the Cognizant Neuro AI support team at NeuroAiSupport@cognizant.com

## Related Projects

- [neuro-san](https://github.com/cognizant-ai-lab/neuro-san) - Neuro-san core library
- [neuro-san-studio](https://github.com/cognizant-ai-lab/neuro-san-studio) - Neuro-san examples and studio

---

For more detailed documentation and examples, visit the [GitHub repository](https://github.com/cognizant-ai-lab/neuro-san-ui).
