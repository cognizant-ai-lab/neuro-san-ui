// Include mock for IndexedDB
import "fake-indexeddb/auto"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {MAX_SUGGESTIONS, useIconSuggestionsStore} from "../../../state/IconSuggestions"

describe("IconSuggestions", () => {
    withStrictMocks()

    it("should evict from the cache when the limit is reached", async () => {
        useIconSuggestionsStore
            .getState()
            .setAgentIconSuggestions(
                Object.fromEntries(Array.from({length: MAX_SUGGESTIONS}, (_, i) => [`agent${i}`, `icon${i}`]))
            )

        const suggestions = useIconSuggestionsStore.getState().agentIconSuggestions

        // Make sure first and last item are in the cache
        expect(suggestions["agent0"]).toBe("icon0")
        expect(suggestions[`agent${MAX_SUGGESTIONS - 1}`]).toBe(`icon${MAX_SUGGESTIONS - 1}`)

        // Now add a new item that exceeds the cache limit
        useIconSuggestionsStore
            .getState()
            .setAgentIconSuggestions({[`agent${MAX_SUGGESTIONS}`]: `icon${MAX_SUGGESTIONS}`})

        const newSuggestions = useIconSuggestionsStore.getState().agentIconSuggestions

        // First item should be evicted
        expect(newSuggestions["agent0"]).toBeUndefined()

        // Last item should be present
        expect(newSuggestions[`agent${MAX_SUGGESTIONS}`]).toBe(`icon${MAX_SUGGESTIONS}`)
    })
})
