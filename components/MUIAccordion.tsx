import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp"
import {styled, SxProps} from "@mui/material"
import MuiAccordion, {AccordionProps} from "@mui/material/Accordion"
import MuiAccordionDetails from "@mui/material/AccordionDetails"
import MuiAccordionSummary, {accordionSummaryClasses, AccordionSummaryProps} from "@mui/material/AccordionSummary"
import Typography from "@mui/material/Typography"
import {FC, ReactNode} from "react"

// #region: Styled Components
const Accordion = styled((props: AccordionProps) => (
    <MuiAccordion // eslint-disable-line enforce-ids-in-jsx/missing-ids
        disableGutters
        elevation={0}
        square
        {...props}
    />
))(({theme}) => ({
    border: `1px solid ${theme.palette.divider}`,

    "&::before": {
        display: "none",
    },
}))

const AccordionSummary = styled((props: AccordionSummaryProps) => (
    <MuiAccordionSummary // eslint-disable-line enforce-ids-in-jsx/missing-ids
        // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
        expandIcon={<ArrowForwardIosSharpIcon sx={{fontSize: "0.9rem"}} />}
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
    title: ReactNode
    content: ReactNode
    disabled?: boolean
}

interface MUIAccordionProps {
    arrowPosition?: "left" | "right"
    expandOnlyOnePanel?: boolean
    id: string
    items: MUIAccordionItem[]
    sx?: SxProps
}
// #endregion: Types

// TODO: write tests once all the features are added
// TODO: implement expandOnlyOnePanel feature, and also specifiying which section to expand (antd did that with key)
export const MUIAccordion: FC<MUIAccordionProps> = ({
    arrowPosition = "left",
    expandOnlyOnePanel = false,
    id,
    items,
    sx,
}) => (
    <>
        {items.map(({title, content, disabled = false}, index) => (
            <Accordion
                disabled={disabled}
                key={`${id}-${index}`} // eslint-disable-line react/no-array-index-key
                id={`${id}-${index}`}
                sx={sx}
            >
                <AccordionSummary
                    aria-controls={`${id}-${index}-summary`}
                    id={`${id}-${index}-summary`}
                    sx={{flexDirection: arrowPosition === "left" ? "row-reverse" : undefined}}
                >
                    <Typography
                        component="span"
                        id={`${id}-${index}-summary-typography`}
                        sx={{fontSize: "0.9rem"}}
                    >
                        {title}
                    </Typography>
                </AccordionSummary>
                <AccordionDetails id={`${id}-${index}-details`}>
                    <Typography
                        id={`${id}-${index}-details-typography`}
                        sx={{fontSize: "0.85rem"}}
                    >
                        {content}
                    </Typography>
                </AccordionDetails>
            </Accordion>
        ))}
    </>
)
