import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Collapse from "@mui/material/Collapse"
import {SxProps} from "@mui/material/styles"
import {FC, ReactNode, useState} from "react"

interface AccordionLiteProps {
    readonly id: string
    readonly items: ReactNode
    readonly contentSx?: SxProps
    readonly title: ReactNode
}

/**
 * A lightweight accordion component that can be used to show/hide content.
 * @see {MUIAccordion} for a more heavyweight accordion.
 */
export const AccordionLite: FC<AccordionLiteProps> = ({id, items, contentSx, title}) => {
    const [isExpanded, setIsExpanded] = useState<boolean>(false)

    return (
        <Box id={id}>
            <Button
                onClick={() => setIsExpanded((prev) => !prev)}
                startIcon={
                    <ExpandMoreIcon
                        sx={{
                            fontSize: "1rem",
                            transform: !isExpanded && "rotate(270deg)",
                            transition: "transform 150ms ease",
                        }}
                    />
                }
                sx={{
                    "&:hover": {backgroundColor: "transparent", textDecoration: "underline"},
                    color: "text.secondary",
                    fontSize: "smaller",
                    minWidth: 0,
                    padding: 0,
                    textTransform: "none",
                }}
            >
                {title}
            </Button>
            <Collapse
                id={`${id}-items`}
                in={isExpanded}
                timeout="auto"
                unmountOnExit={false}
            >
                <Box sx={[...(Array.isArray(contentSx) ? contentSx : [contentSx])]}>{items}</Box>
            </Collapse>
        </Box>
    )
}
