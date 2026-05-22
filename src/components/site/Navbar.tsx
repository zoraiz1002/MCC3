import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Moon, Sun, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const nav = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/teams", label: "Teams" },
  { to: "/tournaments", label: "Tournaments" },
  { to: "/matches", label: "Matches" },
  { to: "/stats", label: "Stats" },
  { to: "/shop", label: "Shop" },
  { to: "/contact", label: "Contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<"EN" | "DE">("EN");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 font-display text-2xl tracking-wide">
          <span className="text-2xl">🏏</span>
          <span>Marburg Cricket Club</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {nav.map((n) => {
            const active = pathname === n.to || (n.to !== "/" && pathname.startsWith(n.to));
            return (
              <Link key={n.to} to={n.to}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-secondary text-secondary-foreground" : "text-foreground/80 hover:bg-muted"
                }`}>
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={() => setLang(lang === "EN" ? "DE" : "EN")}
            className="hidden sm:flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">
            <Globe className="h-3.5 w-3.5" />{lang}
          </button>
          <button onClick={toggleDark} aria-label="Toggle dark mode"
            className="rounded-lg border border-border p-2 hover:bg-muted">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <>
              <Link to="/dashboard" className="hidden sm:inline-block">
                <Button variant="outline" size="sm">Dashboard</Button>
              </Link>
              <Button size="sm" onClick={() => signOut()} className="hidden sm:inline-flex">Sign out</Button>
            </>
          ) : (
            <Link to="/login" className="hidden sm:inline-block">
              <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                Login / Register
              </Button>
            </Link>
          )}

          <button className="lg:hidden rounded-lg border border-border p-2" onClick={() => setOpen(!open)}>
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <div className="space-y-1 px-4 py-3">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
                {n.label}
              </Link>
            ))}
            <div className="pt-2">
              {user ? (
                <Link to="/dashboard"><Button className="w-full">Dashboard</Button></Link>
              ) : (
                <Link to="/login"><Button className="w-full bg-secondary text-secondary-foreground">Login / Register</Button></Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
