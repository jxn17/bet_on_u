import db from '@/api/db';

import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Home, Plus, User, LogOut, Sun, Moon, Coins } from "lucide-react";

import { useDarkMode } from "@/lib/useDarkMode";

export default function AppLayout() {
  const location = useLocation();
  const [dark, setDark] = useDarkMode();
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    db.wallet.get().then(w => setBalance(w.balance)).catch(() => {});
  }, [location.pathname]);

  const navItems = [
    { path: "/", icon: Home, label: "Dashboard" },
    { path: "/create-room", icon: Plus, label: "New Room" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">BI</span>
            </div>
            <span className="font-heading font-bold text-lg tracking-tight text-slate-900 dark:text-white">Bet It</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === item.path
                    ? "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            {balance !== null && (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/30 rounded-full px-3 py-1.5 mr-1">
                <Coins className="w-4 h-4" /> {balance}
              </span>
            )}
            <button
              onClick={() => setDark(d => !d)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => db.auth.logout("/")}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-around py-2">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all ${
                location.pathname === item.path
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}