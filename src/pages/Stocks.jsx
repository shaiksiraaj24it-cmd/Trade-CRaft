import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Wallet,
  RotateCcw,
  LineChart as LineChartIcon,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Layers,
  BarChart2,
  Sliders,
  DollarSign,
  History,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ComposedChart,
  Bar
} from "recharts";
import {
  generatePriceHistory,
  calculateSupportResistance
} from "@/utils/tradingUtils";

export default function Stocks() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("All");
  const [market, setMarket] = useState("All");
  const [activeTab, setActiveTab] = useState("explore");

  // Paper trading state
  const [portfolio, setPortfolio] = useState({ virtual_cash: 100000 });
  const [holdings, setHoldings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Selected stock for chart & trading modal
  const [selectedStock, setSelectedStock] = useState(null);
  const [orderType, setOrderType] = useState("BUY");
  const [orderShares, setOrderShares] = useState("10");
  const [chartType, setChartType] = useState("line"); // 'line' or 'ohlc'
  const [timeframe, setTimeframe] = useState(60); // days
  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showSupportResistance, setShowSupportResistance] = useState(false);
  const [tradeMessage, setTradeMessage] = useState(null);

  // Default sample stocks for offline/demo mode if database is empty or disconnected
  const sampleStocks = [
    { id: "s1", symbol: "RELIANCE", name: "Reliance Industries Ltd", sector: "Energy", market: "NSE/BSE", price: 2950.50, previous_price: 2920.00, market_cap: "19.8 Lakh Cr", pe: 28.4, dividend: "0.35%", description: "India's largest conglomerate in oil, telecom, and retail." },
    { id: "s2", symbol: "TCS", name: "Tata Consultancy Services", sector: "IT", market: "NSE/BSE", price: 4120.00, previous_price: 4150.00, market_cap: "14.9 Lakh Cr", pe: 31.2, dividend: "1.15%", description: "Global IT services, consulting and business solutions leader." },
    { id: "s3", symbol: "AAPL", name: "Apple Inc.", sector: "Technology", market: "NASDAQ", price: 185.20, previous_price: 182.50, market_cap: "$2.8 Trillion", pe: 30.1, dividend: "0.52%", description: "Designs consumer electronics, software, and online services." },
    { id: "s4", symbol: "NVDA", name: "NVIDIA Corp.", sector: "Technology", market: "NASDAQ", price: 128.80, previous_price: 122.10, market_cap: "$3.1 Trillion", pe: 72.5, dividend: "0.08%", description: "Pioneer in GPU design and AI acceleration computing." },
    { id: "s5", symbol: "BTC/INR", name: "Bitcoin", sector: "Crypto", market: "Crypto", price: 5650000.00, previous_price: 5400000.00, market_cap: "110 Lakh Cr", pe: null, dividend: "N/A", description: "Decentralized digital peer-to-peer cryptocurrency." }
  ];

  // Initial load
  const loadStocksAndPortfolio = async () => {
    setLoading(false);
    setStocks(sampleStocks);

    api.entities.Stock.list("symbol")
      .then((stockList) => {
        if (stockList && stockList.length > 0) setStocks(stockList);
      })
      .catch(() => {});

    api.trading.getOrCreatePortfolio().then((p) => p && setPortfolio(p)).catch(() => {});
    api.trading.getHoldings().then((h) => h && setHoldings(h)).catch(() => {});
    api.trading.getTransactions().then((t) => t && setTransactions(t)).catch(() => {});
  };

  useEffect(() => {
    loadStocksAndPortfolio();
  }, []);

  const refreshPortfolio = async () => {
    try {
      const portData = await api.trading.getOrCreatePortfolio();
      setPortfolio(portData);
      const hData = await api.trading.getHoldings();
      setHoldings(hData);
      const txData = await api.trading.getTransactions();
      setTransactions(txData);
    } catch (err) {
      console.error("Failed to refresh portfolio", err);
    }
  };

  // Portfolio calculations
  const portfolioValuation = useMemo(() => {
    const cash = Number(portfolio.virtual_cash || 0);
    let totalStockValue = 0;
    let totalCostBasis = 0;

    const holdingsDetailed = holdings.map((h) => {
      const matchedStock = stocks.find((s) => s.id === h.stock_id || s.symbol === h.symbol);
      const currentPrice = matchedStock ? Number(matchedStock.price || 0) : Number(h.average_buy_price);
      const currentValue = Number(h.shares) * currentPrice;
      const costBasis = Number(h.shares) * Number(h.average_buy_price);
      const pnl = currentValue - costBasis;
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

      totalStockValue += currentValue;
      totalCostBasis += costBasis;

      return {
        ...h,
        currentPrice,
        currentValue,
        costBasis,
        pnl,
        pnlPercent,
        stockName: matchedStock ? matchedStock.name : h.symbol
      };
    });

    const totalPortfolioValue = cash + totalStockValue;
    const totalPnl = totalStockValue - totalCostBasis;
    const totalPnlPercent = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;

    return {
      cash,
      totalStockValue,
      totalCostBasis,
      totalPortfolioValue,
      totalPnl,
      totalPnlPercent,
      holdingsDetailed
    };
  }, [portfolio, holdings, stocks]);

  // Markets list
  const markets = useMemo(() => {
    const m = new Set(stocks.map((x) => x.market || "NSE/BSE").filter(Boolean));
    return ["All", ...Array.from(m)];
  }, [stocks]);

  // Sectors list
  const sectors = useMemo(() => {
    const s = new Set(stocks.map((x) => x.sector).filter(Boolean));
    return ["All", ...Array.from(s)];
  }, [stocks]);

  // Filtered stocks list
  const filtered = stocks.filter((s) => {
    const matchesQuery =
      !query ||
      s.symbol?.toLowerCase().includes(query.toLowerCase()) ||
      s.name?.toLowerCase().includes(query.toLowerCase());
    const matchesSector = sector === "All" || s.sector === sector;
    const matchesMarket = market === "All" || (s.market || "NSE/BSE") === market;
    return matchesQuery && matchesSector && matchesMarket;
  });

  // Generated price history for selected stock
  const priceHistory = useMemo(() => {
    if (!selectedStock) return [];
    return generatePriceHistory(selectedStock.symbol, selectedStock.price || 100, timeframe);
  }, [selectedStock, timeframe]);

  // Support and resistance levels
  const srLevels = useMemo(() => {
    return calculateSupportResistance(priceHistory);
  }, [priceHistory]);

  // Current stock owned shares
  const selectedStockHolding = useMemo(() => {
    if (!selectedStock) return null;
    return holdings.find((h) => h.stock_id === selectedStock.id || h.symbol === selectedStock.symbol);
  }, [selectedStock, holdings]);

  const openTradeModal = (stock, defaultType = "BUY") => {
    setSelectedStock(stock);
    setOrderType(defaultType);
    setOrderShares("10");
    setTradeMessage(null);
  };

  const handleExecuteTrade = async () => {
    if (!selectedStock) return;
    setTradeLoading(true);
    setTradeMessage(null);

    try {
      await api.trading.executeTrade({
        stockId: selectedStock.id,
        symbol: selectedStock.symbol,
        type: orderType,
        shares: orderShares,
        price: selectedStock.price || 100
      });

      setTradeMessage({
        type: "success",
        text: `Successfully ${orderType === "BUY" ? "bought" : "sold"} ${orderShares} shares of ${selectedStock.symbol}!`
      });

      await refreshPortfolio();
    } catch (err) {
      setTradeMessage({
        type: "error",
        text: err.message || "Trade execution failed."
      });
    } finally {
      setTradeLoading(false);
    }
  };

  const handleResetPortfolio = async () => {
    setTradeLoading(true);
    try {
      await api.trading.resetPortfolio();
      await refreshPortfolio();
      setResetConfirmOpen(false);
    } catch (err) {
      alert("Failed to reset portfolio: " + err.message);
    } finally {
      setTradeLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header & Portfolio Summary Banner */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Explorer & Demo Trading</h1>
          <p className="mt-1 text-muted-foreground">
            Practice paper trading with virtual cash, real-time interactive charts, technical indicators, and multi-market assets.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setResetConfirmOpen(true)} className="self-start lg:self-auto text-muted-foreground hover:text-foreground">
          <RotateCcw className="mr-2 w-4 h-4" /> Reset Virtual Cash
        </Button>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Virtual Cash Balance</span>
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-bold">
              ₹{portfolioValuation.cash.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Available for buying stocks</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Invested Value</span>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-bold">
              ₹{portfolioValuation.totalStockValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">In {holdings.length} open position{holdings.length === 1 ? "" : "s"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Total Portfolio Value</span>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-bold">
              ₹{portfolioValuation.totalPortfolioValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Cash + Invested Stocks</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Unrealized P&L</span>
              {portfolioValuation.totalPnl >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-500" />
              )}
            </div>
            <div className={`mt-2 text-2xl font-bold ${portfolioValuation.totalPnl >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
              {portfolioValuation.totalPnl >= 0 ? "+" : ""}₹{portfolioValuation.totalPnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className={`mt-1 text-xs font-medium ${portfolioValuation.totalPnl >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
              {portfolioValuation.totalPnl >= 0 ? "+" : ""}{portfolioValuation.totalPnlPercent.toFixed(2)}% total return
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs: Explore, Portfolio, History */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="explore" className="flex items-center gap-2">
            <Globe className="w-4 h-4" /> Market Explorer
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="flex items-center gap-2">
            <Wallet className="w-4 h-4" /> My Holdings ({holdings.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" /> Trade History
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: MARKET EXPLORER */}
        <TabsContent value="explore" className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search symbol, company name..."
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground mr-1">Market:</span>
              {markets.map((m) => (
                <button
                  key={m}
                  onClick={() => setMarket(m)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    market === m
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Sector Tags */}
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span className="font-medium text-muted-foreground mr-1">Sectors:</span>
            {sectors.map((s) => (
              <button
                key={s}
                onClick={() => setSector(s)}
                className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                  sector === s
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Stocks Grid */}
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">Loading stocks data...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">No stocks found matching your criteria.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((s) => {
                const up = (s.price || 0) >= (s.previous_price || 0);
                const change = (s.price || 0) - (s.previous_price || 0);
                const changePct = s.previous_price ? ((change / s.previous_price) * 100).toFixed(2) : "0.00";
                const owned = holdings.find((h) => h.stock_id === s.id || h.symbol === s.symbol);

                return (
                  <Card key={s.id} className="group relative flex flex-col justify-between transition-all hover:shadow-md hover:border-primary/40">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold tracking-tight">{s.symbol}</span>
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider py-0 px-1.5 font-semibold">
                              {s.market || "NSE/BSE"}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{s.name}</div>
                        </div>
                        <Badge variant="secondary" className="font-normal text-xs">{s.sector || "Equity"}</Badge>
                      </div>

                      <div className="mt-4 flex items-end justify-between">
                        <div>
                          <div className="text-2xl font-bold tracking-tight">₹{s.price || "—"}</div>
                          <div className={`flex items-center gap-1 text-xs font-semibold ${up ? "text-emerald-600" : "text-rose-500"}`}>
                            {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {up ? "+" : ""}{change.toFixed(2)} ({changePct}%)
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>P/E: <span className="font-medium text-foreground">{s.pe ?? "—"}</span></div>
                          <div>Div: <span className="font-medium text-foreground">{s.dividend || "—"}</span></div>
                        </div>
                      </div>

                      {owned && (
                        <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-primary font-medium">
                          <span>Owned: {owned.shares} shares</span>
                          <span>Avg: ₹{Number(owned.average_buy_price).toFixed(2)}</span>
                        </div>
                      )}

                      <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                    </CardContent>

                    <div className="border-t border-border p-3 bg-muted/30 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => openTradeModal(s, "BUY")}
                      >
                        <BarChart2 className="w-3.5 h-3.5 mr-1.5" /> Chart & Trade
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs"
                        onClick={() => openTradeModal(s, "BUY")}
                      >
                        Buy
                      </Button>
                      {owned && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs"
                          onClick={() => openTradeModal(s, "SELL")}
                        >
                          Sell
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: MY HOLDINGS */}
        <TabsContent value="portfolio" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" /> Active Paper Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {portfolioValuation.holdingsDetailed.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  You don't own any stock positions yet. Explore the market to buy demo stocks.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                      <tr>
                        <th className="p-4">Stock</th>
                        <th className="p-4 text-right">Shares</th>
                        <th className="p-4 text-right">Avg Buy Price</th>
                        <th className="p-4 text-right">Current Price</th>
                        <th className="p-4 text-right">Current Value</th>
                        <th className="p-4 text-right">Unrealized P&L</th>
                        <th className="p-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {portfolioValuation.holdingsDetailed.map((item) => {
                        const isUp = item.pnl >= 0;
                        const matchedStock = stocks.find((s) => s.id === item.stock_id || s.symbol === item.symbol);
                        return (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-4 font-semibold">
                              <div>{item.symbol}</div>
                              <div className="text-xs text-muted-foreground font-normal">{item.stockName}</div>
                            </td>
                            <td className="p-4 text-right font-medium">{item.shares}</td>
                            <td className="p-4 text-right text-muted-foreground">₹{Number(item.average_buy_price).toFixed(2)}</td>
                            <td className="p-4 text-right font-medium">₹{item.currentPrice.toFixed(2)}</td>
                            <td className="p-4 text-right font-semibold">₹{item.currentValue.toFixed(2)}</td>
                            <td className={`p-4 text-right font-semibold ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
                              {isUp ? "+" : ""}₹{item.pnl.toFixed(2)} ({isUp ? "+" : ""}{item.pnlPercent.toFixed(2)}%)
                            </td>
                            <td className="p-4 text-center">
                              {matchedStock && (
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-8"
                                    onClick={() => openTradeModal(matchedStock, "BUY")}
                                  >
                                    Buy More
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="text-xs h-8"
                                    onClick={() => openTradeModal(matchedStock, "SELL")}
                                  >
                                    Sell
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: TRADE HISTORY */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <History className="w-5 h-5 text-primary" /> Execution Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">No trading activity recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                      <tr>
                        <th className="p-4">Date & Time</th>
                        <th className="p-4">Symbol</th>
                        <th className="p-4">Type</th>
                        <th className="p-4 text-right">Shares</th>
                        <th className="p-4 text-right">Execution Price</th>
                        <th className="p-4 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-muted/30">
                          <td className="p-4 text-xs text-muted-foreground">
                            {new Date(tx.created_date).toLocaleString()}
                          </td>
                          <td className="p-4 font-bold">{tx.symbol}</td>
                          <td className="p-4">
                            <Badge variant={tx.type === "BUY" ? "default" : "secondary"} className={tx.type === "BUY" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 text-white hover:bg-rose-700"}>
                              {tx.type}
                            </Badge>
                          </td>
                          <td className="p-4 text-right font-medium">{tx.shares}</td>
                          <td className="p-4 text-right">₹{Number(tx.price).toFixed(2)}</td>
                          <td className="p-4 text-right font-semibold">₹{Number(tx.total_amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DETAILED CHART & PAPER TRADE MODAL */}
      <Dialog open={!!selectedStock} onOpenChange={(open) => !open && setSelectedStock(null)}>
        {selectedStock && (
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-2xl font-bold">{selectedStock.symbol}</DialogTitle>
                    <Badge variant="outline">{selectedStock.market || "NSE/BSE"}</Badge>
                    <Badge variant="secondary">{selectedStock.sector}</Badge>
                  </div>
                  <DialogDescription className="mt-1 text-xs">
                    {selectedStock.name} · Market Cap: {selectedStock.market_cap || "N/A"} · P/E: {selectedStock.pe || "N/A"}
                  </DialogDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold">₹{selectedStock.price}</div>
                  <div className="text-xs text-emerald-600 font-medium">Live Market Order Simulation</div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 pt-2">
              {/* Chart Toolbar & Technical Indicators */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg text-xs">
                {/* Timeframes */}
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground mr-1 font-medium">Period:</span>
                  {[
                    { label: "1W", days: 7 },
                    { label: "1M", days: 30 },
                    { label: "3M", days: 90 },
                    { label: "6M", days: 180 },
                  ].map((tf) => (
                    <button
                      key={tf.label}
                      onClick={() => setTimeframe(tf.days)}
                      className={`px-2 py-1 rounded font-medium transition-colors ${
                        timeframe === tf.days ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>

                {/* Indicator Toggles */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5" /> Indicators:
                  </span>
                  <label className="flex items-center gap-1 cursor-pointer bg-background px-2 py-1 rounded border border-border">
                    <input
                      type="checkbox"
                      checked={showSMA}
                      onChange={(e) => setShowSMA(e.target.checked)}
                      className="rounded text-primary focus:ring-0"
                    />
                    <span className="text-amber-500 font-semibold">SMA 20</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer bg-background px-2 py-1 rounded border border-border">
                    <input
                      type="checkbox"
                      checked={showEMA}
                      onChange={(e) => setShowEMA(e.target.checked)}
                      className="rounded text-primary focus:ring-0"
                    />
                    <span className="text-purple-500 font-semibold">EMA 50</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer bg-background px-2 py-1 rounded border border-border">
                    <input
                      type="checkbox"
                      checked={showRSI}
                      onChange={(e) => setShowRSI(e.target.checked)}
                      className="rounded text-primary focus:ring-0"
                    />
                    <span className="text-blue-500 font-semibold">RSI 14</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer bg-background px-2 py-1 rounded border border-border">
                    <input
                      type="checkbox"
                      checked={showSupportResistance}
                      onChange={(e) => setShowSupportResistance(e.target.checked)}
                      className="rounded text-primary focus:ring-0"
                    />
                    <span className="text-emerald-500 font-semibold">Supp/Res</span>
                  </label>
                </div>
              </div>

              {/* Chart Visualizer */}
              <div className="space-y-3">
                <div className="h-[280px] w-full bg-card rounded-xl border p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={priceHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} orientation="right" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "none", color: "#fff", fontSize: "12px" }}
                        formatter={(value, name) => [`₹${Number(value).toFixed(2)}`, name.toUpperCase()]}
                      />
                      <Area type="monotone" dataKey="close" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorClose)" name="Close Price" />
                      {showSMA && <Line type="monotone" dataKey="sma20" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="SMA 20" />}
                      {showEMA && <Line type="monotone" dataKey="ema50" stroke="#a855f7" strokeWidth={1.5} dot={false} name="EMA 50" />}
                      {showSupportResistance && srLevels.resistance > 0 && (
                        <ReferenceLine y={srLevels.resistance} label={{ value: `Res: ₹${srLevels.resistance}`, fill: "#ef4444", fontSize: 10 }} stroke="#ef4444" strokeDasharray="3 3" />
                      )}
                      {showSupportResistance && srLevels.support > 0 && (
                        <ReferenceLine y={srLevels.support} label={{ value: `Supp: ₹${srLevels.support}`, fill: "#10b981", fontSize: 10 }} stroke="#10b981" strokeDasharray="3 3" />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Sub-Chart: RSI 14 if toggled */}
                {showRSI && (
                  <div className="h-[100px] w-full bg-card rounded-xl border p-2">
                    <div className="text-[10px] font-semibold text-muted-foreground px-2">RSI (14) Indicator</div>
                    <ResponsiveContainer width="100%" height="80%">
                      <LineChart data={priceHistory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <YAxis domain={[0, 100]} ticks={[30, 70]} tick={{ fontSize: 9 }} orientation="right" />
                        <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="2 2" />
                        <ReferenceLine y={30} stroke="#10b981" strokeDasharray="2 2" />
                        <Line type="monotone" dataKey="rsi14" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Order Execution Panel */}
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="font-semibold text-sm">Demo Trading Desk</span>
                  <div className="text-xs text-muted-foreground">
                    Available Balance: <span className="font-bold text-foreground">₹{portfolioValuation.cash.toFixed(2)}</span>
                    {selectedStockHolding && (
                      <span className="ml-3 border-l border-border pl-3">
                        Owned: <span className="font-bold text-primary">{selectedStockHolding.shares} shares</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Trade Message Alert */}
                {tradeMessage && (
                  <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${tradeMessage.type === "success" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20"}`}>
                    {tradeMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{tradeMessage.text}</span>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Order Action</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={orderType === "BUY" ? "default" : "outline"}
                        className={orderType === "BUY" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                        onClick={() => setOrderType("BUY")}
                      >
                        Buy Shares
                      </Button>
                      <Button
                        type="button"
                        variant={orderType === "SELL" ? "default" : "outline"}
                        className={orderType === "SELL" ? "bg-rose-600 hover:bg-rose-700 text-white" : ""}
                        onClick={() => setOrderType("SELL")}
                      >
                        Sell Shares
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Quantity (Shares)</label>
                    <Input
                      type="number"
                      min="1"
                      value={orderShares}
                      onChange={(e) => setOrderShares(e.target.value)}
                      placeholder="Number of shares"
                    />
                  </div>
                </div>

                {/* Quick Share Calculators */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Quick Quantity:</span>
                  {[10, 25, 50, 100].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setOrderShares(String(qty))}
                      className="px-2 py-1 rounded bg-muted hover:bg-accent text-muted-foreground hover:text-foreground font-medium"
                    >
                      {qty}
                    </button>
                  ))}
                  {orderType === "SELL" && selectedStockHolding && (
                    <button
                      type="button"
                      onClick={() => setOrderShares(String(selectedStockHolding.shares))}
                      className="px-2 py-1 rounded bg-primary/10 text-primary font-semibold hover:bg-primary/20"
                    >
                      All ({selectedStockHolding.shares})
                    </button>
                  )}
                </div>

                {/* Trade Calculation Summary */}
                <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg text-xs font-medium">
                  <div>
                    Execution Price: <span className="font-bold">₹{selectedStock.price}</span>
                  </div>
                  <div className="text-right">
                    Total Order Value:{" "}
                    <span className="text-base font-extrabold text-primary">
                      ₹{(Number(orderShares || 0) * Number(selectedStock.price || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleExecuteTrade}
                  disabled={tradeLoading || !orderShares || Number(orderShares) <= 0}
                  className={`w-full ${orderType === "BUY" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
                >
                  {tradeLoading ? "Processing Order..." : `Confirm Demo ${orderType === "BUY" ? "Purchase" : "Sale"}`}
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* RESET PORTFOLIO CONFIRM DIALOG */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Demo Portfolio?</DialogTitle>
            <DialogDescription>
              This will reset your virtual cash balance back to ₹1,00,000 and clear all your current paper stock positions and history.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleResetPortfolio} disabled={tradeLoading}>
              {tradeLoading ? "Resetting..." : "Yes, Reset Portfolio"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
