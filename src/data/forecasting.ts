import { Transaction } from './analyticsEngine';

export interface MonthlySalesPoint {
  monthKey: string; // '2023-01'
  displayMonth: string; // 'Jan 2023'
  revenue: number;
  orders: number;
  units: number;
}

export interface ForecastPoint {
  monthKey: string;
  displayMonth: string;
  actual?: number;
  forecast?: number;
  lowerBound?: number;
  upperBound?: number;
  isForecast: boolean;
}

export interface ForecastEvaluation {
  mae: number;
  rmse: number;
  mape: number;
  historicalMonthsCount: number;
  forecastMonthsCount: number;
}

/**
 * Aggregate transactions by Year-Month
 */
export function aggregateMonthlySales(transactions: Transaction[]): MonthlySalesPoint[] {
  const map = new Map<string, { revenue: number; orders: Set<string>; units: number }>();

  // Only count delivered/shipped
  const valid = transactions.filter((t) => t.order_status === 'Delivered' || t.order_status === 'Shipped');

  for (const t of valid) {
    const monthKey = t.order_date.substring(0, 7); // '2023-01'
    if (!map.has(monthKey)) {
      map.set(monthKey, { revenue: 0, orders: new Set(), units: 0 });
    }
    const cur = map.get(monthKey)!;
    cur.revenue += t.net_revenue;
    cur.orders.add(t.order_id);
    cur.units += t.quantity;
  }

  const sortedKeys = Array.from(map.keys()).sort();

  return sortedKeys.map((key) => {
    const [year, month] = key.split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, 1);
    const displayMonth = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const data = map.get(key)!;

    return {
      monthKey: key,
      displayMonth,
      revenue: Math.round(data.revenue),
      orders: data.orders.size,
      units: data.units,
    };
  });
}

/**
 * Time Series Forecasting Engine
 * Uses Decomposition: Linear Trend + Additive/Multiplicative Monthly Seasonal Index
 * Includes Train/Test evaluation on the last 4 historical months
 */
export function generateSalesForecast(
  monthlyData: MonthlySalesPoint[],
  horizonMonths = 6,
  growthAdjustmentPercent = 0 // e.g. +5% or -5%
): {
  chartPoints: ForecastPoint[];
  evaluation: ForecastEvaluation;
  tableData: ForecastPoint[];
} {
  if (monthlyData.length < 6) {
    return {
      chartPoints: monthlyData.map((m) => ({
        monthKey: m.monthKey,
        displayMonth: m.displayMonth,
        actual: m.revenue,
        isForecast: false,
      })),
      evaluation: { mae: 0, rmse: 0, mape: 0, historicalMonthsCount: monthlyData.length, forecastMonthsCount: 0 },
      tableData: [],
    };
  }

  const n = monthlyData.length;
  const revenues = monthlyData.map((m) => m.revenue);

  // 1. Calculate Linear Trend (y = slope * t + intercept) using Ordinary Least Squares (OLS)
  let sumT = 0;
  let sumY = 0;
  let sumTY = 0;
  let sumT2 = 0;

  for (let t = 0; t < n; t++) {
    sumT += t;
    sumY += revenues[t];
    sumTY += t * revenues[t];
    sumT2 += t * t;
  }

  const slope = (n * sumTY - sumT * sumY) / (n * sumT2 - sumT * sumT);
  const intercept = (sumY - slope * sumT) / n;

  // 2. Calculate Monthly Seasonal Factors (1 to 12)
  const seasonalRatios: { [monthNum: number]: number[] } = {};
  for (let t = 0; t < n; t++) {
    const monthNum = parseInt(monthlyData[t].monthKey.split('-')[1], 10);
    const trendValue = slope * t + intercept;
    const ratio = trendValue > 0 ? revenues[t] / trendValue : 1.0;

    if (!seasonalRatios[monthNum]) seasonalRatios[monthNum] = [];
    seasonalRatios[monthNum].push(ratio);
  }

  // Average seasonality for each calendar month (default to 1.0 if not enough data)
  const seasonalIndex: { [monthNum: number]: number } = {};
  for (let m = 1; m <= 12; m++) {
    const list = seasonalRatios[m] || [1.0];
    seasonalIndex[m] = list.reduce((a, b) => a + b, 0) / list.length;
  }

  // 3. Train/Test Split Evaluation: evaluate model on last 4 historical months
  const testWindow = Math.min(4, Math.floor(n / 3));
  let errorSum = 0;
  let sqErrorSum = 0;
  let pctErrorSum = 0;

  for (let t = n - testWindow; t < n; t++) {
    const actual = revenues[t];
    const monthNum = parseInt(monthlyData[t].monthKey.split('-')[1], 10);
    const fitted = (slope * t + intercept) * (seasonalIndex[monthNum] || 1.0);
    const diff = Math.abs(actual - fitted);

    errorSum += diff;
    sqErrorSum += diff * diff;
    if (actual > 0) {
      pctErrorSum += (diff / actual) * 100;
    }
  }

  const mae = Math.round(errorSum / testWindow);
  const rmse = Math.round(Math.sqrt(sqErrorSum / testWindow));
  const mape = Number((pctErrorSum / testWindow).toFixed(1));

  // 4. Construct Output Series (Historical + Future Forecast)
  const chartPoints: ForecastPoint[] = [];

  monthlyData.forEach((m) => {
    chartPoints.push({
      monthKey: m.monthKey,
      displayMonth: m.displayMonth,
      actual: m.revenue,
      forecast: undefined,
      isForecast: false,
    });
  });

  // Last historical date
  const lastKey = monthlyData[n - 1].monthKey;
  let curYear = parseInt(lastKey.split('-')[0], 10);
  let curMonth = parseInt(lastKey.split('-')[1], 10);

  // Standard deviation of historical residuals for 95% Confidence Interval (~ 1.96 * sigma)
  const residuals = monthlyData.map((m, t) => {
    const mNum = parseInt(m.monthKey.split('-')[1], 10);
    const fitted = (slope * t + intercept) * (seasonalIndex[mNum] || 1.0);
    return m.revenue - fitted;
  });
  const sigma = Math.sqrt(residuals.reduce((a, b) => a + b * b, 0) / n);

  const tableData: ForecastPoint[] = [];

  // Generate future horizon
  for (let step = 1; step <= horizonMonths; step++) {
    curMonth++;
    if (curMonth > 12) {
      curMonth = 1;
      curYear++;
    }

    const t = n + step - 1;
    const baseTrend = slope * t + intercept;
    const seasonMult = seasonalIndex[curMonth] || 1.0;
    const growthMult = 1 + (growthAdjustmentPercent / 100);

    const projected = Math.round(Math.max(1000, baseTrend * seasonMult * growthMult));
    // Uncertainty grows as forecast horizon increases
    const uncertaintyFactor = 1 + 0.15 * Math.sqrt(step);
    const margin = Math.round(1.96 * sigma * uncertaintyFactor);

    const lowerBound = Math.max(0, projected - margin);
    const upperBound = projected + margin;

    const monthKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;
    const dateObj = new Date(curYear, curMonth - 1, 1);
    const displayMonth = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    const fPoint: ForecastPoint = {
      monthKey,
      displayMonth,
      forecast: projected,
      lowerBound,
      upperBound,
      isForecast: true,
    };

    chartPoints.push(fPoint);
    tableData.push(fPoint);
  }

  return {
    chartPoints,
    evaluation: {
      mae,
      rmse,
      mape,
      historicalMonthsCount: n,
      forecastMonthsCount: horizonMonths,
    },
    tableData,
  };
}
