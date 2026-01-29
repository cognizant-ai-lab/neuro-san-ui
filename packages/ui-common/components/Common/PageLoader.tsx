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

import CircularProgress from "@mui/material/CircularProgress"
import Typography from "@mui/material/Typography"

interface PageLoaderProps {
    id: string
}

export const PageLoader = ({id}: PageLoaderProps) => (
    <div
        id={`${id}__loader`}
        style={{
            left: "0",
            position: "absolute",
            right: "0",
            textAlign: "center",
            top: "50%",
        }}
    >
        <Typography
            id={`${id}-loader__message`}
            variant="h3"
        >
            Loading... Please wait
        </Typography>
        <CircularProgress
            id={`${id}-loader__spinner`}
            sx={{
                color: "var(--bs-primary)",
            }}
            size="100px"
        />
    </div>
)
