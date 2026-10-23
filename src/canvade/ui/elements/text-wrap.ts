/**
 * Splits a text into lines: at its line breaks, then, when a maximum width is given, between
 * words so that each line fits in it. A word wider than the maximum width is split between
 * characters. The spaces where a line is wrapped are dropped.
 *
 * @param maxWidth - Maximum width of a line, `null` to only split at the line breaks.
 * @param measure - Width of a piece of text, in the unit of `maxWidth`.
 */
export function wrapText(
    text: string,
    maxWidth: number | null,
    measure: (text: string) => number,
): string[] {
    const paragraphs = text.split(/\r?\n/);
    if (maxWidth === null) {
        return paragraphs;
    }

    return paragraphs.flatMap((paragraph) => wrapParagraph(paragraph, maxWidth, measure));
}

function wrapParagraph(
    paragraph: string,
    maxWidth: number,
    measure: (text: string) => number,
): string[] {
    const lines: string[] = [];
    let line = '';

    for (const word of paragraph.split(' ')) {
        const candidate = line ? `${line} ${word}` : word;
        if (measure(candidate) <= maxWidth) {
            line = candidate;
            continue;
        }

        if (line) {
            lines.push(line);
        }
        // A word too wide on its own line is split between characters
        line = '';
        for (const character of word) {
            if (line && measure(line + character) > maxWidth) {
                lines.push(line);
                line = '';
            }
            line += character;
        }
    }

    lines.push(line);
    return lines;
}
