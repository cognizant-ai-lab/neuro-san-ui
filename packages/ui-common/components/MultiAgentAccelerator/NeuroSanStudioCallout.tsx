import GitHubIcon from "@mui/icons-material/GitHub"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import {FC} from "react"

import {getSheen, glassSurface, glowShadow, gradientBorder, SHEEN_EASE, sheenGradient} from "../../Theme/sheen"

export const NeuroSanStudioCallout: FC = () => (
    <Box
        aria-label="neuro-san-studio GitHub repository"
        component="a"
        href="https://github.com/cognizant-ai-lab/neuro-san-studio"
        rel="noopener noreferrer"
        sx={(theme) => {
            const sheen = getSheen(theme)
            const border = gradientBorder(theme, undefined, 1, 0.35)
            return {
                // Specular glass card with an iridescent hairline that lights up on hover
                ...glassSurface(theme),
                ...border,
                "&::before": {
                    ...border["&::before"],
                    transition: `opacity 0.4s ${SHEEN_EASE}`,
                },
                "&:hover": {
                    boxShadow: glowShadow(theme, 28),
                    transform: "translateY(-3px)",
                },
                "&:hover::before": {opacity: 1},
                "&:hover .callout-chip": {transform: "rotate(-6deg) scale(1.06)"},
                "&:focus-visible": {boxShadow: glowShadow(theme, 28), outline: "none"},
                color: "text.primary",
                display: "block",
                mt: 2,
                p: 2.5,
                textDecoration: "none", // prevent underline on hover
                transition: theme.transitions.create(["box-shadow", "transform"], {
                    duration: 400,
                    easing: SHEEN_EASE,
                }),
                // Faint inner glow in the top-right corner
                backgroundImage:
                    `radial-gradient(120% 90% at 100% 0%, ${sheen.tint}, transparent 60%), ` +
                    `linear-gradient(180deg, ${sheen.highlight}, transparent 38%)`,
            }
        }}
        target="_blank"
    >
        <Box sx={{alignItems: "center", display: "flex", gap: 1.5}}>
            {/* Icon chip filled with the signature gradient */}
            <Box
                aria-hidden={true}
                className="callout-chip"
                sx={(theme) => ({
                    alignItems: "center",
                    backgroundImage: sheenGradient(theme),
                    borderRadius: "10px",
                    boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 6px 18px -6px ${getSheen(theme).glow}`,
                    color: (theme.vars ?? theme).palette.primary.contrastText,
                    display: "flex",
                    flexShrink: 0,
                    height: 36,
                    justifyContent: "center",
                    transition: `transform 0.4s ${SHEEN_EASE}`,
                    width: 36,
                })}
            >
                <GitHubIcon sx={{fontSize: 20}} />
            </Box>
            <Typography
                sx={{fontWeight: 650, letterSpacing: "-0.01em"}}
                variant="body1"
            >
                ⭐ Star us on GitHub!
            </Typography>
        </Box>

        <Typography
            sx={{color: "text.secondary", lineHeight: 1.55, mt: 1.25, mb: 1.5}}
            variant="body2"
        >
            See the latest releases, explore examples, read the User Guide and help grow the community on GitHub.
        </Typography>

        <Box
            alt="GitHub Repo stars"
            component="img"
            loading="lazy"
            referrerPolicy="no-referrer"
            src="https://img.shields.io/github/stars/cognizant-ai-lab/neuro-san-studio?label=Neuro%20SAN%20Studio"
            sx={{
                borderRadius: "6px",
                display: "inline-block",
                height: 20,
                verticalAlign: "middle",
            }}
        />
    </Box>
)
