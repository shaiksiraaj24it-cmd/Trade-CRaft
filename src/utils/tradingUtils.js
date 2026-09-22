/**
 * Trading Utilities for Generating Market Price History & Technical Indicators
 */

/**
 * Deterministic pseudo-random number generator based on seed string
 */
function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return function() {
    h = Math.imul(48271, h) % 2147483647;
    return (h & 2147483647) / 2147483647;
  };
}

/**
 * Generates historical daily price candles (OHLC + Volume) for a stock
 */
export function generatePriceHistory(symbol, currentPrice = 100, days = 60) {
  const basePrice = Number(currentPrice) || 100;
  const rand = seededRandom(symbol + "_history_" + days);
  const data = [];

  const now = new Date();
  let price = basePrice * (0.8 + rand() * 0.4); // Start price between -20% and +20%

  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    // Daily fluctuation (-3% to +3%)
    const pctChange = (rand() - 0.48) * 0.06;
    const open = price;
    let close = price * (1 + pctChange);

    // For today (i == 0), ensure close equals currentPrice
    if (i === 0) {
      close = basePrice;
    }

    const high = Math.max(open, close) * (1 + rand() * 0.015);
    const low = Math.min(open, close) * (1 - rand() * 0.015);
    const volume = Math.floor(10000 + rand() * 90000);

    data.push({
      date: dateStr,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    price = close;
  }

  // Calculate indicators for each data point
  return calculateIndicators(data);
}

/**
 * Calculates SMA, EMA, and RSI on a series of OHLC price data
 */
export function calculateIndicators(data) {
  const closes = data.map((d) => d.close);

  // 1. Simple Moving Average (SMA 20)
  const sma20 = calculateSMA(closes, 20);

  // 2. Exponential Moving Average (EMA 50)
  const ema50 = calculateEMA(closes, 50);

  // 3. Relative Strength Index (RSI 14)
  const rsi14 = calculateRSI(closes, 14);

  return data.map((item, idx) => ({
    ...item,
    sma20: sma20[idx] ? Number(sma20[idx].toFixed(2)) : null,
    ema50: ema50[idx] ? Number(ema50[idx].toFixed(2)) : null,
    rsi14: rsi14[idx] ? Number(rsi14[idx].toFixed(2)) : null,
  }));
}

export function calculateSMA(dataSeries, period) {
  const sma = [];
  for (let i = 0; i < dataSeries.length; i++) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      const sum = dataSeries.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

export function calculateEMA(dataSeries, period) {
  const ema = [];
  const k = 2 / (period + 1);
  let prevEma = null;

  for (let i = 0; i < dataSeries.length; i++) {
    if (i < period - 1) {
      ema.push(null);
    } else if (i === period - 1) {
      const sum = dataSeries.slice(0, period).reduce((a, b) => a + b, 0);
      prevEma = sum / period;
      ema.push(prevEma);
    } else {
      const currentEma = (dataSeries[i] * k) + (prevEma * (1 - k));
      prevEma = currentEma;
      ema.push(currentEma);
    }
  }
  return ema;
}

export function calculateRSI(dataSeries, period = 14) {
  const rsi = [];
  let gains = 0;
  let losses = 0;

  for (let i = 0; i < dataSeries.length; i++) {
    if (i === 0) {
      rsi.push(null);
      continue;
    }

    const diff = dataSeries[i] - dataSeries[i - 1];
    if (i <= period) {
      if (diff >= 0) gains += diff;
      else losses -= diff;

      if (i < period) {
        rsi.push(null);
      } else {
        let avgGain = gains / period;
        let avgLoss = losses / period;
        let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    } else {
      const gain = diff >= 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;

      const prevRsi = rsi[i - 1];
      // Smoothed RS calculation
      const prevAvgGain = (gains * (period - 1) + gain) / period;
      const prevAvgLoss = (losses * (period - 1) + loss) / period;
      gains = prevAvgGain;
      losses = prevAvgLoss;

      if (prevAvgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = prevAvgGain / prevAvgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
  }

  return rsi;
}

export function calculateSupportResistance(history) {
  if (!history || history.length === 0) return { support: 0, resistance: 0 };
  const lows = history.map((h) => h.low);
  const highs = history.map((h) => h.high);

  const minPrice = Math.min(...lows);
  const maxPrice = Math.max(...highs);

  return {
    support: Number(minPrice.toFixed(2)),
    resistance: Number(maxPrice.toFixed(2)),
  };
}
