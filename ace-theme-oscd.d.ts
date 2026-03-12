type AceDefine = (id: string, deps: string[], factory: (require: unknown, exports: {
    isDark: boolean;
    cssClass: string;
    cssText: string;
}, module: unknown) => void) => void;
type AceTheme = {
    caption: string;
    theme: string;
    isDark: boolean;
    name: string;
};
type AceThemeListModule = {
    themes: AceTheme[];
    themesByName: Record<string, AceTheme>;
};
type AceRequire = (moduleId: string) => unknown;
type AceWindow = {
    ace: {
        define: AceDefine;
        require?: AceRequire;
    };
};
declare const ace: {
    define: AceDefine;
    require?: AceRequire;
};
declare const OPENSCD_THEME_BRIGHT: AceTheme;
declare const OPENSCD_THEME_DARK: AceTheme;
declare const aceDefine: AceDefine;
declare function registerThemeInSettingsMenu(): void;
