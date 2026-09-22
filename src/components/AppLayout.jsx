import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  LayoutDashboard, BookOpen, TrendingUp, Shield, Users, GraduationCap,
  ListChecks, LogOut, Menu, ChevronRight, LineChart
} from "lucide-react";
import { cn } from "@/lib/utils";

const userNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/courses", label: "Courses", icon: BookOpen },
  { to: "/stocks", label: "Stock Explorer", icon: TrendingUp },
];

const adminNav = [
  { to: "/admin", label: "Overview", icon: Shield },
  { to: "/admin/courses", label: "Courses & Lessons", icon: GraduationCap },
  { to: "/admin/quizzes", label: "Quizzes", icon: ListChecks },
  { to: "/admin/stocks", label: "Stocks", icon: LineChart },
  { to: "/admin/users", label: "Users", icon: Users },
];

function NavLinks({ onNavigate }) {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const renderGroup = (items) =>
    items.map(({ to, label, icon: Icon }) => {
      const active = location.pathname === to;
      return (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
            active
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Icon className="w-4 h-4 shrink-0" />
          {label}
          {active && <ChevronRight className="w-4 h-4 ml-auto" />}
        </Link>
      );
    });

  return (
    <nav className="flex flex-col gap-1">
      {renderGroup(userNav)}
      {isAdmin && (
        <>
          <div className="mt-6 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Admin
          </div>
          {renderGroup(adminNav)}
        </>
      )}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 px-2">
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white">
        <img src="/tradecraftlogo.png" alt="Trade Craft logo" className="h-full w-full object-contain" />
      </div>
      <div className="leading-tight">
        <div className="text-base font-semibold tracking-tight">Trade Craft</div>
        <div className="text-[11px] text-muted-foreground">Learn · Track · Invest</div>
      </div>
    </Link>
  );
}

function UserCard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div className="mt-auto space-y-3">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
          {(user.full_name || user.email || "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{user.full_name || "Learner"}</div>
          <div className="truncate text-xs text-muted-foreground">{user.email}</div>
        </div>
        {user.role === "admin" && (
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            ADMIN
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        className="w-full justify-start text-muted-foreground hover:text-foreground"
        onClick={() => logout()}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Log out
      </Button>
    </div>
  );
}

export default function AppLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card p-4 lg:flex">
        <div className="mb-6"><Brand /></div>
        <div className="flex-1 overflow-y-auto"><NavLinks /></div>
        <UserCard />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur lg:hidden">
        <Brand />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"><Menu className="w-5 h-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-4">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="mb-6"><Brand /></div>
            <div className="flex h-[calc(100%-5rem)] flex-col">
              <div className="flex-1 overflow-y-auto"><NavLinks onNavigate={() => setOpen(false)} /></div>
              <UserCard />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}