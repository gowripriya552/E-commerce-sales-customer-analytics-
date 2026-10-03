import { Transaction } from '../data/analyticsEngine';
import * as XLSX from 'xlsx';

export interface DatasetValidationStats {
  fileName: string;
  fileType: 'CSV' | 'Excel';
  totalRows: number;
  totalColumns: number;
  duplicateRows: number;
  missingValues: number;
  detectedColumns: string[];
  matchedColumns: string[];
  missingRecommendedColumns: string[];
  hygieneScore: number;
  warnings: string[];
}

export const IMPORTANT_COLUMNS = [
  'Order_ID',
  'Customer_ID',
  'Order_Date',
  'Product_ID',
  'Product',
  'Category',
  'Country',
  'City',
  'Quantity',
  'Unit_Price',
  'Discount_Rate',
  'Revenue',
  'Cost',
  'Profit',
  'Payment_Method',
] as const;

/**
 * Standardize column names for loose matching
 */
function normalizeColName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parse and validate either CSV or Excel (.xlsx) file into Transactions
 */
export async function parseAndValidateDatasetFile(file: File): Promise<{
  transactions: Transaction[];
  stats: DatasetValidationStats;
  error?: string;
}> {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

  let rawRows: any[][] = [];

  try {
    if (isExcel) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return {
          transactions: [],
          stats: createEmptyStats(file.name, 'Excel'),
          error: 'The uploaded Excel file has no sheets.',
        };
      }
      const sheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
    } else {
      const text = await file.text();
      const workbook = XLSX.read(text, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return {
          transactions: [],
          stats: createEmptyStats(file.name, 'CSV'),
          error: 'The uploaded CSV file is empty.',
        };
      }
      const sheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
    }
  } catch (err: any) {
    return {
      transactions: [],
      stats: createEmptyStats(file.name, isExcel ? 'Excel' : 'CSV'),
      error: `Failed to read file: ${err.message || 'Corrupt or unsupported format'}`,
    };
  }

  // Filter out completely blank rows
  rawRows = rawRows.filter((r) => r.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''));

  if (rawRows.length < 2) {
    return {
      transactions: [],
      stats: createEmptyStats(file.name, isExcel ? 'Excel' : 'CSV'),
      error: 'The dataset must contain a header row and at least one row of transaction data.',
    };
  }

  // 1. Column detection
  const headerRow = rawRows[0].map((h) => String(h || '').trim());
  const totalColumns = headerRow.length;
  const detectedColumns = [...headerRow];

  // Map normalized header names to column index
  const headerIndexMap = new Map<string, number>();
  headerRow.forEach((col, idx) => {
    headerIndexMap.set(normalizeColName(col), idx);
  });

  // Check important column matching
  const matchedColumns: string[] = [];
  const missingRecommendedColumns: string[] = [];

  const columnAliases: Record<string, string[]> = {
    Order_ID: ['orderid', 'order_id', 'orderno', 'invoice', 'invoiceno', 'id'],
    Customer_ID: ['customerid', 'customer_id', 'custid', 'clientid', 'userid'],
    Order_Date: ['orderdate', 'order_date', 'date', 'invoicedate', 'timestamp', 'time'],
    Product_ID: ['productid', 'product_id', 'itemid', 'sku', 'code'],
    Product: ['product', 'productname', 'product_name', 'item', 'itemname', 'description', 'title'],
    Category: ['category', 'productcategory', 'cat', 'dept', 'department'],
    Country: ['country', 'nation', 'region', 'destination'],
    City: ['city', 'town', 'metropolis', 'location'],
    Quantity: ['quantity', 'qty', 'units', 'count', 'volume'],
    Unit_Price: ['unitprice', 'unit_price', 'price', 'sellingprice', 'rate', 'itemprice'],
    Discount_Rate: ['discountrate', 'discount_rate', 'discount', 'discountpercent', 'disc', 'markdown'],
    Revenue: ['revenue', 'sales', 'netsales', 'totalrevenue', 'grosssales', 'total', 'amount'],
    Cost: ['cost', 'unitcost', 'unit_cost', 'totalcost', 'cogs', 'expense'],
    Profit: ['profit', 'netprofit', 'grossprofit', 'margin', 'earnings'],
    Payment_Method: ['paymentmethod', 'payment_method', 'payment', 'paytype', 'tendertype'],
  };

  const resolvedColIdx: Record<string, number | undefined> = {};

  IMPORTANT_COLUMNS.forEach((colKey) => {
    const aliases = columnAliases[colKey] || [normalizeColName(colKey)];
    let foundIdx: number | undefined;

    for (const alias of aliases) {
      if (headerIndexMap.has(alias)) {
        foundIdx = headerIndexMap.get(alias);
        break;
      }
    }

    if (foundIdx !== undefined) {
      matchedColumns.push(colKey);
      resolvedColIdx[colKey] = foundIdx;
    } else {
      missingRecommendedColumns.push(colKey);
    }
  });

  // 2. Data Rows Validation, Duplicates, and Missing Values calculation
  const dataRows = rawRows.slice(1);
  const totalRows = dataRows.length;

  let missingValues = 0;
  let duplicateRows = 0;
  const seenRowFingerprints = new Set<string>();
  const parsedTransactions: Transaction[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];

    // Count missing cells across all columns in this row
    for (let c = 0; c < totalColumns; c++) {
      const cell = row[c];
      if (cell === null || cell === undefined || String(cell).trim() === '') {
        missingValues++;
      }
    }

    // Duplicate detection: fingerprint the whole row or order key
    const rowFingerprint = row.map((cell) => String(cell ?? '').trim()).join('|');
    if (seenRowFingerprints.has(rowFingerprint)) {
      duplicateRows++;
      continue; // Clean out duplicate rows
    }
    seenRowFingerprints.add(rowFingerprint);

    // Extract values with intelligent fallback mappings
    const getVal = (colKey: string, fallback = ''): string => {
      const idx = resolvedColIdx[colKey];
      if (idx !== undefined && row[idx] !== undefined && row[idx] !== null) {
        return String(row[idx]).trim();
      }
      return fallback;
    };

    const order_id = getVal('Order_ID') || `ORD-${1000 + i + 1}`;
    const customer_id = getVal('Customer_ID') || `CUST-${100 + (i % 40) + 1}`;
    const order_date = getVal('Order_Date') || '2024-01-01';
    const product_id = getVal('Product_ID') || `PROD-${100 + (i % 25) + 1}`;
    const product_name = getVal('Product') || `Catalog Item ${product_id}`;
    const category = getVal('Category') || 'General Catalog';
    const country = getVal('Country') || 'USA';
    const city = getVal('City') || 'Global City';
    const state = country === 'India' ? 'Karnataka' : country === 'USA' ? 'NY' : 'Region';

    const customer_name = `Customer ${customer_id}`;
    const customer_age = 30 + (i % 35);
    const customer_gender: Transaction['customer_gender'] = i % 2 === 0 ? 'Female' : 'Male';

    const quantity = Math.max(1, parseInt(getVal('Quantity', '1'), 10) || 1);
    const unit_price = Math.max(0.5, parseFloat(getVal('Unit_Price', '49.99')) || 49.99);

    // Discount rate handling (e.g. 0.15 or 15%)
    let discountRaw = parseFloat(getVal('Discount_Rate', '0')) || 0;
    if (discountRaw > 1 && discountRaw <= 100) discountRaw = discountRaw / 100;
    const discount_percent = Math.max(0, Math.min(0.9, discountRaw));

    // Revenue calculation
    let net_revenue: number;
    const explicitRev = parseFloat(getVal('Revenue', ''));
    const gross_sales = Number((quantity * unit_price).toFixed(2));
    const discount_amount = Number((gross_sales * discount_percent).toFixed(2));

    if (!isNaN(explicitRev) && explicitRev > 0) {
      net_revenue = Number(explicitRev.toFixed(2));
    } else {
      net_revenue = Number((gross_sales - discount_amount).toFixed(2));
    }

    // Cost calculation
    let unit_cost: number;
    let total_cost: number;
    const explicitCost = parseFloat(getVal('Cost', ''));

    if (!isNaN(explicitCost) && explicitCost > 0) {
      total_cost = Number(explicitCost.toFixed(2));
      unit_cost = Number((total_cost / quantity).toFixed(2));
    } else {
      unit_cost = Number((unit_price * 0.52).toFixed(2));
      total_cost = Number((quantity * unit_cost).toFixed(2));
    }

    // Profit calculation
    let profit: number;
    const explicitProfit = parseFloat(getVal('Profit', ''));
    if (!isNaN(explicitProfit)) {
      profit = Number(explicitProfit.toFixed(2));
    } else {
      profit = Number((net_revenue - total_cost).toFixed(2));
    }

    const profit_margin = net_revenue > 0 ? Number(((profit / net_revenue) * 100).toFixed(2)) : 0;

    let payment_method: Transaction['payment_method'] = 'Credit Card';
    const payVal = getVal('Payment_Method').toLowerCase();
    if (payVal.includes('paypal')) payment_method = 'PayPal';
    else if (payVal.includes('upi')) payment_method = 'UPI';
    else if (payVal.includes('debit')) payment_method = 'Debit Card';
    else if (payVal.includes('cash')) payment_method = 'Cash on Delivery';

    parsedTransactions.push({
      order_id,
      order_date,
      customer_id,
      customer_name,
      customer_age,
      customer_gender,
      city,
      state,
      country,
      product_id,
      product_name,
      category,
      sub_category: 'Standard',
      quantity,
      unit_price,
      unit_cost,
      discount_percent,
      payment_method,
      order_status: 'Delivered',
      gross_sales,
      discount_amount,
      net_revenue,
      total_cost,
      profit,
      profit_margin,
    });
  }

  // Calculate Data Hygiene Score (0 - 100%)
  const totalCells = Math.max(1, totalRows * totalColumns);
  const cellErrorPenalty = (missingValues / totalCells) * 35;
  const duplicatePenalty = totalRows > 0 ? (duplicateRows / totalRows) * 25 : 0;
  const columnCoverage = (matchedColumns.length / IMPORTANT_COLUMNS.length) * 40;
  const hygieneScore = Math.max(50, Math.min(100, Math.round(100 - cellErrorPenalty - duplicatePenalty + (columnCoverage - 40))));

  const warnings: string[] = [];
  if (duplicateRows > 0) warnings.push(`Removed ${duplicateRows} duplicate rows.`);
  if (missingValues > 0) warnings.push(`Detected ${missingValues} empty cells across dataset fields.`);
  if (missingRecommendedColumns.length > 0) {
    warnings.push(`Missing recommended columns: ${missingRecommendedColumns.slice(0, 4).join(', ')}${missingRecommendedColumns.length > 4 ? ` (+${missingRecommendedColumns.length - 4} more)` : ''}. Computed with standard defaults.`);
  }

  const stats: DatasetValidationStats = {
    fileName: file.name,
    fileType: isExcel ? 'Excel' : 'CSV',
    totalRows,
    totalColumns,
    duplicateRows,
    missingValues,
    detectedColumns,
    matchedColumns,
    missingRecommendedColumns,
    hygieneScore,
    warnings,
  };

  return {
    transactions: parsedTransactions,
    stats,
  };
}

function createEmptyStats(fileName: string, fileType: 'CSV' | 'Excel'): DatasetValidationStats {
  return {
    fileName,
    fileType,
    totalRows: 0,
    totalColumns: 0,
    duplicateRows: 0,
    missingValues: 0,
    detectedColumns: [],
    matchedColumns: [],
    missingRecommendedColumns: [...IMPORTANT_COLUMNS],
    hygieneScore: 0,
    warnings: [],
  };
}

export function exportTransactionsToCSV(transactions: Transaction[]) {
  const headers = [
    'Order_ID',
    'Order_Date',
    'Customer_ID',
    'Customer_Name',
    'Customer_Age',
    'Customer_Gender',
    'City',
    'State',
    'Country',
    'Product_ID',
    'Product',
    'Category',
    'Sub_Category',
    'Quantity',
    'Unit_Price',
    'Unit_Cost',
    'Discount_Rate',
    'Payment_Method',
    'Order_Status',
    'Gross_Sales',
    'Discount_Amount',
    'Revenue',
    'Cost',
    'Profit',
    'Profit_Margin',
  ];

  const rows = transactions.map((t) => [
    t.order_id,
    t.order_date,
    t.customer_id,
    `"${t.customer_name}"`,
    t.customer_age,
    t.customer_gender,
    `"${t.city}"`,
    `"${t.state}"`,
    `"${t.country}"`,
    t.product_id,
    `"${t.product_name}"`,
    `"${t.category}"`,
    `"${t.sub_category}"`,
    t.quantity,
    t.unit_price,
    t.unit_cost,
    t.discount_percent,
    t.payment_method,
    t.order_status,
    t.gross_sales,
    t.discount_amount,
    t.net_revenue,
    t.total_cost,
    t.profit,
    t.profit_margin,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `ecommerce_analytics_dataset_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
