import {styled} from "@mui/material"

import {DEFAULT_USER_IMAGE} from "../../../../const"
import {usePreferences} from "../../state/Preferences"

// #region: Styled Components

const UserQueryContainer = styled("div", {
    shouldForwardProp: (prop) => prop !== "darkMode",
})<{darkMode?: boolean}>(({darkMode}) => ({
    backgroundColor: darkMode ? "var(--bs-dark-mode-dim)" : "var(--bs-white)",
    border: "var(--bs-border-width) var(--bs-border-style)",
    borderColor: darkMode ? "var(--bs-white)" : "var(--bs-border-color)",
    borderRadius: "var(--bs-border-radius)",
    boxShadow: `0 0px 6px 0 ${darkMode ? "var(--bs-accent2-light)" : "rgba(var(--bs-primary-rgb), 0.15)"}`,
    color: darkMode ? "var(--bs-white)" : "var(--bs-primary)",
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
    const {darkMode} = usePreferences()

    return (
        <div
            id="user-query-div"
            style={{marginBottom: "1rem"}}
        >
            <UserQueryContainer
                darkMode={darkMode}
                id="user-query-container"
            >
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
