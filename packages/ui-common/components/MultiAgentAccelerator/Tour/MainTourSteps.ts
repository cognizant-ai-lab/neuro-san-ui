import {Step} from "react-joyride"

/**
 * This file defines the steps for the main tour of the Multi-Agent Accelerator application.
 *
 * @see https://react-joyride.com/docs/step
 */
export const MAIN_TOUR_STEPS: Step[] = [
    {
        // First step doesn't refer to any particular UI element, just a welcome message
        arrowComponent: () => null,
        content:
            "Welcome to Cognizant AI Lab Multi-Agent Accelerator! This tour will give you a quick overview of" +
            " the application.",
        target: () => document.querySelector("#multi-agent-accelerator-grid"),
        placement: "center",
    },
    {
        content:
            "This is the list of agent networks available on the server. Select a network to see its agents and " +
            " start interacting with it!",
        target: () => document.querySelector("#multi-agent-accelerator-sidebar-heading"),
        placement: "bottom",
    },
    {
        content:
            "Agent Network Designer: Click here to create and edit your own network, with the help of a " +
            "powerful AI assistant.",
        target: () => document.querySelector("#add-network-icon"),
        placement: "bottom",
    },
    {
        content:
            "Click this icon to connect to any Neuro SAN backend service. Mouse over it to see the current " +
            "server you are connected to including the version.",
        target: () => document.querySelector("#agent-network-settings-icon"),
        placement: "bottom",
    },
    {
        content: "These are the agents within the current network.",
        target: () => document.querySelector("#multi-agent-accelerator-grid-agent-flow"),
        placement: "auto",
    },
    {
        content:
            "These buttons allow you to adjust the look of the agent flow to your liking. " +
            "Mouse over them to see what they do!",
        // get by aria-label "Control Panel"
        target: () => document.querySelector('div[aria-label="Control Panel"]'),
    },
    {
        content:
            "This is the legend for the agent flow. You can select either 'depth' or 'heatmap' view " +
            " to see the corresponding information about the agents in the flow.",
        target: () => document.querySelector("#multi-agent-accelerator-agent-flow-legend"),
    },
    {
        content: "This is the chat window where you can interact with the currently selected network.",
        target: () => document.querySelector("#llm-chat-agent-network-ui"),
        placement: "auto",
    },
    {
        content:
            "These are the sample queries for your currently selected network. Click one to send it to the agents!",
        target: () => document.querySelector("#sample-queries-box"),
        placement: "top",
    },
    {
        content: "Try typing your query here and sending it to the agents by hitting <Enter>!",
        target: () => document.querySelector("#user-input-div"),
        placement: "top",
    },
    {
        content:
            "These buttons allow you to control what is shown in the Chat window. " +
            "Try mousing over them to see what they do!",
        target: () => document.querySelector("#show-thinking-button"),
        placement: "bottom",
    },
    {
        content:
            "Access Settings from this icon. Here you can change the look and feel of the application, including " +
            " auto branding for a particular customer!",
        target: () => document.querySelector("#settings-icon"),
        placement: "top",
    },
    {
        content:
            "If you want to take the tour again, or if you have any questions or need help, click here to access " +
            "the help information or to contact the Cognizant AI Labs team. We'd love to hear from you!",
        target: () => document.querySelector("#help-dropdown"),
        placement: "top",
    },
]
