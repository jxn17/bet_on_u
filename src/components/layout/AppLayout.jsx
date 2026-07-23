import db from '@/api/db';

import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Home, Plus, User, LogOut, Coins, Sun, Moon } from "lucide-react";

import { useDarkMode } from "@/lib/useDarkMode";

export default function AppLayout() {
  const location = useLocation();
  const [dark, setDark] = useDarkMode();
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    db.wallet.get().then(w => setBalance(w.balance)).catch(() => {});
  }, [location.pathname]);

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/create-room", icon: Plus, label: "New" },
    { path: "/profile", icon: User, label: "You" },
  ];

  return (
    <div className="min-h-screen bg-paper">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b-2 border-ink bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center bg-acid">
              <span className="font-mono text-sm font-bold text-night">BU</span>
            </div>
            <span className="font-display text-lg font-black uppercase tracking-tight">Bet on U</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map(item => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 border-2 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                    active ? "border-ink bg-acid text-night" : "border-transparent text-ink/55 hover:text-ink"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {balance !== null && (
              <span className="flex h-9 items-center gap-1.5 border-2 border-ink bg-acid px-3 font-mono text-sm font-bold text-night">
                <Coins className="h-4 w-4" /> {balance}
              </span>
            )}
            <button
              onClick={() => setDark(d => !d)}
              aria-label="Toggle theme"
              className="grid h-9 w-9 place-items-center border-2 border-ink text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => db.auth.logout("/")}
              aria-label="Log out"
              className="grid h-9 w-9 place-items-center border-2 border-ink text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-6 sm:pb-10">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-ink bg-paper sm:hidden">
        <div className="flex items-center justify-around">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                  active ? "bg-acid text-night" : "text-ink/50"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
