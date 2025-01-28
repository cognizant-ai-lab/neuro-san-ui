import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp"
import {styled, SxProps} from "@mui/material"
import MuiAccordion, {AccordionProps} from "@mui/material/Accordion"
import MuiAccordionDetails from "@mui/material/AccordionDetails"
import MuiAccordionSummary, {accordionSummaryClasses, AccordionSummaryProps} from "@mui/material/AccordionSummary"
import Typography from "@mui/material/Typography"
import {FC, ReactNode, useState} from "react"

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
            />}
        {...props}
    />
))(({theme}) => ({
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    color: "rgba(0, 0, 0, 0.88)",

    [`& .${accordionSummaryClasses.expandIconWrapper}.${accordionSummaryClasses.expanded}`]: {
        transform: "rotate(90deg)",
    },
    [`& .${accordionSummaryClasses.content}`]: {
        marginLeft: theme.spacing(1),
    },
    ...theme.applyStyles("dark", {
        backgroundColor: "rgba(255, 255, 255, .05)",
    }),
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
    panelKey?: number
    title: ReactNode
}

interface MUIAccordionProps {
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
    const [expanded, setExpanded] = useState<number | undefined>(defaultExpandedPanelKey);

    const handleChange = (panelKey: number) => () => {
        expandOnlyOnePanel && panelKey && setExpanded(panelKey)
    }

    return (
        <>
            {items.map(({title, content, disabled = false, panelKey}, index) => {
                const baseIdAndIndex = `${id}-${index}`

                return (
                    <Accordion
                        disabled={disabled}
                        expanded={expandOnlyOnePanel && panelKey && expanded === panelKey}
                        key={`${baseIdAndIndex}-accordion`}
                        id={`${baseIdAndIndex}-accordion`}
                        onChange={panelKey && handleChange(panelKey)}
                        sx={sx}
                    >
                        <AccordionSummary
                            aria-controls={`${baseIdAndIndex}-summary`}
                            id={`${baseIdAndIndex}-summary`}
                            sx={{flexDirection: arrowPosition === "left" ? "row-reverse" : undefined}}
                        >
                            <Typography
                                component="span"
                                id={`${baseIdAndIndex}-summary-typography`}
                                sx={{fontSize: "0.9rem"}}
                            >
                                {title}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails id={`${baseIdAndIndex}-details`}>
                            <Typography
                                id={`${baseIdAndIndex}-details-typography`}
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
