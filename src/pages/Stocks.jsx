import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, TrendingDown } from "lucide-react";

export default function Stocks() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("All");

  useEffect(() => {
    api.entities.Stock.list("symbol")
      .then(setStocks)
      .finally(() => setLoading(false));
  }, []);

  const sectors = useMemo(() => {
    const s = new Set(stocks.map((x) => x.sector).filter(Boolean));
    return ["All", ...Array.from(s)];
  }, [stocks]);

  const filtered = stocks.filter((s) => {
    const matchesQuery = !query ||
      s.symbol?.toLowerCase().includes(query.toLowerCase()) ||
      s.name?.toLowerCase().includes(query.toLowerCase());
    const matchesSector = sector === "All" || s.sector === sector;
    return matchesQuery && matchesSector;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stock Explorer</h1>
        <p className="mt-1 text-muted-foreground">Browse company data curated by admins. Educational reference only.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by symbol or name…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {sectors.map((s) => (
            <button
              key={s}
              onClick={() => setSector(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${sector === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Loading stocks…</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">No stocks match your search.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const up = (s.price || 0) >= (s.previous_price || 0);
            const change = (s.price || 0) - (s.previous_price || 0);
            const changePct = s.previous_price ? ((change / s.previous_price) * 100).toFixed(2) : "0.00";
            return (
              <Card key={s.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-lg font-bold">{s.symbol}</div>
                      <div className="text-xs text-muted-foreground">{s.name}</div>
                    </div>
                    <Badge variant="secondary" className="font-normal">{s.sector}</Badge>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-semibold">₹{s.price}</div>
                      <div className={`flex items-center gap-1 text-xs font-medium ${up ? "text-emerald-600" : "text-rose-500"}`}>
                        {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {up ? "+" : ""}{change.toFixed(2)} ({changePct}%)
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>P/E: <span className="font-medium text-foreground">{s.pe ?? "—"}</span></div>
                      <div>Div: <span className="font-medium text-foreground">{s.dividend || "—"}</span></div>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-border pt-3">
                    <div className="text-xs text-muted-foreground">Market Cap: <span className="font-medium text-foreground">{s.market_cap || "—"}</span></div>
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}