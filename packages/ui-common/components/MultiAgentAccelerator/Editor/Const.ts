// When to first ask whether the user wants to keep waiting for a network edit.
export const INITIAL_WAIT_REMINDER_MS = 3 * 60 * 1000

// How often to ask again after the user chooses to continue waiting.
export const REPEATED_WAIT_REMINDER_MS = 60 * 1000

// How long the dock's status banner stays visible before auto-dismissing. Error banners persist until dismissed.
// Exported for tests.
export const BANNER_AUTO_DISMISS_MS = 5_000
