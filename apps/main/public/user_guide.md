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

You can import your own agent network into MAUI by importing a network definition file.

To open the importer, click the upload icon in the **Agent Networks** sidebar header. This launches a guided three-step wizard:

### 1. Select file

- Drag & drop a network definition onto the drop zone, or click **browse your files** to pick one.
- The file must be a JSON file previously exported from an **Agent Network Designer**-created network.

### 2. Review

- The file is parsed and validated automatically.
- Once imported, you'll see a summary of the network so you can sanity-check it before continuing: the number of **Agents**, **Coded tools**, and **External agents**, along with the **Frontman** (the network's entry-point agent).

### 3. Confirm

- Confirm or edit the network name and finish the import. If the name conflicts with an existing network, the dialog offers options to resolve it.
- The imported network is added to the sidebar and selected automatically.

## Temporary Networks

Networks created using the **Agent Network Designer**, or imported from a JSON file (see [Importing a Network Definition](#importing-a-network-definition)), are temporary and expire after a period of time. If you want to keep one, use the download icon next to it in the sidebar to save its definition before it expires.

Unlike permanent networks, which are read-only, temporary networks can be edited — both at the node level (an individual agent's description and instructions) and at the network level (its overall structure).
