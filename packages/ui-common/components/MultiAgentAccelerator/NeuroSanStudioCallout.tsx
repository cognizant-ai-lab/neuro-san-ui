import Box from "@mui/material/Box"
import Paper from "@mui/material/Paper"
import {alpha} from "@mui/material/styles"
import Typography from "@mui/material/Typography"
import {FC} from "react"

export const NeuroSanStudioCallout: FC = () => (
    <Paper
        aria-label="neuro-san-studio GitHub repository"
        component="a"
        elevation={4}
        href="https://github.com/cognizant-ai-lab/neuro-san-studio"
        rel="noopener noreferrer"
        sx={(theme) => {
            const paper = theme.palette.background.paper
            const primary = theme.palette.primary.main

            return {
                "&:hover": {
                    backgroundImage: `linear-gradient(135deg, ${paper}, ${alpha(primary, 0.14)})`,
                    borderColor: "primary.main",
                    boxShadow: `0 0 0 3px ${alpha(primary, 0.22)}, ${theme.shadows[6]}`,
                    color: "primary.main",
                },
                bgcolor: "background.paper",
                backgroundImage: `linear-gradient(135deg, ${paper}, ${alpha(primary, 0.06)})`,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                color: "text.primary",
                display: "block",
                mt: 2,
                p: 2,
                textAlign: "center",
                textDecoration: "none", // prevent underline on hover
                transition: theme.transitions.create(["color", "border-color", "box-shadow"], {
                    duration: theme.transitions.duration.shortest,
                }),
            }
        }}
        target="_blank"
    >
        <Typography
            sx={{fontWeight: 700}}
            variant="body1"
        >
            ⭐ Star us on GitHub!
        </Typography>

        <Typography
            sx={{mt: 0.5, mb: 1.25, opacity: 0.92}}
            variant="body2"
        >
            See the latest releases, explore examples, and help grow the community on GitHub.
        </Typography>

        <Box
            alt="GitHub Repo stars"
            component="img"
            src="https://img.shields.io/github/stars/cognizant-ai-lab/neuro-san-studio?label=Neuro%20SAN%20Studio"
            sx={{
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                display: "inline-block",
                height: 20,
                verticalAlign: "middle",
            }}
        />
    </Paper>
)
