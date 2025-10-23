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

import {styled} from "@mui/material"

import {DEFAULT_USER_IMAGE} from "../../const"

// #region: Styled Components

const UserQueryContainer = styled("div")(({theme}) => ({
    backgroundColor: theme.palette.background.default,
    border: "var(--bs-border-width) var(--bs-border-style)",
    borderColor: theme.palette.mode === "dark" ? "var(--bs-white)" : "var(--bs-border-color)",
    borderRadius: "var(--bs-border-radius)",
    boxShadow: `0 0px 6px 0 ${
        theme.palette.mode === "dark" ? "var(--bs-accent2-light)" : "rgba(var(--bs-primary-rgb), 0.15)"
    }`,
    color: theme.palette.mode === "dark" ? "var(--bs-white)" : "var(--bs-primary)",
    display: "inline-flex",
    padding: "10px",
}))

// #endregion: Styled Components

export const UserQueryDisplay = ({
    userQuery,
    title,
    userImage,
}: {
    userQuery: string
    title: string
    userImage: string
}) => {
    return (
        <div
            id="user-query-div"
            style={{marginBottom: "1rem"}}
        >
            <UserQueryContainer id="user-query-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    id="user-query-image"
                    src={userImage || DEFAULT_USER_IMAGE}
                    width={30}
                    height={30}
                    title={title}
                    alt=""
                    role="img"
                />
                <span
                    id="user-query"
                    style={{marginLeft: "0.625rem", marginTop: "0.125rem"}}
                >
                    {userQuery}
                </span>
            </UserQueryContainer>
        </div>
    )
}
