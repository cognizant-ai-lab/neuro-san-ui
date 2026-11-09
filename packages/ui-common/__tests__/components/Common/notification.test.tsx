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

import {closeSnackbar, enqueueSnackbar} from "notistack"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {closeNotification, NotificationType, sendNotification} from "../../../components/Common/notification"

vi.mock("notistack", () => ({
    closeSnackbar: vi.fn(),
    enqueueSnackbar: vi.fn(),
}))

describe("notification", () => {
    withStrictMocks()

    beforeEach(() => {
        vi.spyOn(console, "debug").mockImplementation(() => undefined)
    })

    it("closes notifications", () => {
        closeNotification()

        expect(closeSnackbar).toHaveBeenCalledTimes(1)
    })

    it.each([
        {type: NotificationType.success, variant: "success", duration: 5000},
        {type: NotificationType.info, variant: "info", duration: 5000},
        {type: NotificationType.warning, variant: "warning", duration: 15_000},
        {type: NotificationType.error, variant: "error", duration: 15_000},
    ])("sends a $variant notification with duration $duration", ({type, variant, duration}) => {
        sendNotification(type, "A message!", "Some description")

        expect(console.debug).toHaveBeenCalledWith(
            'Notification: Message: "A message!" Description: "Some description"'
        )
        expect(enqueueSnackbar).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                anchorOrigin: {vertical: "top", horizontal: "right"},
                autoHideDuration: duration,
                description: "Some description",
                key: `notification-message-a-message-${variant}`,
                variant,
            })
        )
    })

    it("honours a duration override, placement and JSX description", () => {
        sendNotification(NotificationType.error, "Oops", <b>bold</b>, {vertical: "bottom", horizontal: "left"}, null)

        expect(console.debug).toHaveBeenCalledWith(expect.stringContaining("<b>bold</b>"))
        expect(enqueueSnackbar).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({anchorOrigin: {vertical: "bottom", horizontal: "left"}, autoHideDuration: null})
        )
    })

    it("sends a notification with an empty description by default", () => {
        sendNotification(NotificationType.info, "Brief")

        expect(enqueueSnackbar).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({description: "", variant: "info"})
        )
    })
})
