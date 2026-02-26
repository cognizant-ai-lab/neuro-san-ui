/* eslint-disable max-len */
import {ChatPromptTemplate} from "@langchain/core/prompts"

export const SUGGEST_BRANDING_COLORS_PROMPT = ChatPromptTemplate.fromTemplate(`
Given a company or organization name, suggest colors in hex format that match the company's branding. If you are given
a generic type of company or organization (e.g. "a tech startup", "a non-profit organization"), suggest colors that 
would be appropriate for that type of company.
Also suggest a suitable icon selected from the MUI icons to represent the company or organization. Only give the 
name of the MUI Icon, not the suffix "Icon", so for example "FlightTakeOff" not "FlightTakeOffIcon". 
Return your response as JSON in the following format with no markdown, text or other comments:
{{
    "primary": "#hexcode",
    "secondary": "#hexcode",
    "background": "#hexcode",
    "plasma": "#hexcode",
    "nodeColor": "#hexcode",
    "rangePalette": ["#hexcode1", "#hexcode2", "#hexcode3", "#hexcode4", "#hexcode5", "#hexcode6", "#hexcode7", "#hexcode8", "#hexcode9", "#hexcode10"],
    "iconSuggestion": "IconName"
}}

These colors will be used in a MUI theme for a web application, so ensure they work well together and that there is
adequate contrast between primary and background colors.
"primary" is used for primary UI elements like buttons and highlights
"secondary" is used for secondary UI elements like borders and accents,
"background" is used for the main background of the app, Avoid boring white or black for better aesthetics and 
try to choose vibrant colors (not too saturated) that fit the company branding and contrast well with each other. 
The goal is for a full application make-over using the branding colors.
"plasma" is used for displaying animated plasma effects in the UI, "nodeColor" is used for coloring agent nodes in
the network visualization, and "rangePalette" is a graduated color palette with 10 items used for depth/heatmap 
coloring. It doesn't have to be a strict gradient, but it should be a set of colors that work well together and fit the
company branding.

Company: {company}
`)
