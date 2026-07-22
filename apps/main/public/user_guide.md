# Cognizant Multi-Agent Accelerator (MAUI) User Guide

## Table of Contents

# Multi-Agent Accelerator (MAUI)

Multi-Agent Accelerator (MAUI) is designed to help you visualize and interact with multi-agent networks while engaging in intelligent decision-making conversations.

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
- Use the plus icon in the sidebar header to **create** your own agent network with the **Agent Network Designer**.
- Use the download icon next to a network you've created to **download** it as a HOCON file that you can run in neuro-san or neuro-san-studio (see [Using a downloaded network in neuro-san and neuro-san-studio](#using-a-downloaded-network-in-neuro-san-and-neuro-san-studio)).

### 2. Multi-Agent Network Graph

- Provides a visual representation of the selected agent network.
- Nodes represent individual agents, and edges indicate communication and relationships between them.
- Helps you understand how agents interact to process information and generate decisions.

### 3. Chat Window – Query Interface

- Allows you to input queries and receive responses from the AI system.
- Queries are processed using LangChain-powered logic to fetch relevant insights.
- Responses may be influenced by the selected agent network and its internal decision-making processes.

## Temporary Networks

Networks created using the **Agent Network Designer** are temporary and expire after a period of time. If you want to keep one, use the download icon next to it in the sidebar to save it as a HOCON file (`<network-name>.hocon`) before it expires. That file can be run outside MAUI — see [Using a downloaded network in neuro-san and neuro-san-studio](#using-a-downloaded-network-in-neuro-san-and-neuro-san-studio).

Unlike permanent networks, which are read-only, temporary networks can be edited. Edits can happen both at the node level (an individual agent's description and instructions), by clicking on a node and making updates in that popup, and at the network level (its overall structure), by clicking "Edit" next to the network title, and making updates in the Network Editor.

## Using a downloaded network in neuro-san and neuro-san-studio

The download icon saves a network as a HOCON file. HOCON is the data-only format the Neuro SAN frameworks use to define agent networks (think JSON, with comments and a few conveniences), so a network you build in MAUI can run directly in either framework.

### neuro-san-studio

[neuro-san-studio](https://github.com/cognizant-ai-lab/neuro-san-studio) provides the `ns` command-line tool:

1. Import the downloaded file into your studio project. This copies it into the project's `registries/` folder and registers it:

    ```bash
    ns import ~/Downloads/<network-name>.hocon
    ```

1. Start the server and UI, then find your network in the network list:

    ```bash
    ns run
    ```

    Or chat with it directly from the terminal:

    ```bash
    ns chat <network-name>
    ```

### neuro-san (core)

For the core [neuro-san](https://github.com/cognizant-ai-lab/neuro-san) framework:

1. Copy the downloaded file into your registries directory:

    ```bash
    cp ~/Downloads/<network-name>.hocon registries/
    ```

1. Register the network by adding an entry for the file to your manifest (`registries/manifest.hocon`), then point neuro-san at that manifest:

    ```bash
    export AGENT_MANIFEST_FILE=$(pwd)/registries/manifest.hocon
    ```

1. Run the network:

    ```bash
    python -m neuro_san.client.agent_cli --agent <network-name>
    ```

Refer to each project's README for prerequisites such as the Python environment and LLM API keys.
