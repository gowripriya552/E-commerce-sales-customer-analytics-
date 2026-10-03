import React, { useState, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Users,
  ShieldCheck,
  Calendar,
  Lightbulb,
  Globe2,
  Grid,
  HelpCircle,
  FileText,
  Upload,
  Download,
  RefreshCw,
  FileCode,
  Menu,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Check,
  FileCheck,
  UserCheck,
  Bell,
  Award,
} from 'lucide-react';
import {
  Transaction,
  generateRealisticDataset,
  calculateCustomerAnalytics,
  formatCurrency,
  formatNumber,
} from './data/analyticsEngine';
import {
  exportTransactionsToCSV,
  parseAndValidateDatasetFile,
  DatasetValidationStats,
  IMPORTANT_COLUMNS,
} from './components/CsvManager';

// Existing & Extended Pages
import { OverviewPage } from './components/pages/OverviewPage';
import { SalesPage } from './components/pages/SalesPage';
import { ProductPage } from './components/pages/ProductPage';
import { CustomerPage } from './components/pages/CustomerPage';
import { SegmentationPage } from './components/pages/SegmentationPage';
import { ForecastPage } from './components/pages/ForecastPage';
import { InsightsPage } from './components/pages/InsightsPage';
import { GeographicPage } from './components/pages/GeographicPage';
import { ProductMatrixPage } from './components/pages/ProductMatrixPage';
import { AskDataPage } from './components/pages/AskDataPage';
import { ExecutiveReportPage } from './components/pages/ExecutiveReportPage';
import { RetentionPage } from './components/pages/RetentionPage';
import { BusinessAlertsPage } from './components/pages/BusinessAlertsPage';
import { ClvPage } from './components/pages/ClvPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState<
    'overview' | 'sales' | 'geo' | 'products' | 'matrix' | 'product-performance' | 'customers' | 'segmentation' | 'retention' | 'clv' | 'alerts' | 'forecast' | 'insights' | 'ask' | 'report'
  >('overview');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [lastValidationStats, setLastValidationStats] = useState<DatasetValidationStats | null>(null);
  const [isCustomDataset, setIsCustomDataset] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core Transactional Dataset (default sample dataset)
  const [transactions, setTransactions] = useState<Transaction[]>(() => generateRealisticDataset());

  // Customer RFM analytics dynamically computed whenever transactions change
  const customers = useMemo(() => calculateCustomerAnalytics(transactions), [transactions]);

  const totalRevenue = useMemo(() => {
    return transactions
      .filter((t) => t.order_status === 'Delivered' || t.order_status === 'Shipped')
      .reduce((s, t) => s + t.net_revenue, 0);
  }, [transactions]);

  // Handle CSV and Excel Upload with comprehensive validation
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const { transactions: parsed, stats, error } = await parseAndValidateDatasetFile(file);

      if (error || parsed.length === 0) {
        setUploadError(error || 'Failed to parse dataset file. Please verify that the file contains valid tabular data.');
        setIsUploading(false);
        return;
      }

      setTransactions(parsed);
      setLastValidationStats(stats);
      setIsCustomDataset(true);
      setUploadSuccess('✓ Dataset uploaded successfully');
      setUploadError(null);
      setIsUploading(false);
    } catch (err: any) {
      setUploadError(`Error processing file: ${err.message || 'Invalid format'}`);
      setIsUploading(false);
    }
  };

  // Reset to original sample dataset
  const handleResetData = () => {
    setTransactions(generateRealisticDataset());
    setLastValidationStats(null);
    setIsCustomDataset(false);
    setUploadError(null);
    setUploadSuccess('Restored original sample dataset.');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setUploadSuccess(null), 2500);
  };

  const navItems = [
    { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'sales', label: 'Sales & Trends', icon: TrendingUp, badge: null },
    { id: 'geo', label: 'Geographic Analytics', icon: Globe2, badge: 'Worldwide' },
    { id: 'products', label: 'Product Analytics', icon: Package, badge: null },
    { id: 'matrix', label: 'Product Performance', icon: Grid, badge: 'Matrix' },
    { id: 'customers', label: 'Customer Analysis', icon: Users, badge: null },
    { id: 'segmentation', label: 'RFM Segmentation', icon: ShieldCheck, badge: 'RFM' },
    { id: 'retention', label: 'Retention Analysis', icon: UserCheck, badge: 'Cohort' },
    { id: 'clv', label: 'Customer Lifetime Value', icon: Award, badge: 'CLV' },
    { id: 'alerts', label: 'Business Alerts', icon: Bell, badge: 'Live' },
    { id: 'forecast', label: 'Sales Forecast', icon: Calendar, badge: 'AI/Stats' },
    { id: 'insights', label: 'Business Insights', icon: Lightbulb, badge: 'Live' },
    { id: 'ask', label: 'Ask the Data', icon: HelpCircle, badge: 'Q&A' },
    { id: 'report', label: 'Executive Report', icon: FileText, badge: 'PDF' },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300 shrink-0 select-none">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-white text-sm tracking-tight leading-tight">
              E-Commerce Analytics
            </div>
            <div className="text-[10px] text-indigo-400 font-medium tracking-wider uppercase">
              BI Platform
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Analytics Modules
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isActive ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-indigo-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Dataset Controls in Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950/40 text-xs">
          <div className="px-2 pt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Active Dataset:</span>
            <span className="font-mono font-bold text-slate-200">
              {formatNumber(transactions.length)} rows
            </span>
          </div>

          {isCustomDataset && (
            <div className="px-2 text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Custom Upload Active</span>
            </div>
          )}

          {/* Primary Upload Button */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors cursor-pointer text-xs shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Your Dataset
          </button>

          {isCustomDataset && (
            <button
              onClick={handleResetData}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-slate-800/60 transition-colors cursor-pointer text-xs font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset to Sample Dataset
            </button>
          )}

          <button
            onClick={() => exportTransactionsToCSV(transactions)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            Export Clean CSV
          </button>

          <button
            onClick={() => setShowDocsModal(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors cursor-pointer text-xs"
          >
            <FileCode className="w-3.5 h-3.5" />
            Portfolio Documentation
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
            {/* Mobile menu trigger */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="lg:hidden font-bold text-sm text-slate-900">
                E-Commerce Analytics
              </div>
            </div>

            {/* Quick Metrics Bar in Header */}
            <div className="hidden sm:flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Total Net Revenue:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatCurrency(totalRevenue)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Customers:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatNumber(customers.length)}
                </span>
              </div>
              {isCustomDataset && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Custom Data ({formatNumber(transactions.length)} rows)
                </span>
              )}
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Prominent Upload Button in Header */}
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Your Dataset</span>
              </button>

              {/* Reset to Sample Dataset Button */}
              <button
                onClick={handleResetData}
                title="Reset to sample dataset"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset to Sample Dataset</span>
              </button>

              <button
                onClick={() => exportTransactionsToCSV(transactions)}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </header>

        {/* Global Feedback Banner */}
        {uploadSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2 mx-auto">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccess}</span>
              {lastValidationStats && (
                <span className="text-emerald-700 font-normal ml-2">
                  ({formatNumber(lastValidationStats.totalRows)} rows, {lastValidationStats.totalColumns} columns, {lastValidationStats.duplicateRows} duplicates cleaned, {lastValidationStats.missingValues} missing values handled)
                </span>
              )}
            </div>
            <button
              onClick={() => setUploadSuccess(null)}
              className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Page Content View */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {currentPage === 'overview' && (
            <OverviewPage
              transactions={transactions}
              customers={customers}
              onNavigate={(page) => setCurrentPage(page as any)}
            />
          )}

          {currentPage === 'sales' && <SalesPage transactions={transactions} />}

          {currentPage === 'geo' && (
            <GeographicPage transactions={transactions} customers={customers} />
          )}

          {currentPage === 'products' && <ProductPage transactions={transactions} />}

          {(currentPage === 'matrix' || currentPage === 'product-performance') && (
            <ProductMatrixPage transactions={transactions} />
          )}

          {currentPage === 'customers' && <CustomerPage customers={customers} />}

          {currentPage === 'segmentation' && (
            <SegmentationPage customers={customers} transactions={transactions} />
          )}

          {currentPage === 'retention' && (
            <RetentionPage transactions={transactions} customers={customers} />
          )}

          {currentPage === 'clv' && (
            <ClvPage transactions={transactions} customers={customers} />
          )}

          {currentPage === 'alerts' && (
            <BusinessAlertsPage transactions={transactions} customers={customers} />
          )}

          {currentPage === 'forecast' && <ForecastPage transactions={transactions} />}

          {currentPage === 'insights' && (
            <InsightsPage
              transactions={transactions}
              customers={customers}
              onNavigate={(page) => setCurrentPage(page as any)}
            />
          )}

          {currentPage === 'ask' && (
            <AskDataPage transactions={transactions} customers={customers} />
          )}

          {currentPage === 'report' && (
            <ExecutiveReportPage transactions={transactions} customers={customers} />
          )}
        </main>
      </div>

      {/* Mobile Drawer Navigation */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setSidebarOpen(false)}
          />

          <div className="relative w-72 max-w-[80%] bg-slate-900 text-slate-300 flex flex-col z-10 shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="font-bold text-white text-sm">E-Commerce Analytics</div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentPage(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-800 space-y-2">
              <button
                onClick={() => {
                  setShowUploadModal(true);
                  setSidebarOpen(false);
                }}
                className="w-full py-2 px-3 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
              >
                Upload Your Dataset
              </button>
              <button
                onClick={() => {
                  handleResetData();
                  setSidebarOpen(false);
                }}
                className="w-full py-2 px-3 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Reset to Sample Dataset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Your Dataset Modal (CSV and Excel) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Upload Your Dataset
                  </h2>
                  <p className="text-xs text-slate-500">
                    Supports CSV (`.csv`) and Excel (`.xlsx`, `.xls`) files
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Upload your custom e-commerce transaction data. The validator will scan headers, count rows and columns, identify missing values, and filter duplicate rows before refreshing all dashboards.
            </p>

            {/* Dropzone File Selector */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-indigo-50/20 hover:bg-indigo-50/40"
            >
              <FileSpreadsheet className="w-9 h-9 text-indigo-500 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-800">
                {isUploading ? 'Validating and reading dataset...' : 'Click to select CSV or Excel (.xlsx) file'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Accepted formats: .csv, .xlsx, .xls
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,application/vnd.ms-excel"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Error Message */}
            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Upload Error:</strong>
                  <span>{uploadError}</span>
                </div>
              </div>
            )}

            {/* Validation & Statistics Display */}
            {lastValidationStats && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>✓ Dataset uploaded successfully</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {lastValidationStats.fileType}: {lastValidationStats.fileName}
                  </span>
                </div>

                {/* 4 Required Calculated Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Rows</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {formatNumber(lastValidationStats.totalRows)}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Columns</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {lastValidationStats.totalColumns}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Duplicate Rows</span>
                    <span className="text-base font-bold text-amber-600 font-mono">
                      {lastValidationStats.duplicateRows}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Missing Values</span>
                    <span className="text-base font-bold text-indigo-600 font-mono">
                      {lastValidationStats.missingValues}
                    </span>
                  </div>
                </div>

                {/* Detected Important Columns Status */}
                <div className="pt-1">
                  <div className="text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Important Columns Checked ({lastValidationStats.matchedColumns.length}/{IMPORTANT_COLUMNS.length}):</span>
                    <span className="text-[10px] text-slate-400 font-normal">Auto-mapped loosely</span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {IMPORTANT_COLUMNS.map((col) => {
                      const isFound = lastValidationStats.matchedColumns.includes(col);
                      return (
                        <span
                          key={col}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            isFound
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isFound ? '✓ ' : '– '}{col}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {lastValidationStats.warnings.length > 0 && (
                  <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-200">
                    {lastValidationStats.warnings.map((w, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={handleResetData}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset to Sample Dataset
              </button>

              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {lastValidationStats ? 'Apply & Explore Dashboards' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Documentation Modal */}
      {showDocsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Portfolio Documentation & Architecture
                </h2>
                <p className="text-xs text-slate-500">
                  Engineering Data Science project blueprint, deployment guide, and stack details
                </p>
              </div>
              <button
                onClick={() => setShowDocsModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <h3 className="font-bold text-slate-900 text-xs">Dataset Upload Feature</h3>
                <p>
                  Users can upload any CSV or Excel (.xlsx) file via <strong>"Upload Your Dataset"</strong>. The client-side parser checks headers, calculates rows, columns, duplicate rows, and missing values, and dynamically replaces the active session dataset across all 11 analytical dashboards. A <strong>"Reset to Sample Dataset"</strong> button instantly restores the default dataset.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex items-center justify-end">
              <button
                onClick={() => setShowDocsModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Documentation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
