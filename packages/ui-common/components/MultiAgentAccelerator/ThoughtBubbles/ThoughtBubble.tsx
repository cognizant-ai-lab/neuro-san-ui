import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import {SVGProps} from "react"

export interface ThoughtBubbleProps extends SVGProps<SVGSVGElement> {
    readonly backgroundColor?: string
    readonly color?: string
    readonly text?: string
    readonly textColor?: string
}

const bubbleFillPath =
    // eslint-disable-next-line max-len
    "M 45.673,0 C 67.781,0 85.703,12.475 85.703,27.862 C 85.703,43.249 67.781,55.724 45.673,55.724 C 38.742,55.724 32.224,54.497 26.539,52.34 C 15.319,56.564 0,64.542 0,64.542 C 0,64.542 9.989,58.887 14.107,52.021 C 15.159,50.266 15.775,48.426 16.128,46.659 C 9.618,41.704 5.643,35.106 5.643,27.862 C 5.643,12.475 23.565,0 45.673,0"

const bubbleOutlinePath =
    // eslint-disable-next-line max-len
    "M 45.673,0 C 67.781,0 85.703,12.475 85.703,27.862 C 85.703,43.249 67.781,55.724 45.673,55.724 C 38.742,55.724 32.224,54.497 26.539,52.34 C 15.319,56.564 0,64.542 0,64.542 C 0,64.542 9.989,58.887 14.107,52.021 C 15.159,50.266 15.775,48.426 16.128,46.659 C 9.618,41.704 5.643,35.106 5.643,27.862 C 5.643,12.475 23.565,0 45.673,0 M 45.673,2.22 C 24.824,2.22 7.862,13.723 7.862,27.863 C 7.862,34.129 11.275,40.177 17.472,44.893 L 18.576,45.734 L 18.305,47.094 C 17.86,49.324 17.088,51.366 16.011,53.163 C 15.67,53.73 15.294,54.29 14.891,54.837 C 18.516,53.191 22.312,51.561 25.757,50.264 L 26.542,49.968 L 27.327,50.266 C 32.911,52.385 39.255,53.505 45.673,53.505 C 66.522,53.505 83.484,42.002 83.484,27.862 C 83.484,13.722 66.522,2.22 45.673,2.22 L 45.673,2.22 z "

/**
 * A single thought bubble.
 */
export const ThoughtBubble = ({
    backgroundColor,
    className,
    color,
    height,
    style,
    text,
    textColor,
    width,
}: ThoughtBubbleProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 85.704 64.542"
        className={className}
        role="img"
        aria-label="Thought bubble"
        style={style}
    >
        <g transform="matrix(0.9486962,0,0,0.9486962,2.4834364,1.8361818)">
            <path
                d={bubbleFillPath}
                fill={backgroundColor}
            />

            <path
                d={bubbleOutlinePath}
                fill={color}
            />
        </g>

        <foreignObject
            x="17.5%"
            y="18.5%"
            width="67.5%"
            height="52.5%"
        >
            <Box
                sx={{
                    alignItems: "flex-start",
                    boxSizing: "border-box",
                    display: "flex",
                    height: "100%",
                    justifyContent: "center",
                    overflow: "hidden",
                    width: "100%",
                }}
            >
                <Typography
                    sx={{
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 4,
                        color: textColor,
                        display: "-webkit-box",
                        fontSize: "7px",
                        fontWeight: 700,
                        letterSpacing: "-0.01em",
                        lineHeight: 1.1,
                        maxHeight: "calc(4 * 7px * 1.1)",
                        overflow: "hidden",
                        overflowWrap: "anywhere",
                        px: 0.25,
                        textAlign: "center",
                    }}
                >
                    {text}
                </Typography>
            </Box>
        </foreignObject>
    </svg>
)
