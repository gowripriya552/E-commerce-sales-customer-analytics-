# E-Commerce Sales & Customer Analytics: Global Business Intelligence Platform

An enterprise-grade, interactive Business Intelligence and Customer Analytics web application analyzing over 1,200+ multi-year worldwide e-commerce transactions across financial profitability, product velocity, worldwide geographic penetration, RFM customer segmentation, time-series forecasting, and natural language analytics.

![Dashboard Preview](https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80)

---

## 📌 Executive Summary & Problem Statement

Retail leadership teams frequently suffer from **"High Revenue, Poor Profitability"** caused by untracked discounting, high return rates, customer churn, and lack of visibility into global regional variations.

This platform provides answers across 11 integrated modules:
1. **Executive Overview Dashboard:** Real-time net revenue, gross profit, margin %, orders, and period-over-period (MoM) variance badges.
2. **Worldwide Geographic Analytics:** Interactive world map projection and regional ranking across 21+ countries (India, USA, UK, Canada, Germany, Japan, UAE, Brazil, etc.) and major metropolitan hubs (Bengaluru, London, New York, Tokyo, Dubai, etc.).
3. **Sales & Trends Analysis:** Daily and monthly trend tracking with dynamic Country, City, Category, and Date range filtering.
4. **Product Performance Matrix:** Strategic 4-quadrant scatter plot classifying SKUs into *Stars* (High Rev / High Profit), *Cash Drains* (High Rev / Low Profit), *Niche Opportunities* (Low Rev / High Profit), and *Underperformers*.
5. **Product & Catalog Analytics:** Unit velocity, list pricing, wholesale costs, margins, and low-margin (<30%) alert diagnostics.
6. **Customer Behavior & Intelligence:** Customer Lifetime Value (CLV), Repeat Customer Rate, purchase frequency, and spending bracket distributions.
7. **RFM Customer Segmentation:** Statistically grounded quantile scoring ($1$ to $5$) for Recency ($R$), Frequency ($F$), and Monetary ($M$) yielding 6 actionable behavioral cohorts.
8. **Time-Series Sales Forecasting:** Baseline OLS linear trend combined with calendar month seasonality factors ($S_m$), 95% confidence intervals, and 30-Day, 60-Day, 90-Day, 6-Month, and 12-Month horizons.
9. **Algorithmic Business Insights:** Automated diagnostic findings strictly separating factual observation, root-cause analysis, and executive recommendations.
10. **"Ask the Data" Interactive Q&A:** Plain English natural language query engine that calculates exact, verifiable answers directly from live transactions.
11. **Executive PDF / Print Report & CSV Exporter:** Board-ready printable executive briefing with automated business alerts and period comparisons.

---

## 🌍 Global Locations & Expanded Product Catalog

### 21+ Worldwide E-Commerce Markets
* **Asia Pacific:** India (Bengaluru, Mumbai, Delhi, Chennai, Hyderabad, Pune, Davangere, Mysuru, Kolkata, Ahmedabad), Japan (Tokyo, Osaka, Kyoto), China (Shanghai, Beijing, Shenzhen), South Korea (Seoul, Busan), Singapore, Australia (Sydney, Melbourne, Brisbane), New Zealand (Auckland, Wellington).
* **North America:** USA (New York, Los Angeles, Chicago, Houston, Seattle, San Francisco, Austin, Denver, Boston, Miami), Canada (Toronto, Vancouver, Montreal, Calgary, Ottawa), Mexico (Mexico City, Guadalajara, Monterrey).
* **Europe:** UK (London, Manchester, Birmingham, Edinburgh), Germany (Berlin, Munich, Frankfurt), France (Paris, Lyon), Italy (Rome, Milan), Spain (Madrid, Barcelona), Netherlands (Amsterdam, Rotterdam), Switzerland (Zurich, Geneva).
* **Middle East & Africa:** UAE (Dubai, Abu Dhabi), Saudi Arabia (Riyadh, Jeddah), South Africa (Johannesburg, Cape Town).
* **Latin America:** Brazil (São Paulo, Rio de Janeiro).

### 12 Diverse Product Categories
* **Electronics:** Audio, Peripherals, Displays, Accessories
* **Apparel:** Men's Wear, Women's Wear, Activewear, Footwear, Outerwear
* **Home & Kitchen:** Appliances, Cookware, Cutlery, Coffee & Tea
* **Beauty:** Skincare, Suncare
* **Books:** Technical, Business
* **Grocery & Food Essentials:** Cooking Essentials, Beverages, Snacks, Packaged Food
* **Sports, Fitness & Outdoors:** Fitness Equipment, Gym Accessories, Camping, Cycling, Running
* **Toys & Kids:** Educational Toys, Toys, Baby Care, Games
* **Books & Media:** Music, Educational Books, Movies
* **Digital Products:** Online Courses, Digital Templates, Cloud Services, Software
* **Automotive:** Maintenance Products, Car Electronics, Bike Accessories, Car Accessories
* **Pet Care:** Pet Food, Pet Accessories, Pet Health Products

---

## 🛠️ Technology Stack & Architecture

- **Frontend & BI Web Application:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Statistical & Analytical Engine:**
  - Quantile-based RFM scoring and cluster segmentation
  - OLS Linear Trend + Monthly Seasonality Multipliers + 95% Confidence Interval band
  - Custom dataset validator with duplicate detection, missing-value imputation, and Data Hygiene scoring
- **Python / Data Science Stack (Companion Jupyter Notebook):**
  - `pandas`, `numpy`, `matplotlib`, `seaborn`, `statsmodels`, `scikit-learn` (see `requirements.txt`)
- **Data Persistence & Relational Design:**
  - Normalized relational schema mappings for MySQL (`Orders`, `Customers`, `Products`, `Order_Items`).

---

## 📂 Project Directory Structure

```
├── README.md                      # Comprehensive Portfolio Documentation
├── requirements.txt               # Python analytical dependencies
├── index.html                     # Web entry point with dynamic meta tags
├── package.json                   # Web application dependencies & build scripts
├── vite.config.ts                 # Fast Vite bundler configuration
├── src/
│   ├── main.tsx                   # React root entry
│   ├── index.css                  # Global Tailwind CSS styling
│   ├── App.tsx                    # Master layout, navigation, and global state
│   ├── data/
│   │   ├── analyticsEngine.ts     # Worldwide locations, 12 categories, 1,200+ dataset generator, RFM
│   │   ├── forecasting.ts         # Time-series decomposition & confidence band model
│   │   ├── insightsEngine.ts      # Automated business rules diagnostic engine
│   │   └── dataset.ts             # 19-column data dictionary & SQL schema mappings
│   └── components/
│       ├── Charts.tsx             # Interactive SVG BI charts (Dual Area, Horizontal Bar, Forecast CI)
│       ├── CsvManager.tsx         # Data validation, hygiene score, parser, and exporter
│       └── pages/
│           ├── OverviewPage.tsx    # Executive dashboard & MoM KPI variance cards
│           ├── SalesPage.tsx       # Sales trends, country/city filters, payment channels
│           ├── GeographicPage.tsx  # Worldwide interactive map & country/city analytics
│           ├── ProductPage.tsx     # SKU catalog, volume vs margin rankings
│           ├── ProductMatrixPage.tsx # Revenue vs Profit 4-quadrant scatter matrix
│           ├── CustomerPage.tsx    # Customer lifetime value, repeat rate, spending brackets
│           ├── SegmentationPage.tsx# RFM Matrix (Champions, Loyalists, At-Risk, Inactive)
│           ├── ForecastPage.tsx    # 30/60/90-Day & 3/6/12-Month forecast, scenario sensitivity
│           ├── InsightsPage.tsx    # Dynamic data-driven findings (Observation, Root Cause, Action)
│           ├── AskDataPage.tsx     # Plain English analytical Q&A engine
│           └── ExecutiveReportPage.tsx # Board-ready printable executive PDF summary
```

---

## 🚀 Deployment Instructions

### Option 1: Deploy to Vercel / Netlify (Zero Configuration)
1. Fork or push this repository to GitHub.
2. Log into [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
3. Connect your repository.
4. Set Build Command: `npm run build` and Output Directory: `dist`.
5. Deploy to receive a public URL to share on your resume.

### Option 2: Run Locally
```bash
git clone https://github.com/your-username/ecommerce-sales-analytics.git
cd ecommerce-sales-analytics
npm install
npm run dev
```

---

## 📜 License
MIT License. Built for Engineering Data Science and Business Intelligence portfolio demonstration.
