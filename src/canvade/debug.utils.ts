/** Verbosity levels of {@link DebugUtils}, each level including the lower ones. */
export enum DebugLevel {
    NONE = 0,
    ERROR = 1,
    WARNING = 2,
    MESSAGE = 3,
    DEBUG = 4,
    TRACE = 5,
}

/**
 * Global console logger filtered by a {@link DebugLevel}.
 *
 * A message is logged only when its level is lower than or equal to the current debug level,
 * which is {@link DebugLevel.NONE} until {@link DebugUtils.setDebugLevel} is called. The
 * `Game` constructor sets it from its `debugLevel` option.
 */
export abstract class DebugUtils {
    private static debugLevel: DebugLevel = DebugLevel.NONE;

    public static error(...messages: unknown[]) {
        this.log(DebugLevel.ERROR, ...messages);
    }

    public static warning(...messages: unknown[]) {
        this.log(DebugLevel.WARNING, ...messages);
    }

    public static message(...messages: unknown[]) {
        this.log(DebugLevel.MESSAGE, ...messages);
    }

    public static debug(...messages: unknown[]) {
        this.log(DebugLevel.DEBUG, ...messages);
    }

    public static trace(...messages: unknown[]) {
        this.log(DebugLevel.TRACE, ...messages);
    }

    private static log(debugLevel: DebugLevel, ...messages: unknown[]) {
        if (this.debugLevel >= debugLevel) {
            switch (debugLevel) {
                case DebugLevel.ERROR:
                    console.error(...messages);
                    break;
                case DebugLevel.WARNING:
                    console.warn(...messages);
                    break;
                default:
                    console.log(...messages);
            }
        }
    }

    /** Sets the debug level, which is global: it is shared by every game of the page. */
    public static setDebugLevel(debugLevel: DebugLevel) {
        this.debugLevel = debugLevel;
    }
}
