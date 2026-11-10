/*
Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.

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

import Box from "@mui/material/Box"
import ButtonBase from "@mui/material/ButtonBase"
import {styled} from "@mui/material/styles"
import {LayoutGroup, motion, useReducedMotion} from "motion/react"
import {FC, ReactNode, useCallback, useEffect, useRef, useState} from "react"

import {getSheen, glowShadow, gradientBorder, SHEEN_EASE, SHEEN_RADIUS, sheenGradient} from "../../Theme/sheen"

/**
 * Two-column layout for the Settings dialog: a section nav on the left (horizontal chips on narrow screens) with
 * scrollspy, and a scrolling content column on the right whose sections rise in as they enter view.
 */

//#region: Constants

// Section counts as "current" once any part of it is in the top 40% of the scroll column
const SCROLLSPY_ROOT_MARGIN = "0px 0px -60% 0px"

// After a nav click, ignore scrollspy updates while the smooth scroll passes over the intermediate sections
const CLICK_LOCK_MS = 900

// Matches SHEEN_EASE, as a bezier array for motion
const SHEEN_EASE_BEZIER = [0.22, 1, 0.36, 1] as const

//#endregion: Constants

//#region: Types

interface SettingsNavSection {
    // Stable key, used to build the DOM id of the section anchor
    readonly key: string
    // Label shown in the nav (the section heading)
    readonly label: string
    readonly content: ReactNode
}

interface SettingsNavLayoutProps {
    readonly id: string
    readonly sections: readonly SettingsNavSection[]
    // Rendered after the sections, in the scroll column, but not listed in the nav
    readonly after?: ReactNode
}

//#endregion: Types

export const getSectionAnchorId = (id: string, key: string) => `${id}-section-${key}`

/**
 * Tracks which of the given anchors is currently scrolled into view inside `container`.
 * No-op (first anchor stays active) where IntersectionObserver is unavailable, e.g. jsdom.
 * @returns the active anchor id, a setter, and a function to suspend updates for a while (used during smooth scroll)
 */
const useScrollSpy = (container: HTMLElement | null, anchorIds: readonly string[]) => {
    const [activeId, setActiveId] = useState<string | undefined>(anchorIds[0])
    const lockUntil = useRef<number>(0)
    const idsKey = anchorIds.join("|")

    const lock = useCallback((ms: number = CLICK_LOCK_MS) => {
        lockUntil.current = Date.now() + ms
    }, [])

    useEffect(() => {
        if (!container || typeof IntersectionObserver === "undefined") {
            return undefined
        }

        const ids = idsKey.split("|")
        const intersecting = new Map<string, boolean>()

        const pick = () => {
            if (Date.now() < lockUntil.current) {
                return
            }

            // A short final section may never reach the top of the column: select it once scrolled to the bottom
            const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 4
            if (atBottom && container.scrollTop > 0) {
                setActiveId(ids[ids.length - 1])
                return
            }

            const first = ids.find((anchorId) => intersecting.get(anchorId))
            if (first) {
                setActiveId(first)
            }
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => intersecting.set(entry.target.id, entry.isIntersecting))
                pick()
            },
            {root: container, rootMargin: SCROLLSPY_ROOT_MARGIN, threshold: 0}
        )

        ids.forEach((anchorId) => {
            const element = document.getElementById(anchorId)
            if (element) {
                observer.observe(element)
            }
        })

        container.addEventListener("scroll", pick, {passive: true})

        return () => {
            observer.disconnect()
            container.removeEventListener("scroll", pick)
        }
    }, [container, idsKey])

    return {activeId, setActiveId, lock}
}

//#region: Styled Components

const NavList = styled("ul")(({theme}) => ({
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.5),
    listStyle: "none",
    margin: 0,
    padding: 0,
    // Offset parent for the items, so their offsetLeft can be used to scroll the horizontal variant
    position: "relative",
    [theme.breakpoints.down("md")]: {
        flexDirection: "row",
        overflowX: "auto",
        paddingBottom: theme.spacing(1),
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": {display: "none"},
    },
}))

const NavItem = styled(ButtonBase)(({theme}) => {
    const palette = (theme.vars ?? theme).palette
    return {
        borderRadius: SHEEN_RADIUS,
        color: palette.text.secondary,
        fontFamily: "inherit",
        fontSize: "0.875rem",
        fontWeight: 500,
        justifyContent: "flex-start",
        padding: theme.spacing(1, 1.5, 1, 2.25),
        position: "relative",
        textAlign: "left",
        transition: `color 0.25s ${SHEEN_EASE}, background-color 0.25s ${SHEEN_EASE}`,
        whiteSpace: "nowrap",
        width: "100%",
        "&:hover": {color: palette.text.primary, backgroundColor: getSheen(theme).highlight},
        "&[aria-current]": {color: palette.text.primary, fontWeight: 600, backgroundColor: "transparent"},
        "&.Mui-focusVisible": {boxShadow: glowShadow(theme, 16)},
        [theme.breakpoints.down("md")]: {
            borderRadius: 999,
            padding: theme.spacing(0.75, 1.75),
            width: "auto",
        },
    }
})

// Active indicator. Shared layoutId, so motion glides it between items as the active section changes.
const NavPill = styled(motion.span)(({theme}) => {
    const sheen = getSheen(theme)
    const border = gradientBorder(theme, SHEEN_RADIUS, 1, 0.85)
    return {
        ...border,
        backgroundColor: sheen.tint,
        borderRadius: SHEEN_RADIUS,
        boxShadow: `0 0 22px -8px ${sheen.glow}`,
        inset: 0,
        pointerEvents: "none",
        position: "absolute",
        zIndex: 0,
        // Gradient accent bar at the leading edge
        "&::after": {
            content: '""',
            position: "absolute",
            left: 7,
            top: "28%",
            bottom: "28%",
            width: 3,
            borderRadius: 3,
            backgroundImage: sheenGradient(theme, 180),
            boxShadow: `0 0 8px ${sheen.glow}`,
        },
        [theme.breakpoints.down("md")]: {
            borderRadius: 999,
            "&::before": {...border["&::before"], borderRadius: 999},
            "&::after": {display: "none"},
        },
    }
})

//#endregion: Styled Components

export const SettingsNavLayout: FC<SettingsNavLayoutProps> = ({after, id, sections}) => {
    const [container, setContainer] = useState<HTMLElement | null>(null)
    // Stable ref for motion's viewport root (a fresh object each render would restart its observers)
    const containerRef = useRef<HTMLElement | null>(null)
    const attachContainer = useCallback((element: HTMLElement | null) => {
        containerRef.current = element
        setContainer(element)
    }, [])
    const navListRef = useRef<HTMLUListElement>(null)
    const prefersReducedMotion = useReducedMotion()

    const anchorIds = sections.map((section) => getSectionAnchorId(id, section.key))
    const {activeId, setActiveId, lock} = useScrollSpy(container, anchorIds)

    // Section reveal relies on IntersectionObserver (via motion's whileInView); skip it where that's unavailable
    const animateSections = !prefersReducedMotion && typeof IntersectionObserver !== "undefined"

    // In the horizontal (narrow screen) nav, keep the active chip in view
    useEffect(() => {
        const list = navListRef.current
        if (!list || list.scrollWidth <= list.clientWidth || !activeId) {
            return
        }
        const item = [...list.querySelectorAll<HTMLElement>("[data-anchor]")].find(
            (element) => element.dataset["anchor"] === activeId
        )
        if (item) {
            list.scrollTo?.({left: item.offsetLeft - 16, behavior: prefersReducedMotion ? "auto" : "smooth"})
        }
    }, [activeId, prefersReducedMotion])

    const handleNavClick = (anchorId: string) => {
        const target = document.getElementById(anchorId)
        if (!target) {
            return
        }

        setActiveId(anchorId)
        lock()
        target.scrollIntoView?.({behavior: prefersReducedMotion ? "auto" : "smooth", block: "start"})
        // Move focus along so keyboard users continue from the chosen section
        target.focus({preventScroll: true})
    }

    return (
        <Box
            sx={{
                display: "flex",
                flex: 1,
                flexDirection: {xs: "column", md: "row"},
                gap: {xs: 1, md: 3},
                minHeight: 0,
                minWidth: 0,
            }}
        >
            <Box
                aria-label="Settings sections"
                component="nav"
                id={`${id}-nav`}
                sx={(theme) => ({
                    flexShrink: 0,
                    [theme.breakpoints.up("md")]: {
                        borderRight: `1px solid ${getSheen(theme).glassBorder}`,
                        paddingRight: theme.spacing(2),
                        paddingTop: theme.spacing(0.5),
                        width: 196,
                    },
                })}
            >
                <LayoutGroup id={`${id}-nav`}>
                    <NavList ref={navListRef}>
                        {sections.map((section) => {
                            const anchorId = getSectionAnchorId(id, section.key)
                            const isActive = anchorId === activeId
                            return (
                                <li key={section.key}>
                                    <NavItem
                                        aria-controls={anchorId}
                                        aria-current={isActive ? "location" : undefined}
                                        data-anchor={anchorId}
                                        disableRipple={true}
                                        id={`${id}-nav-${section.key}`}
                                        onClick={() => handleNavClick(anchorId)}
                                    >
                                        {isActive ? (
                                            <NavPill
                                                layoutId={`${id}-nav-pill`}
                                                transition={
                                                    prefersReducedMotion
                                                        ? {duration: 0}
                                                        : {type: "spring", stiffness: 520, damping: 42, mass: 0.9}
                                                }
                                            />
                                        ) : null}
                                        <Box
                                            component="span"
                                            sx={{position: "relative", zIndex: 1}}
                                        >
                                            {section.label}
                                        </Box>
                                    </NavItem>
                                </li>
                            )
                        })}
                    </NavList>
                </LayoutGroup>
            </Box>
            <Box
                id={`${id}-sections`}
                ref={attachContainer}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    minWidth: 0,
                    overflowY: "auto",
                    overscrollBehavior: "contain",
                    paddingRight: 1,
                    paddingTop: 0.5,
                }}
            >
                {sections.map((section) => (
                    <motion.section
                        aria-label={section.label}
                        id={getSectionAnchorId(id, section.key)}
                        initial={animateSections ? {opacity: 0, y: 18} : false}
                        key={section.key}
                        style={{outline: "none", scrollMarginTop: 4}}
                        tabIndex={-1}
                        transition={{duration: 0.55, ease: SHEEN_EASE_BEZIER}}
                        viewport={{amount: 0.08, once: true, root: containerRef}}
                        whileInView={animateSections ? {opacity: 1, y: 0} : undefined}
                    >
                        {section.content}
                    </motion.section>
                ))}
                {after}
            </Box>
        </Box>
    )
}
