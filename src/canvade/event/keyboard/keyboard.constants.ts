/** Key codes of the letter keys, e.g. `KeyM`, capturing the letter. */
export const LETTER_CODE_PATTERN = /^Key([A-Z])$/,
    /** Typed keys that are a latin letter, matched against the letter key codes. */
    LATIN_LETTER_PATTERN = /^[a-z]$/i;
