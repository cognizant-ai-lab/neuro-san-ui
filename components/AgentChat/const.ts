// How many times to retry the entire orchestration process
import {HLJS_THEMES} from "./SyntaxHighlighterThemes"

// How many times to retry the entire agent interaction process. Some networks have a well-defined success condition.
// For others it's just "whenever the stream is done".
export const MAX_AGENT_RETRIES = 3

// Highlighter theme. Some day this may come from user prefs but for now make it a const
export const HIGHLIGHTER_THEME = HLJS_THEMES["a11yDark"]
