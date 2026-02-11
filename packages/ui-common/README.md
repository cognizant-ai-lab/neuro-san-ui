# @cognizant-ai-lab/ui-common

A comprehensive React component library and utilities package for building AI agent-based user interfaces with Material-UI (MUI). This package provides ready-to-use components, controllers, state management, and theming utilities specifically designed for Neuro-san AI applications.

## Copyright

Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## Installation

```bash
npm install @cognizant-ai-lab/ui-common
# or
yarn add @cognizant-ai-lab/ui-common
```

### Peer Dependencies

This package requires the following peer dependencies:

```json
{
  "@emotion/react": "^11.13.3",
  "@emotion/styled": "^11.13.0",
  "@mui/icons-material": "^7.3.1",
  "@mui/material": "^7.3.1",
  "@mui/x-tree-view": "^8.22.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5.9.2"
}
```

Install them using:

```bash
npm install @emotion/react @emotion/styled @mui/icons-material @mui/material @mui/x-tree-view react react-dom typescript
# or
yarn add @emotion/react @emotion/styled @mui/icons-material @mui/material @mui/x-tree-view react react-dom typescript
```

## Features

- **UI Components**: Pre-built React components for AI chat interfaces, navigation, dialogs, and more
- **Multi-Agent Visualization**: Interactive flow diagrams for visualizing agent networks
- **Authentication**: Built-in authentication components supporting multiple providers
- **State Management**: Zustand-based stores for environment, settings, and user info
- **Theme Support**: Dark mode support with customizable Material-UI theming
- **Type Safety**: Full TypeScript support with generated OpenAPI types
- **LLM Integration**: Controllers for interacting with language models and AI agents

## Package Structure

```
ui-common/
├── components/          # React components
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

### Basic Import

```typescript
import {
  ChatCommon,
  Navbar,
  MUIDialog,
  LoadingSpinner,
  useEnvironment,
  useUserInfo
} from '@cognizant-ai-lab/ui-common'
```

### Using Components

#### Navigation Bar

```tsx
import { Navbar } from '@cognizant-ai-lab/ui-common'

function App() {
  return (
    <Navbar
      id="main-navbar"
      logo="My App"
      query={{}}
      pathname="/"
      userInfo={{ name: "John Doe", image: "/avatar.jpg" }}
      authenticationType="Auth0"
      signOut={() => console.log('Sign out')}
      supportEmailAddress="support@example.com"
    />
  )
}
```

#### Chat Interface

```tsx
import { ChatCommon } from '@cognizant-ai-lab/ui-common'
import { AIMessage, HumanMessage } from '@langchain/core/messages'

function ChatInterface() {
  const [messages, setMessages] = useState([
    new HumanMessage("Hello!"),
    new AIMessage("Hi! How can I help you?")
  ])

  return (
    <ChatCommon
      agent="my-agent"
      chatHistory={messages}
      loading={false}
      onClearHistory={() => setMessages([])}
      onSendMessage={(msg) => console.log(msg)}
    />
  )
}
```

#### Dialog

```tsx
import { MUIDialog } from '@cognizant-ai-lab/ui-common'

function MyComponent() {
  const [open, setOpen] = useState(false)

  return (
    <MUIDialog
      id="my-dialog"
      isOpen={open}
      onClose={() => setOpen(false)}
      title="Dialog Title"
    >
      <p>Dialog content goes here</p>
    </MUIDialog>
  )
}
```

### Using State Management

```typescript
import { useEnvironment, useUserInfo } from '@cognizant-ai-lab/ui-common'

function MyComponent() {
  const { environment, setEnvironment } = useEnvironment()
  const { userInfo, setUserInfo } = useUserInfo()

  return (
    <div>
      <p>Current server: {environment.neuroSanServerUrl}</p>
      <p>User: {userInfo.name}</p>
    </div>
  )
}
```

### Using Controllers

#### Test Agent Connection

```typescript
import { testConnection } from '@cognizant-ai-lab/ui-common'

async function checkServer() {
  const result = await testConnection('https://api.example.com')
  
  if (result.success) {
    console.log(`Connected! Version: ${result.version}`)
  } else {
    console.error(`Connection failed: ${result.status}`)
  }
}
```

#### Send LLM Request

```typescript
import { sendLlmRequest } from '@cognizant-ai-lab/ui-common'
import { HumanMessage } from '@langchain/core/messages'

async function chatWithAgent() {
  const controller = new AbortController()
  
  await sendLlmRequest(
    (token) => console.log('Received:', token),
    controller.signal,
    '/api/chat',
    { temperature: 0.7 },
    'What is the weather?',
    [new HumanMessage("Hello")],
    'user-123'
  )
}
```

### Multi-Agent Flow Visualization

```tsx
import { MultiAgentAccelerator } from '@cognizant-ai-lab/ui-common'

function AgentFlowPage() {
  return (
    <MultiAgentAccelerator
      agentName="orchestrator"
      conversationId="conv-123"
    />
  )
}
```

### Using Utilities

```typescript
import { 
  useLocalStorage,
  formatTitle,
  getZIndexLayer
} from '@cognizant-ai-lab/ui-common'

function MyComponent() {
  const [value, setValue] = useLocalStorage('myKey', 'defaultValue')
  
  const title = formatTitle('hello world') // "Hello World"
  const zIndex = getZIndexLayer('modal') // Returns appropriate z-index
  
  return <div>{value}</div>
}
```

### Theme Support

The package includes built-in dark mode support:

```typescript
import { useColorScheme } from '@mui/material/styles'
import { useTheme } from '@mui/material/styles'

function ThemedComponent() {
  const theme = useTheme()
  const { mode, setMode } = useColorScheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <button onClick={() => setMode(isDark ? 'light' : 'dark')}>
      Toggle Dark Mode
    </button>
  )
}
```

## Available Components

### AgentChat
- `ChatCommon` - Main chat interface component
- `ControlButtons` - Chat control buttons (clear, scroll, etc.)
- `LlmChatButton` - Button to initiate LLM chat
- `SendButton` - Message send button
- `UserQueryDisplay` - Display user queries

### Common
- `Navbar` - Application navigation bar
- `MUIDialog` - Custom Material-UI dialog wrapper
- `MUIAccordion` - Custom accordion component
- `MUIAlert` - Alert/notification component
- `Breadcrumbs` - Breadcrumb navigation
- `ConfirmationModal` - Confirmation dialog
- `LoadingSpinner` - Loading indicator
- `PageLoader` - Full-page loading component
- `Snackbar` - Toast notifications

### Authentication
- `Auth` - Authentication wrapper component

### Multi-Agent Accelerator
- `MultiAgentAccelerator` - Main multi-agent flow component
- `AgentFlow` - Agent flow visualization
- `Sidebar` - Agent flow sidebar

### Error Handling
- `ErrorBoundary` - React error boundary component

## API Controllers

### Agent Controller
- `testConnection(url)` - Test connection to Neuro-san server
- `getAgentInfo(agent, userId)` - Get agent information
- `getChatHistory(agent, conversationId, userId)` - Retrieve chat history
- `sendChatMessage(...)` - Send chat message to agent

### LLM Controller
- `sendLlmRequest(...)` - Send request to LLM with streaming support

## State Stores

### Environment Store
Manages environment configuration (server URLs, settings)

```typescript
const { environment, setEnvironment } = useEnvironment()
```

### UserInfo Store
Manages user information and authentication state

```typescript
const { userInfo, setUserInfo } = useUserInfo()
```

### Settings Store
Manages user preferences including appearance settings

```typescript
const { settings, setSettings } = useSettings()
```

## Constants

Access application constants:

```typescript
import { 
  LOGO,
  NEURO_SAN_UI_VERSION,
  DEFAULT_USER_IMAGE,
  authenticationEnabled
} from '@cognizant-ai-lab/ui-common/const'
```

## TypeScript Support

This package is written in TypeScript and includes full type definitions. All components, utilities, and API types are exported for use in your TypeScript projects.

## Development

### Building from Source

```bash
# Install dependencies
yarn install

# Generate OpenAPI types
yarn generate

# Build the package
yarn build

# Clean build artifacts
yarn clean
```

## Contributing

This package is part of the [Neuro-san UI](https://github.com/cognizant-ai-lab/neuro-san-ui) project. Please refer to the main repository for contribution guidelines.

## License

Apache License 2.0 - See LICENSE file for details

## Support

For questions or issues, contact the Cognizant Neuro AI support team at NeuroAiSupport@cognizant.com

## Related Projects

- [neuro-san](https://github.com/cognizant-ai-lab/neuro-san) - Neuro-san core library
- [neuro-san-studio](https://github.com/cognizant-ai-lab/neuro-san-studio) - Neuro-san examples and studio

## Version

Current version: 1.2.4

---

For more detailed documentation and examples, visit the [GitHub repository](https://github.com/cognizant-ai-lab/neuro-san-ui).

