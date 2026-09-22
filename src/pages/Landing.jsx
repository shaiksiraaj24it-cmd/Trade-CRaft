import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import {
  TrendingUp, BookOpen, ListChecks, LineChart, ShieldCheck,
  ArrowRight, GraduationCap, BarChart3, Wallet, Sparkles
} from "lucide-react";

const features = [
  { icon: BookOpen, title: "Structured Courses", desc: "Beginner to advanced lessons that take you from zero to confident investor." },
  { icon: ListChecks, title: "Quizzes & Tracking", desc: "Test yourself after each module and watch your progress fill up as you learn." },
  { icon: LineChart, title: "Stock Explorer", desc: "Browse real company data — price, sector, P/E and market cap — in one clean view." },
  { icon: ShieldCheck, title: "Admin Managed", desc: "Curated content maintained by admins so the library stays fresh and accurate." },
];

const steps = [
  { icon: GraduationCap, title: "Learn", desc: "Read bite-sized lessons across curated courses." },
  { icon: BarChart3, title: "Practice", desc: "Take quizzes and explore live stock data." },
  { icon: Wallet, title: "Track", desc: "Monitor completion and quiz scores over time." },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [loadingStocks, setLoadingStocks] = useState(true);

  React.useEffect(() => {
    api.entities.Stock.list("-price", 3)
      .then(setStocks)
      .catch(() => setStocks([]))
      .finally(() => setLoadingStocks(false));
  }, []);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white">
              <img src="/tradecraftlogo.png" alt="Trade Craft logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Trade Craft</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link to="/login">Log in</Link></Button>
            <Button asChild><Link to="/register">Get started</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50/60 via-background to-background" />
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Learn the stock market the smart way
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Master the markets,
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent"> one lesson at a time.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            A guided learning platform that teaches you how stocks work, lets you quiz yourself,
            and tracks your progress — all backed by a curated library of real company data.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild className="h-12 px-8 text-base">
              <Link to="/register">Start learning free <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
              <Link to="/login">I already have an account</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">No credit card required · Sign up in seconds</p>
        </div>

        {/* Live stock preview */}
        <div className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Live from the library</span>
              <span className="text-xs text-muted-foreground">{loadingStocks ? "Loading…" : `${stocks.length} featured stocks`}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {stocks.map((s) => {
                const up = (s.price || 0) >= (s.previous_price || 0);
                return (
                  <div key={s.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{s.symbol}</span>
                      <span className={`text-xs font-medium ${up ? "text-emerald-600" : "text-rose-500"}`}>
                        {up ? "▲" : "▼"} ₹{s.price}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{s.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to learn investing</h2>
          <p className="mt-3 text-muted-foreground">A complete toolkit for beginners and curious minds.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="mb-1 text-xs font-semibold text-emerald-600">STEP {i + 1}</div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground sm:px-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to start your investing journey?</h2>
          <p className="mx-auto mt-3 max-w-md text-primary-foreground/80">Join StockMaster today and learn at your own pace.</p>
          <Button size="lg" variant="secondary" asChild className="mt-8 h-12 px-8 text-base">
            <Link to="/register">Create your free account <ArrowRight className="ml-2 w-4 h-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="w-4 h-4" /> StockMaster
          </div>
          <p className="text-xs text-muted-foreground">Educational content only · Not financial advice</p>
        </div>
      </footer>
    </div>
  );
}