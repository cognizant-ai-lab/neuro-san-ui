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

import {renderHook} from "@testing-library/react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {DEFAULT_USER_IMAGE, DEFAULT_USERNAME} from "../../../const"
import {useEnvironmentStore} from "../../../state/Environment"
import {useAuthentication} from "../../../utils/Authentication"
import {
    getSessionAdapter,
    resetSessionAdapter,
    type Session,
    type SessionUser,
    setSessionAdapter,
} from "../../../utils/SessionAdapter"

describe("SessionAdapter", () => {
    withStrictMocks()

    beforeEach(() => {
        resetSessionAdapter()
    })

    describe("when no adapter has been registered", () => {
        it("fails loudly on signIn, rather than silently doing nothing", () => {
            expect(() => getSessionAdapter().signIn("auth0")).toThrow(/no session adapter/iu)
        })

        it("fails loudly on signOut, rather than silently doing nothing", () => {
            expect(() => getSessionAdapter().signOut()).toThrow(/no session adapter/iu)
        })

        it("reports that no session is available, so apps without a login still render", () => {
            const session: Session = getSessionAdapter().useSession()
            const user: SessionUser | undefined = session.data?.user
            expect(session.data).toBeUndefined()
            expect(user).toBeUndefined()
        })

        it("reports unauthenticated, so apps without a login still render", () => {
            expect(getSessionAdapter().useSessionStatus()).toBe("unauthenticated")
        })
    })

    describe("useAuthentication with authentication disabled", () => {
        it("returns the default user without consulting the adapter", () => {
            // An adapter that would blow up if it were ever consulted
            setSessionAdapter({
                useSession: () => {
                    throw new Error("the adapter must not be consulted when authentication is disabled")
                },
                useSessionStatus: () => {
                    throw new Error("the adapter must not be consulted when authentication is disabled")
                },
                signIn: () => undefined,
                signOut: () => undefined,
            })

            useEnvironmentStore.getState().setEnableAuthentication(false)

            const {result} = renderHook(() => useAuthentication())

            expect(result.current.data.user.name).toBe(DEFAULT_USERNAME)
            expect(result.current.data.user.image).toBe(DEFAULT_USER_IMAGE)
        })
    })
})
