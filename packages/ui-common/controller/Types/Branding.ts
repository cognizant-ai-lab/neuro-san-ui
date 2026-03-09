/**
 * Items returned by the branding API.
 */
export type BrandingSuggestions = {
    readonly primary: string
    readonly secondary: string
    readonly background: string
    readonly plasma: string
    readonly nodeColor: string
    readonly rangePalette: string[]
    readonly iconSuggestion: string
}
