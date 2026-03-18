"use client";

import * as React from "react";

interface ThemeProviderProps {
    children: React.ReactNode;
    attribute?: string;
    defaultTheme?: string;
    enableSystem?: boolean;
    disableTransitionOnChange?: boolean;
}

export function ThemeProvider({
    children,
    attribute = "class",
    defaultTheme = "light",
    ...props
}: ThemeProviderProps) {
    const [theme, setTheme] = React.useState<string>(defaultTheme);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem("tu-turno-theme") || defaultTheme;
        setTheme(stored);
        document.documentElement.classList.toggle("dark", stored === "dark");
    }, [defaultTheme]);

    const toggleTheme = React.useCallback(() => {
        setTheme((prev) => {
            const next = prev === "dark" ? "light" : "dark";
            localStorage.setItem("tu-turno-theme", next);
            document.documentElement.classList.toggle("dark", next === "dark");
            return next;
        });
    }, []);

    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

interface ThemeContextType {
    theme: string;
    setTheme: (theme: string) => void;
    toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextType>({
    theme: "light",
    setTheme: () => { },
    toggleTheme: () => { },
});

export const useTheme = () => React.useContext(ThemeContext);
