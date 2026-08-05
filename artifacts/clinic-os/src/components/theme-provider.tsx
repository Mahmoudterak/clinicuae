import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    const savedTheme = localStorage.getItem("clinic-os-theme") as "light" | "dark" | null
    if (savedTheme) {
      setTheme(savedTheme)
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark")
    }
  }, [])

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
    localStorage.setItem("clinic-os-theme", theme)
  }, [theme])

  return (
    <div className="contents">
      {children}
    </div>
  )
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark")
    setTheme(isDark ? "dark" : "light")
  }, [])

  const toggle = () => {
    const nextTheme = theme === "light" ? "dark" : "light"
    setTheme(nextTheme)
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(nextTheme)
    localStorage.setItem("clinic-os-theme", nextTheme)
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
      title="Toggle theme"
    >
      {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  )
}
