import {render, screen} from "@testing-library/react"
import {UserEvent, userEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {useCheckmarkFade} from "../../../components/Settings/FadingCheckmark"
import {SettingsRow} from "../../../components/Settings/SettingsRow"

describe("SettingsRow", () => {
    withStrictMocks()

    it("Renders correctly", async () => {
        const labelText = "Test Label"
        const childrenText = "Test Children"
        const checkmark: ReturnType<typeof useCheckmarkFade> = {
            show: true,
            trigger: jest.fn(),
        }
        const tooltip = "Test Tooltip"

        render(
            <SettingsRow
                checkmark={checkmark}
                label={labelText}
                tooltip={tooltip}
            >
                {childrenText}
            </SettingsRow>
        )

        expect(screen.getByText(labelText)).toBeInTheDocument()
        expect(screen.getByText(childrenText)).toBeInTheDocument()

        // Checkmark should be shown
        screen.getByTestId("CheckIcon")

        // Mouse over ⓘ to show tooltip
        const user: UserEvent = userEvent.setup()
        const infoIcon = screen.getByTestId("InfoOutlinedIcon")
        await user.hover(infoIcon)

        await screen.findByText(tooltip)
    })

    it("Handles missing values", async () => {
        render(
            <SettingsRow
                disabled={true}
                label=""
                tooltip="Test Tooltip"
            >
                null
            </SettingsRow>
        )

        const user: UserEvent = userEvent.setup()

        // Mouse over ⓘ to show tooltip
        const infoIcon = screen.getByTestId("InfoOutlinedIcon")
        await user.hover(infoIcon)
    })

    it.each([{backgroundColor: "red"}, [{backgroundColor: "red"}]])("Handles SX value: %o", async (sx) => {
        const {container} = render(
            <SettingsRow
                label="Test Label"
                sx={sx}
                tooltip="Test Tooltip"
            >
                Test Children
            </SettingsRow>
        )

        expect(container.firstElementChild).toHaveStyle({backgroundColor: "rgb(255, 0, 0)"})
    })
})
