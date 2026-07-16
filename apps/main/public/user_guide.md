# Cognizant Multi-Agent Accelerator user guide

## Table of Contents

# Multi-Agent Accelerator

The Multi-Agent Accelerator is designed to help you visualize and interact with multi-agent networks while engaging in intelligent decision-making conversations.

## How to Use the Interface

1. Select an Agent Network from the Sidebar to view its structure.
1. Analyze the Multi-Agent Network Graph to understand agent interactions.
1. Enter a query in the Chat Window to receive AI-driven insights.

## Components

The interface consists of three main sections:

### 1. Agent Networks Sidebar

- Displays a list of available agent networks.
- Each agent network represents a group of AI agents working together to analyze and solve problems.
- Enables you to select a network to view its structure and interactions.
- Use the upload icon in the sidebar header to **import** your own network definition (see [Importing a Network Definition](#importing-a-network-definition)).

### 2. Multi-Agent Network Graph

- Provides a visual representation of the selected agent network.
- Nodes represent individual agents, and edges indicate communication and relationships between them.
- Helps you understand how agents interact to process information and generate decisions.

### 3. Chat Window – Query Interface

- Allows you to input queries and receive responses from the AI system.
- Queries are processed using LangChain-powered logic to fetch relevant insights.
- Responses may be influenced by the selected agent network and its internal decision-making processes.

## Importing a Network Definition

You can bring your own agent network into the accelerator by importing a network definition file.

To open the importer, click the upload icon in the **Agent Networks** sidebar header. This launches a guided three-step wizard:

### 1. Select file

- Drag & drop a network definition onto the drop zone, or click **browse your files** to pick one.
- Imports accept a single `.json` file up to 5 MB.
- The file must be a JSON file previously exported from an **Agent Network Designer**-created network. General Neuro SAN HOCON files are not currently supported.

### 2. Review

- The file is parsed and validated automatically.
- On success, you'll see a summary of the network so you can sanity-check it before continuing: the number of **Agents**, **Coded tools**, and **External agents**, along with the **Frontman** (the network's entry-point agent).
- If the file is empty, not valid JSON, the wrong type, or too large, an error message explains the problem so you can pick a different file.

### 3. Confirm

- The network name is pre-filled from the filename (a trailing identifier is stripped automatically) and can be edited.
- If the name matches a network you already have, you'll be asked how to resolve the conflict:
    - **Keep both** — the importer suggests a unique name (for example, `My Network (2)`), keeping your existing network untouched. You can type any available name; the field tells you whether a name is available or already taken.
    - **Replace existing** — overwrites the existing network with the imported one. This is permanent and cannot be undone.
- Click **Import network** (or **Import as new** / **Replace network**, depending on your choice) to finish. The imported network is added to the sidebar and selected automatically.

## Other Considerations

1. Currently, there is no chat history, and agents do not retain memory. This is a planned feature for a future release.
1. Beyond importing a network definition, the system is largely read-only—you cannot edit agents, prompts, or the structure of an existing network.
1. Networks created using the **Agent Network Designer**, or imported from a JSON file (see [Importing a Network Definition](#importing-a-network-definition)), are temporary and expire after a period of time. If you want to keep one, use the download icon next to it in the sidebar to save its definition before it expires.
1. The agent communication animation may not always be perfectly accurate. As the back-end features are enhanced, communication will be more precise. For now, some approximation is necessary.
1. Regarding layout, resizing, and UI refinements—we’re aware of the current limitations. We're actively exploring ways to allow resizing, collapsing, and expanding elements.
