/*
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
*/

import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp"
import {styled, SxProps, useColorScheme} from "@mui/material"
import MuiAccordion, {AccordionProps} from "@mui/material/Accordion"
import MuiAccordionDetails from "@mui/material/AccordionDetails"
import MuiAccordionSummary, {accordionSummaryClasses, AccordionSummaryProps} from "@mui/material/AccordionSummary"
import Typography from "@mui/material/Typography"
import {FC, ReactNode, SyntheticEvent, useCallback, useState} from "react"

import {isDarkMode} from "../../utils/Theme"

// #region: Styled Components
const Accordion = styled((props: AccordionProps) => (
    <MuiAccordion
        disableGutters
        elevation={0}
        id="mui-accordion"
        {...props}
    />
))(({theme}) => ({
    border: `1px solid ${theme.palette.divider}`,

    "&::before": {
        display: "none",
    },
}))

const AccordionSummary = styled((props: AccordionSummaryProps) => (
    <MuiAccordionSummary
        id="mui-accordion-summary"
        expandIcon={
            <ArrowForwardIosSharpIcon
                id="arrow-forward"
                sx={{fontSize: "0.9rem"}}
            />
        }
        {...props}
    />
))(({theme}) => ({
    [`& .${accordionSummaryClasses.expandIconWrapper}.${accordionSummaryClasses.expanded}`]: {
        transform: "rotate(90deg)",
    },
    [`& .${accordionSummaryClasses.content}`]: {
        marginLeft: theme.spacing(1),
    },
}))

const AccordionDetails = styled(MuiAccordionDetails)(({theme}) => ({
    borderTop: "1px solid rgba(0, 0, 0, .125)",
    padding: theme.spacing(2),
}))
// #endregion: Styled Components

// #region: Types
interface MUIAccordionItem {
    content: ReactNode
    disabled?: boolean
    title: ReactNode
}

export interface MUIAccordionProps {
    arrowPosition?: "left" | "right"
    defaultExpandedPanelKey?: number
    expandOnlyOnePanel?: boolean
    id: string
    items: MUIAccordionItem[]
    sx?: SxProps
}
// #endregion: Types

export const MUIAccordion: FC<MUIAccordionProps> = ({
    arrowPosition = "left",
    defaultExpandedPanelKey,
    expandOnlyOnePanel = false,
    id,
    items,
    sx,
}) => {
    // Dark mode
    const {mode, systemMode} = useColorScheme()
    const darkMode = isDarkMode(mode, systemMode)

    const [expandedList, setExpandedList] = useState<number[]>(defaultExpandedPanelKey ? [defaultExpandedPanelKey] : [])

    const handleChange = useCallback(
        (panelKey: number) => (_event: SyntheticEvent, newExpanded: boolean) => {
            setExpandedList((prevExpandedList) => {
                if (!expandOnlyOnePanel) {
                    return newExpanded
                        ? [...prevExpandedList, panelKey]
                        : prevExpandedList.filter((key) => key !== panelKey)
                } else {
                    return newExpanded ? [panelKey] : []
                }
            })
        },
        [expandOnlyOnePanel]
    )

    const isExpanded = useCallback((panelKey: number) => expandedList.includes(panelKey), [expandedList])

    return (
        <>
            {items.map(({content, disabled = false, title}, index) => {
                const panelKey = index + 1 // Start with index 1
                const baseIdAndPanelKey = `${id}-${panelKey}`

                return (
                    <Accordion
                        disabled={disabled}
                        expanded={isExpanded(panelKey)}
                        key={`${baseIdAndPanelKey}-accordion`}
                        id={`${baseIdAndPanelKey}-accordion`}
                        onChange={handleChange(panelKey)}
                        sx={sx}
                    >
                        <AccordionSummary
                            aria-controls={`${baseIdAndPanelKey}-summary`}
                            id={`${baseIdAndPanelKey}-summary`}
                            sx={{
                                backgroundColor: darkMode ? "var(--bs-dark-mode-dim)" : "var(--bs-gray-background)",
                                color: darkMode ? "var(--bs-white)" : "var(--bs-primary)",
                                flexDirection: arrowPosition === "left" ? "row-reverse" : undefined,
                            }}
                        >
                            <Typography
                                component="span"
                                id={`${baseIdAndPanelKey}-summary-typography`}
                                sx={{fontSize: "0.9rem"}}
                            >
                                {title}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails
                            id={`${baseIdAndPanelKey}-details`}
                            sx={{
                                backgroundColor: darkMode ? "var(--bs-dark-mode-dim)" : "rgba(0, 0, 0, 0.02)",
                                borderColor: darkMode ? "var(--bs-white)" : "var(--bs-border-color)",
                                color: darkMode ? "var(--bs-white)" : "var(--bs-primary)",
                            }}
                        >
                            <Typography
                                component="span"
                                id={`${baseIdAndPanelKey}-details-typography`}
                                sx={{fontSize: "0.85rem"}}
                            >
                                {content}
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                )
            })}
        </>
    )
}
