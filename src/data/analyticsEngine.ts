export interface Transaction {
  order_id: string;
  order_date: string; // ISO format YYYY-MM-DD
  customer_id: string;
  customer_name: string;
  customer_age: number;
  customer_gender: 'Female' | 'Male' | 'Other';
  city: string;
  state: string;
  country: string;
  product_id: string;
  product_name: string;
  category: string;
  sub_category: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  discount_percent: number; // 0.0 to 1.0
  payment_method: 'Credit Card' | 'PayPal' | 'Debit Card' | 'UPI' | 'Cash on Delivery';
  order_status: 'Delivered' | 'Shipped' | 'Processing' | 'Cancelled' | 'Returned';
  // Calculated financial fields
  gross_sales: number;
  discount_amount: number;
  net_revenue: number;
  total_cost: number;
  profit: number;
  profit_margin: number;
}

export interface CustomerSummary {
  customer_id: string;
  customer_name: string;
  customer_age: number;
  customer_gender: string;
  city: string;
  state: string;
  country: string;
  total_orders: number;
  total_spend: number;
  total_profit: number;
  avg_order_value: number;
  first_order_date: string;
  last_order_date: string;
  recency_days: number;
  // RFM Scores
  r_score: number;
  f_score: number;
  m_score: number;
  rfm_score: number; // R + F + M sum (3 to 15)
  rfm_code: string;  // e.g. '555', '543'
  rfm_segment: string;
}

export interface LocationInfo {
  country: string;
  region: 'North America' | 'Europe' | 'Asia Pacific' | 'Middle East' | 'Latin America' | 'Africa';
  currency: string;
  cities: { city: string; state: string; lat: number; lng: number }[];
}

export const WORLD_LOCATIONS: LocationInfo[] = [
  {
    country: 'India',
    region: 'Asia Pacific',
    currency: 'INR',
    cities: [
      { city: 'Bengaluru', state: 'Karnataka', lat: 12.97, lng: 77.59 },
      { city: 'Mumbai', state: 'Maharashtra', lat: 19.07, lng: 72.87 },
      { city: 'Delhi', state: 'Delhi', lat: 28.61, lng: 77.20 },
      { city: 'Chennai', state: 'Tamil Nadu', lat: 13.08, lng: 80.27 },
      { city: 'Hyderabad', state: 'Telangana', lat: 17.38, lng: 78.48 },
      { city: 'Pune', state: 'Maharashtra', lat: 18.52, lng: 73.85 },
      { city: 'Davangere', state: 'Karnataka', lat: 14.46, lng: 75.92 },
      { city: 'Mysuru', state: 'Karnataka', lat: 12.29, lng: 76.63 },
      { city: 'Kolkata', state: 'West Bengal', lat: 22.57, lng: 88.36 },
      { city: 'Ahmedabad', state: 'Gujarat', lat: 23.02, lng: 72.57 },
    ],
  },
  {
    country: 'USA',
    region: 'North America',
    currency: 'USD',
    cities: [
      { city: 'New York', state: 'NY', lat: 40.71, lng: -74.00 },
      { city: 'Los Angeles', state: 'CA', lat: 34.05, lng: -118.24 },
      { city: 'Chicago', state: 'IL', lat: 41.87, lng: -87.62 },
      { city: 'Houston', state: 'TX', lat: 29.76, lng: -95.36 },
      { city: 'Seattle', state: 'WA', lat: 47.60, lng: -122.33 },
      { city: 'San Francisco', state: 'CA', lat: 37.77, lng: -122.41 },
      { city: 'Austin', state: 'TX', lat: 30.26, lng: -97.74 },
      { city: 'Denver', state: 'CO', lat: 39.73, lng: -104.99 },
      { city: 'Boston', state: 'MA', lat: 42.36, lng: -71.05 },
      { city: 'Miami', state: 'FL', lat: 25.76, lng: -80.19 },
    ],
  },
  {
    country: 'UK',
    region: 'Europe',
    currency: 'GBP',
    cities: [
      { city: 'London', state: 'Greater London', lat: 51.50, lng: -0.12 },
      { city: 'Manchester', state: 'Greater Manchester', lat: 53.48, lng: -2.24 },
      { city: 'Birmingham', state: 'West Midlands', lat: 52.48, lng: -1.89 },
      { city: 'Liverpool', state: 'Merseyside', lat: 53.40, lng: -2.99 },
      { city: 'Edinburgh', state: 'Scotland', lat: 55.95, lng: -3.18 },
      { city: 'Leeds', state: 'West Yorkshire', lat: 53.80, lng: -1.54 },
    ],
  },
  {
    country: 'Canada',
    region: 'North America',
    currency: 'CAD',
    cities: [
      { city: 'Toronto', state: 'Ontario', lat: 43.65, lng: -79.38 },
      { city: 'Vancouver', state: 'British Columbia', lat: 49.28, lng: -123.12 },
      { city: 'Montreal', state: 'Quebec', lat: 45.50, lng: -73.56 },
      { city: 'Calgary', state: 'Alberta', lat: 51.04, lng: -114.07 },
      { city: 'Ottawa', state: 'Ontario', lat: 45.42, lng: -75.69 },
    ],
  },
  {
    country: 'Germany',
    region: 'Europe',
    currency: 'EUR',
    cities: [
      { city: 'Berlin', state: 'Berlin', lat: 52.52, lng: 13.40 },
      { city: 'Munich', state: 'Bavaria', lat: 48.13, lng: 11.58 },
      { city: 'Hamburg', state: 'Hamburg', lat: 53.55, lng: 9.99 },
      { city: 'Frankfurt', state: 'Hesse', lat: 50.11, lng: 8.68 },
      { city: 'Cologne', state: 'North Rhine-Westphalia', lat: 50.93, lng: 6.96 },
    ],
  },
  {
    country: 'France',
    region: 'Europe',
    currency: 'EUR',
    cities: [
      { city: 'Paris', state: 'Île-de-France', lat: 48.85, lng: 2.35 },
      { city: 'Lyon', state: 'Auvergne-Rhône-Alpes', lat: 45.76, lng: 4.83 },
      { city: 'Marseille', state: 'Provence-Alpes-Côte d\'Azur', lat: 43.29, lng: 5.36 },
      { city: 'Toulouse', state: 'Occitanie', lat: 43.60, lng: 1.44 },
    ],
  },
  {
    country: 'Australia',
    region: 'Asia Pacific',
    currency: 'AUD',
    cities: [
      { city: 'Sydney', state: 'NSW', lat: -33.86, lng: 151.20 },
      { city: 'Melbourne', state: 'VIC', lat: -37.81, lng: 144.96 },
      { city: 'Brisbane', state: 'QLD', lat: -27.46, lng: 153.02 },
      { city: 'Perth', state: 'WA', lat: -31.95, lng: 115.86 },
    ],
  },
  {
    country: 'Japan',
    region: 'Asia Pacific',
    currency: 'JPY',
    cities: [
      { city: 'Tokyo', state: 'Kanto', lat: 35.67, lng: 139.65 },
      { city: 'Osaka', state: 'Kansai', lat: 34.69, lng: 135.50 },
      { city: 'Kyoto', state: 'Kansai', lat: 35.01, lng: 135.76 },
      { city: 'Yokohama', state: 'Kanagawa', lat: 35.44, lng: 139.63 },
    ],
  },
  {
    country: 'Singapore',
    region: 'Asia Pacific',
    currency: 'SGD',
    cities: [
      { city: 'Singapore', state: 'Central', lat: 1.35, lng: 103.81 },
    ],
  },
  {
    country: 'UAE',
    region: 'Middle East',
    currency: 'AED',
    cities: [
      { city: 'Dubai', state: 'Dubai', lat: 25.20, lng: 55.27 },
      { city: 'Abu Dhabi', state: 'Abu Dhabi', lat: 24.45, lng: 54.37 },
      { city: 'Sharjah', state: 'Sharjah', lat: 25.34, lng: 55.42 },
    ],
  },
  {
    country: 'Saudi Arabia',
    region: 'Middle East',
    currency: 'SAR',
    cities: [
      { city: 'Riyadh', state: 'Riyadh', lat: 24.71, lng: 46.67 },
      { city: 'Jeddah', state: 'Makkah', lat: 21.48, lng: 39.19 },
      { city: 'Dammam', state: 'Eastern Province', lat: 26.42, lng: 50.08 },
    ],
  },
  {
    country: 'Brazil',
    region: 'Latin America',
    currency: 'BRL',
    cities: [
      { city: 'São Paulo', state: 'SP', lat: -23.55, lng: -46.63 },
      { city: 'Rio de Janeiro', state: 'RJ', lat: -22.90, lng: -43.17 },
      { city: 'Brasília', state: 'DF', lat: -15.79, lng: -47.88 },
    ],
  },
  {
    country: 'Mexico',
    region: 'Latin America',
    currency: 'MXN',
    cities: [
      { city: 'Mexico City', state: 'CDMX', lat: 19.43, lng: -99.13 },
      { city: 'Guadalajara', state: 'Jalisco', lat: 20.65, lng: -103.34 },
      { city: 'Monterrey', state: 'Nuevo León', lat: 25.68, lng: -100.31 },
    ],
  },
  {
    country: 'South Africa',
    region: 'Africa',
    currency: 'ZAR',
    cities: [
      { city: 'Johannesburg', state: 'Gauteng', lat: -26.20, lng: 28.04 },
      { city: 'Cape Town', state: 'Western Cape', lat: -33.92, lng: 18.42 },
      { city: 'Durban', state: 'KwaZulu-Natal', lat: -29.85, lng: 31.02 },
    ],
  },
  {
    country: 'Netherlands',
    region: 'Europe',
    currency: 'EUR',
    cities: [
      { city: 'Amsterdam', state: 'North Holland', lat: 52.36, lng: 4.90 },
      { city: 'Rotterdam', state: 'South Holland', lat: 51.92, lng: 4.47 },
      { city: 'Utrecht', state: 'Utrecht', lat: 52.09, lng: 5.12 },
    ],
  },
  {
    country: 'Switzerland',
    region: 'Europe',
    currency: 'CHF',
    cities: [
      { city: 'Zurich', state: 'Zurich', lat: 47.37, lng: 8.54 },
      { city: 'Geneva', state: 'Geneva', lat: 46.20, lng: 6.14 },
      { city: 'Basel', state: 'Basel-Stadt', lat: 47.55, lng: 7.58 },
    ],
  },
  {
    country: 'South Korea',
    region: 'Asia Pacific',
    currency: 'KRW',
    cities: [
      { city: 'Seoul', state: 'Seoul Capital Area', lat: 37.56, lng: 126.97 },
      { city: 'Busan', state: 'Yeongnam', lat: 35.17, lng: 129.07 },
    ],
  },
  {
    country: 'China',
    region: 'Asia Pacific',
    currency: 'CNY',
    cities: [
      { city: 'Shanghai', state: 'East China', lat: 31.23, lng: 121.47 },
      { city: 'Beijing', state: 'North China', lat: 39.90, lng: 116.40 },
      { city: 'Shenzhen', state: 'Guangdong', lat: 22.54, lng: 114.05 },
    ],
  },
  {
    country: 'Italy',
    region: 'Europe',
    currency: 'EUR',
    cities: [
      { city: 'Rome', state: 'Lazio', lat: 41.90, lng: 12.49 },
      { city: 'Milan', state: 'Lombardy', lat: 45.46, lng: 9.19 },
    ],
  },
  {
    country: 'Spain',
    region: 'Europe',
    currency: 'EUR',
    cities: [
      { city: 'Madrid', state: 'Community of Madrid', lat: 40.41, lng: -3.70 },
      { city: 'Barcelona', state: 'Catalonia', lat: 41.38, lng: 2.17 },
    ],
  },
  {
    country: 'New Zealand',
    region: 'Asia Pacific',
    currency: 'NZD',
    cities: [
      { city: 'Auckland', state: 'Auckland', lat: -36.84, lng: 174.76 },
      { city: 'Wellington', state: 'Wellington', lat: -41.28, lng: 174.77 },
    ],
  },
];

export const ALL_CATEGORIES = [
  // Existing
  'Electronics',
  'Apparel',
  'Home & Kitchen',
  'Beauty',
  'Books',
  // Newly Added Categories as requested
  'Grocery & Food Essentials',
  'Sports, Fitness & Outdoors',
  'Toys & Kids',
  'Books & Media',
  'Digital Products',
  'Automotive',
  'Pet Care',
] as const;

export interface ProductCatalogItem {
  id: string;
  name: string;
  category: string;
  sub_category: string;
  price: number;
  cost: number;
}

export const PRODUCTS_CATALOG: ProductCatalogItem[] = [
  // 1. Electronics
  { id: 'PROD-TEC-001', name: 'Wireless Noise-Canceling Headphones', category: 'Electronics', sub_category: 'Audio', price: 199.99, cost: 110.00 },
  { id: 'PROD-TEC-002', name: 'Bluetooth Mechanical Keyboard', category: 'Electronics', sub_category: 'Peripherals', price: 89.50, cost: 44.00 },
  { id: 'PROD-TEC-003', name: 'Smart 4K Ultra-HD Monitor 27"', category: 'Electronics', sub_category: 'Displays', price: 349.00, cost: 235.00 },
  { id: 'PROD-TEC-004', name: 'Fast USB-C Multiport Charging Hub', category: 'Electronics', sub_category: 'Accessories', price: 39.99, cost: 14.50 },
  { id: 'PROD-TEC-005', name: 'True Wireless Sport Earbuds', category: 'Electronics', sub_category: 'Audio', price: 79.99, cost: 38.00 },
  { id: 'PROD-TEC-006', name: 'Ergonomic Vertical Wireless Mouse', category: 'Electronics', sub_category: 'Peripherals', price: 54.99, cost: 22.00 },

  // 2. Apparel
  { id: 'PROD-APP-001', name: 'Organic Cotton Crewneck T-Shirt', category: 'Apparel', sub_category: "Men's Wear", price: 28.00, cost: 9.50 },
  { id: 'PROD-APP-002', name: 'High-Waist Performance Yoga Leggings', category: 'Apparel', sub_category: 'Activewear', price: 48.00, cost: 16.00 },
  { id: 'PROD-APP-003', name: 'Waterproof All-Weather Parka', category: 'Apparel', sub_category: 'Outerwear', price: 185.00, cost: 88.00 },
  { id: 'PROD-APP-004', name: 'Merino Wool Knit Sweater', category: 'Apparel', sub_category: "Women's Wear", price: 92.00, cost: 42.00 },
  { id: 'PROD-APP-005', name: 'Classic Low-Top Canvas Sneakers', category: 'Apparel', sub_category: 'Footwear', price: 65.00, cost: 26.00 },
  { id: 'PROD-APP-006', name: 'Breathable Running Windbreaker', category: 'Apparel', sub_category: 'Activewear', price: 74.00, cost: 30.00 },

  // 3. Home & Kitchen
  { id: 'PROD-HOM-001', name: 'Stainless Steel Espresso Machine', category: 'Home & Kitchen', sub_category: 'Appliances', price: 329.99, cost: 198.00 },
  { id: 'PROD-HOM-002', name: 'Enameled Cast Iron Dutch Oven 6-Qt', category: 'Home & Kitchen', sub_category: 'Cookware', price: 89.95, cost: 39.00 },
  { id: 'PROD-HOM-003', name: 'Japanese Chef Knife 8" Damascus', category: 'Home & Kitchen', sub_category: 'Cutlery', price: 119.00, cost: 48.00 },
  { id: 'PROD-HOM-004', name: 'Double-Walled French Press 1L', category: 'Home & Kitchen', sub_category: 'Coffee & Tea', price: 34.50, cost: 12.00 },
  { id: 'PROD-HOM-005', name: 'Smart Air Fryer XL 5.8-Quart', category: 'Home & Kitchen', sub_category: 'Appliances', price: 129.99, cost: 72.00 },

  // 4. Beauty
  { id: 'PROD-BEA-001', name: 'Hydrating Hyaluronic Acid Serum 50ml', category: 'Beauty', sub_category: 'Skincare', price: 26.00, cost: 6.50 },
  { id: 'PROD-BEA-002', name: 'Vitamin C Brightening Daily Oil', category: 'Beauty', sub_category: 'Skincare', price: 32.50, cost: 8.50 },
  { id: 'PROD-BEA-003', name: 'Botanical Clarifying Clay Mask', category: 'Beauty', sub_category: 'Skincare', price: 24.00, cost: 6.00 },
  { id: 'PROD-BEA-004', name: 'SPF 50 Mineral Defense Sunscreen', category: 'Beauty', sub_category: 'Suncare', price: 28.00, cost: 7.50 },

  // 5. Books
  { id: 'PROD-BOO-001', name: 'Python for Data Analysis (3rd Ed)', category: 'Books', sub_category: 'Technical', price: 49.99, cost: 23.00 },
  { id: 'PROD-BOO-002', name: 'Designing Data-Intensive Applications', category: 'Books', sub_category: 'Technical', price: 54.95, cost: 25.00 },
  { id: 'PROD-BOO-003', name: 'The Psychology of Money', category: 'Books', sub_category: 'Business', price: 22.00, cost: 9.00 },

  // 6. Grocery & Food Essentials (New)
  { id: 'PROD-GRO-001', name: 'Cold-Pressed Extra Virgin Olive Oil 1L', category: 'Grocery & Food Essentials', sub_category: 'Cooking Essentials', price: 24.99, cost: 13.50 },
  { id: 'PROD-GRO-002', name: 'Artisanal Single-Origin Roasted Coffee Beans 500g', category: 'Grocery & Food Essentials', sub_category: 'Beverages', price: 19.50, cost: 9.00 },
  { id: 'PROD-GRO-003', name: 'Organic Dark Chocolate Almond Cluster Snacks', category: 'Grocery & Food Essentials', sub_category: 'Snacks', price: 12.99, cost: 5.20 },
  { id: 'PROD-GRO-004', name: 'Himalayan Pink Rock Salt Grinder 380g', category: 'Grocery & Food Essentials', sub_category: 'Cooking Essentials', price: 8.50, cost: 2.80 },
  { id: 'PROD-GRO-005', name: 'Gluten-Free Whole Grain Breakfast Granola', category: 'Grocery & Food Essentials', sub_category: 'Packaged Food', price: 14.50, cost: 6.20 },
  { id: 'PROD-GRO-006', name: 'Herbal Tea Sampler Box (48 Bags)', category: 'Grocery & Food Essentials', sub_category: 'Beverages', price: 16.99, cost: 6.80 },

  // 7. Sports, Fitness & Outdoors (New)
  { id: 'PROD-SPO-001', name: 'Adjustable Quick-Select Dumbbell Pair 24kg', category: 'Sports, Fitness & Outdoors', sub_category: 'Fitness Equipment', price: 279.00, cost: 165.00 },
  { id: 'PROD-SPO-002', name: 'Non-Slip High Density Yoga Mat 6mm', category: 'Sports, Fitness & Outdoors', sub_category: 'Gym Accessories', price: 38.00, cost: 14.00 },
  { id: 'PROD-SPO-003', name: 'Ultralight 2-Person Backpacking Camping Tent', category: 'Sports, Fitness & Outdoors', sub_category: 'Camping', price: 165.00, cost: 89.00 },
  { id: 'PROD-SPO-004', name: 'GPS Heart Rate Cycling Computer', category: 'Sports, Fitness & Outdoors', sub_category: 'Cycling', price: 149.00, cost: 82.00 },
  { id: 'PROD-SPO-005', name: 'Hydration Vest Pack with 2L Bladder', category: 'Sports, Fitness & Outdoors', sub_category: 'Running', price: 68.00, cost: 29.00 },

  // 8. Toys & Kids (New)
  { id: 'PROD-TOY-001', name: 'STEM Robotics Coding & Engineering Kit', category: 'Toys & Kids', sub_category: 'Educational Toys', price: 89.99, cost: 42.00 },
  { id: 'PROD-TOY-002', name: 'Magnetic 3D Building Tiles 100-Piece Set', category: 'Toys & Kids', sub_category: 'Toys', price: 49.99, cost: 21.00 },
  { id: 'PROD-TOY-003', name: 'Organic Bamboo Baby Swaddle Blankets (4-Pack)', category: 'Toys & Kids', sub_category: 'Baby Care', price: 34.00, cost: 13.00 },
  { id: 'PROD-TOY-004', name: 'Strategy Family Board Game Edition', category: 'Toys & Kids', sub_category: 'Games', price: 39.50, cost: 16.50 },

  // 9. Books & Media (New)
  { id: 'PROD-MED-001', name: 'Vinyl Record: 50th Anniversary Master Album', category: 'Books & Media', sub_category: 'Music', price: 34.99, cost: 18.00 },
  { id: 'PROD-MED-002', name: 'Data Visualization & Storytelling Master Book', category: 'Books & Media', sub_category: 'Educational Books', price: 44.95, cost: 19.50 },
  { id: 'PROD-MED-003', name: 'Collector 4K UHD Cinematic Boxset', category: 'Books & Media', sub_category: 'Movies', price: 69.99, cost: 36.00 },

  // 10. Digital Products (New)
  { id: 'PROD-DIG-001', name: 'Full-Stack Data Engineering Certificate (Self-Paced)', category: 'Digital Products', sub_category: 'Online Courses', price: 149.00, cost: 12.00 },
  { id: 'PROD-DIG-002', name: 'Business Intelligence & KPI Dashboard Template Suite', category: 'Digital Products', sub_category: 'Digital Templates', price: 49.00, cost: 3.50 },
  { id: 'PROD-DIG-003', name: 'Enterprise Cloud Analytics Pro 1-Year Subscription', category: 'Digital Products', sub_category: 'Cloud Services', price: 299.00, cost: 35.00 },
  { id: 'PROD-DIG-004', name: 'Developer Productivity Terminal Utility Suite', category: 'Digital Products', sub_category: 'Software', price: 39.00, cost: 2.00 },

  // 11. Automotive (New)
  { id: 'PROD-AUT-001', name: 'High-Accuracy Digital Tire Pressure Gauge & Inflator', category: 'Automotive', sub_category: 'Maintenance Products', price: 39.99, cost: 16.00 },
  { id: 'PROD-AUT-002', name: 'Dual 4K Front & Rear Dash Cam with GPS', category: 'Automotive', sub_category: 'Car Electronics', price: 159.00, cost: 84.00 },
  { id: 'PROD-AUT-003', name: 'Waterproof Magnetic Bike Phone Mount & Charger', category: 'Automotive', sub_category: 'Bike Accessories', price: 29.95, cost: 10.50 },
  { id: 'PROD-AUT-004', name: 'Premium Ceramic Car Coating Wax & Sealant Kit', category: 'Automotive', sub_category: 'Car Accessories', price: 48.00, cost: 18.00 },

  // 12. Pet Care (New)
  { id: 'PROD-PET-001', name: 'Grain-Free Salmon & Sweet Potato Dry Dog Food 12kg', category: 'Pet Care', sub_category: 'Pet Food', price: 64.99, cost: 34.00 },
  { id: 'PROD-PET-002', name: 'Ultra-Quiet Automatic Pet Water Fountain 2.5L', category: 'Pet Care', sub_category: 'Pet Accessories', price: 36.50, cost: 15.00 },
  { id: 'PROD-PET-003', name: 'Orthopedic Memory Foam Pet Bed Large', category: 'Pet Care', sub_category: 'Pet Accessories', price: 79.00, cost: 38.00 },
  { id: 'PROD-PET-004', name: 'Organic Probiotic & Hip Support Soft Chews for Pets', category: 'Pet Care', sub_category: 'Pet Health Products', price: 29.99, cost: 9.50 },
];

export const GLOBAL_CUSTOMERS = [
  // India
  { name: 'Aarav Sharma', gender: 'Male' as const, age: 29, country: 'India', city: 'Bengaluru', state: 'Karnataka' },
  { name: 'Priya Iyer', gender: 'Female' as const, age: 33, country: 'India', city: 'Mumbai', state: 'Maharashtra' },
  { name: 'Rohan Deshmukh', gender: 'Male' as const, age: 26, country: 'India', city: 'Pune', state: 'Maharashtra' },
  { name: 'Ananya Rao', gender: 'Female' as const, age: 31, country: 'India', city: 'Hyderabad', state: 'Telangana' },
  { name: 'Karthik Gowda', gender: 'Male' as const, age: 28, country: 'India', city: 'Davangere', state: 'Karnataka' },
  { name: 'Deepa Hegde', gender: 'Female' as const, age: 35, country: 'India', city: 'Mysuru', state: 'Karnataka' },
  { name: 'Aditya Nair', gender: 'Male' as const, age: 42, country: 'India', city: 'Chennai', state: 'Tamil Nadu' },
  { name: 'Meera Sen', gender: 'Female' as const, age: 30, country: 'India', city: 'Kolkata', state: 'West Bengal' },
  { name: 'Vikram Patel', gender: 'Male' as const, age: 39, country: 'India', city: 'Ahmedabad', state: 'Gujarat' },

  // USA
  { name: 'Sophia Martinez', gender: 'Female' as const, age: 29, country: 'USA', city: 'New York', state: 'NY' },
  { name: 'Liam Chen', gender: 'Male' as const, age: 34, country: 'USA', city: 'San Francisco', state: 'CA' },
  { name: 'Emma Johnson', gender: 'Female' as const, age: 28, country: 'USA', city: 'Chicago', state: 'IL' },
  { name: 'Noah Patel', gender: 'Male' as const, age: 41, country: 'USA', city: 'Austin', state: 'TX' },
  { name: 'Ava Robinson', gender: 'Female' as const, age: 26, country: 'USA', city: 'Seattle', state: 'WA' },
  { name: 'Mason Miller', gender: 'Male' as const, age: 52, country: 'USA', city: 'Miami', state: 'FL' },
  { name: 'Isabella Taylor', gender: 'Female' as const, age: 31, country: 'USA', city: 'Los Angeles', state: 'CA' },
  { name: 'Lucas White', gender: 'Male' as const, age: 23, country: 'USA', city: 'Denver', state: 'CO' },
  { name: 'Mia Davis', gender: 'Female' as const, age: 38, country: 'USA', city: 'Houston', state: 'TX' },

  // UK
  { name: 'Oliver Wilson', gender: 'Male' as const, age: 36, country: 'UK', city: 'London', state: 'Greater London' },
  { name: 'Charlotte Brown', gender: 'Female' as const, age: 30, country: 'UK', city: 'Manchester', state: 'Greater Manchester' },
  { name: 'Harry Evans', gender: 'Male' as const, age: 44, country: 'UK', city: 'Birmingham', state: 'West Midlands' },
  { name: 'Amelia Harris', gender: 'Female' as const, age: 27, country: 'UK', city: 'Edinburgh', state: 'Scotland' },

  // Canada
  { name: 'Ethan Garcia', gender: 'Male' as const, age: 45, country: 'Canada', city: 'Toronto', state: 'Ontario' },
  { name: 'Harper Lewis', gender: 'Female' as const, age: 33, country: 'Canada', city: 'Vancouver', state: 'British Columbia' },
  { name: 'Jean-Luc Tremblay', gender: 'Male' as const, age: 37, country: 'Canada', city: 'Montreal', state: 'Quebec' },

  // Germany
  { name: 'Maximilian Becker', gender: 'Male' as const, age: 35, country: 'Germany', city: 'Berlin', state: 'Berlin' },
  { name: 'Hannah Schmidt', gender: 'Female' as const, age: 32, country: 'Germany', city: 'Munich', state: 'Bavaria' },
  { name: 'Lukas Fischer', gender: 'Male' as const, age: 40, country: 'Germany', city: 'Frankfurt', state: 'Hesse' },

  // France
  { name: 'Camille Dubois', gender: 'Female' as const, age: 29, country: 'France', city: 'Paris', state: 'Île-de-France' },
  { name: 'Antoine Laurent', gender: 'Male' as const, age: 38, country: 'France', city: 'Lyon', state: 'Auvergne-Rhône-Alpes' },

  // Australia
  { name: 'Jack Carter', gender: 'Male' as const, age: 40, country: 'Australia', city: 'Sydney', state: 'NSW' },
  { name: 'Chloe Green', gender: 'Female' as const, age: 32, country: 'Australia', city: 'Melbourne', state: 'VIC' },

  // Japan
  { name: 'Kenji Sato', gender: 'Male' as const, age: 36, country: 'Japan', city: 'Tokyo', state: 'Kanto' },
  { name: 'Yuki Tanaka', gender: 'Female' as const, age: 27, country: 'Japan', city: 'Osaka', state: 'Kansai' },

  // Singapore
  { name: 'Wee Kiat Tan', gender: 'Male' as const, age: 33, country: 'Singapore', city: 'Singapore', state: 'Central' },

  // UAE & Saudi Arabia
  { name: 'Zaid Al-Mansoor', gender: 'Male' as const, age: 41, country: 'UAE', city: 'Dubai', state: 'Dubai' },
  { name: 'Fatima Al-Sayed', gender: 'Female' as const, age: 34, country: 'UAE', city: 'Abu Dhabi', state: 'Abu Dhabi' },
  { name: 'Tariq Al-Harbi', gender: 'Male' as const, age: 39, country: 'Saudi Arabia', city: 'Riyadh', state: 'Riyadh' },

  // Brazil & Mexico
  { name: 'Gabriel Silva', gender: 'Male' as const, age: 31, country: 'Brazil', city: 'São Paulo', state: 'SP' },
  { name: 'Mariana Hernandez', gender: 'Female' as const, age: 28, country: 'Mexico', city: 'Mexico City', state: 'CDMX' },

  // South Africa, Netherlands, Switzerland
  { name: 'Thabo Mokoena', gender: 'Male' as const, age: 36, country: 'South Africa', city: 'Johannesburg', state: 'Gauteng' },
  { name: 'Daan van Dijk', gender: 'Male' as const, age: 38, country: 'Netherlands', city: 'Amsterdam', state: 'North Holland' },
  { name: 'Elena Rossi', gender: 'Female' as const, age: 34, country: 'Switzerland', city: 'Zurich', state: 'Zurich' },
  { name: 'Liam Davies', gender: 'Male' as const, age: 29, country: 'New Zealand', city: 'Auckland', state: 'Auckland' },
];

/**
 * Generate 1,200+ realistic worldwide e-commerce transactions across 2023-2024
 */
export function generateRealisticDataset(): Transaction[] {
  const transactions: Transaction[] = [];
  const paymentMethods: Array<Transaction['payment_method']> = [
    'Credit Card',
    'PayPal',
    'Debit Card',
    'UPI',
    'Cash on Delivery',
  ];

  const customerBase = GLOBAL_CUSTOMERS.map((c, i) => ({
    id: `CUST-${1000 + i + 1}`,
    ...c,
  }));

  let seed = 43210;
  function random(): number {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  let orderSequence = 2001;

  // Generate over 24 months (2023-01 to 2024-12)
  for (let year = 2023; year <= 2024; year++) {
    for (let month = 1; month <= 12; month++) {
      let monthFactor = 1.0;
      if (month === 11) monthFactor = 1.65; // Black Friday / Diwali peak
      if (month === 12) monthFactor = 1.85; // Holiday Peak
      if (month === 1) monthFactor = 0.85; // Post-holiday lull
      if (month === 7) monthFactor = 0.95; // Summer sales

      // Generates ~ 45 to 60 orders per month
      const ordersInMonth = Math.floor((45 + random() * 15) * monthFactor);

      for (let o = 0; o < ordersInMonth; o++) {
        // Pareto customer repeat bias: top 30% customers place 65% of repeat orders
        let custIndex: number;
        if (random() < 0.65) {
          custIndex = Math.floor(random() * (customerBase.length * 0.35));
        } else {
          custIndex = Math.floor(random() * customerBase.length);
        }
        const cust = customerBase[custIndex];

        const maxDay = month === 2 ? 28 : [4, 6, 9, 11].includes(month) ? 30 : 31;
        const day = Math.floor(random() * maxDay) + 1;
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // 1 to 3 items per order basket
        const itemsCount = random() < 0.65 ? 1 : random() < 0.88 ? 2 : 3;
        const orderId = `ORD-${year}-${orderSequence++}`;

        for (let item = 0; item < itemsCount; item++) {
          const product = PRODUCTS_CATALOG[Math.floor(random() * PRODUCTS_CATALOG.length)];
          const quantity = Math.floor(random() * 3) + 1;

          // Discounts: heavier in Q4, moderate otherwise
          let discount = 0;
          const discRoll = random();
          if (month === 11 || month === 12) {
            discount = discRoll < 0.25 ? 0.10 : discRoll < 0.55 ? 0.15 : discRoll < 0.82 ? 0.20 : 0.25;
          } else {
            discount = discRoll < 0.48 ? 0 : discRoll < 0.75 ? 0.05 : discRoll < 0.90 ? 0.10 : 0.15;
          }

          // Realistic fulfillment status
          const statusRoll = random();
          let orderStatus: Transaction['order_status'] = 'Delivered';
          if (statusRoll > 0.975) orderStatus = 'Returned';
          else if (statusRoll > 0.95) orderStatus = 'Cancelled';
          else if (year === 2024 && month === 12 && statusRoll > 0.85) orderStatus = 'Shipped';

          // Payment method preferences (UPI popular in India, PayPal in UK/Germany, Credit Card in US/UAE)
          let paymentMethod = paymentMethods[Math.floor(random() * paymentMethods.length)];
          if (cust.country === 'India' && random() < 0.65) paymentMethod = 'UPI';
          if (cust.country === 'USA' && random() < 0.60) paymentMethod = 'Credit Card';

          const gross_sales = Number((quantity * product.price).toFixed(2));
          const discount_amount = Number((gross_sales * discount).toFixed(2));
          const net_revenue = Number((gross_sales - discount_amount).toFixed(2));
          const total_cost = Number((quantity * product.cost).toFixed(2));
          const profit = Number((net_revenue - total_cost).toFixed(2));
          const profit_margin = net_revenue > 0 ? Number(((profit / net_revenue) * 100).toFixed(2)) : 0;

          transactions.push({
            order_id: orderId,
            order_date: dateStr,
            customer_id: cust.id,
            customer_name: cust.name,
            customer_age: cust.age,
            customer_gender: cust.gender,
            city: cust.city,
            state: cust.state,
            country: cust.country,
            product_id: product.id,
            product_name: product.name,
            category: product.category,
            sub_category: product.sub_category,
            quantity,
            unit_price: product.price,
            unit_cost: product.cost,
            discount_percent: discount,
            payment_method: paymentMethod,
            order_status: orderStatus,
            gross_sales,
            discount_amount,
            net_revenue,
            total_cost,
            profit,
            profit_margin,
          });
        }
      }
    }
  }

  return transactions.sort((a, b) => a.order_date.localeCompare(b.order_date));
}

/**
 * Calculate customer RFM segmentation with dynamic reference date and country preservation
 */
export function calculateCustomerAnalytics(
  transactions: Transaction[],
  analysisDate?: string
): CustomerSummary[] {
  const validTrans = transactions.filter(
    (t) => t.order_status === 'Delivered' || t.order_status === 'Shipped'
  );

  if (validTrans.length === 0) return [];

  const customerMap = new Map<string, {
    orders: Set<string>;
    totalSpend: number;
    totalProfit: number;
    dates: string[];
    name: string;
    age: number;
    gender: string;
    city: string;
    state: string;
    country: string;
  }>();

  let maxOrderDate = '';

  for (const t of validTrans) {
    if (!maxOrderDate || t.order_date > maxOrderDate) {
      maxOrderDate = t.order_date;
    }

    if (!customerMap.has(t.customer_id)) {
      customerMap.set(t.customer_id, {
        orders: new Set(),
        totalSpend: 0,
        totalProfit: 0,
        dates: [],
        name: t.customer_name,
        age: t.customer_age,
        gender: t.customer_gender,
        city: t.city,
        state: t.state,
        country: t.country || 'USA',
      });
    }
    const entry = customerMap.get(t.customer_id)!;
    entry.orders.add(t.order_id);
    entry.totalSpend += t.net_revenue;
    entry.totalProfit += t.profit;
    entry.dates.push(t.order_date);
  }

  // Dynamic snapshot reference date: exactly 1 day after the latest transaction in active dataset
  // Automatically recalculates when any new dataset is uploaded
  const analysisTime = analysisDate
    ? new Date(analysisDate).getTime()
    : maxOrderDate
      ? new Date(maxOrderDate).getTime() + 86400000
      : new Date().getTime();

  const customersRaw = Array.from(customerMap.entries()).map(([id, data]) => {
    data.dates.sort();
    const firstDate = data.dates[0];
    const lastDate = data.dates[data.dates.length - 1];
    const lastOrderTime = new Date(lastDate).getTime();
    const recencyDays = Math.max(0, Math.floor((analysisTime - lastOrderTime) / (1000 * 60 * 60 * 24)));
    const totalOrders = data.orders.size;
    const totalSpend = Number(data.totalSpend.toFixed(2));
    const totalProfit = Number(data.totalProfit.toFixed(2));
    const aov = totalOrders > 0 ? Number((totalSpend / totalOrders).toFixed(2)) : 0;

    return {
      customer_id: id,
      customer_name: data.name,
      customer_age: data.age,
      customer_gender: data.gender,
      city: data.city,
      state: data.state,
      country: data.country,
      total_orders: totalOrders,
      total_spend: totalSpend,
      total_profit: totalProfit,
      avg_order_value: aov,
      first_order_date: firstDate,
      last_order_date: lastDate,
      recency_days: recencyDays,
      r_score: 1,
      f_score: 1,
      m_score: 1,
      rfm_score: 3,
      rfm_code: '111',
      rfm_segment: '',
    };
  });

  const N = customersRaw.length;
  if (N === 0) return [];

  const recencies = [...customersRaw.map((c) => c.recency_days)].sort((a, b) => a - b);
  const frequencies = [...customersRaw.map((c) => c.total_orders)].sort((a, b) => a - b);
  const monetaries = [...customersRaw.map((c) => c.total_spend)].sort((a, b) => a - b);

  function getQuantile(arr: number[], q: number): number {
    const pos = (arr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (arr[base + 1] !== undefined) {
      return arr[base] + rest * (arr[base + 1] - arr[base]);
    }
    return arr[base];
  }

  const r20 = getQuantile(recencies, 0.2);
  const r40 = getQuantile(recencies, 0.4);
  const r60 = getQuantile(recencies, 0.6);
  const r80 = getQuantile(recencies, 0.8);

  const m20 = getQuantile(monetaries, 0.2);
  const m40 = getQuantile(monetaries, 0.4);
  const m60 = getQuantile(monetaries, 0.6);
  const m80 = getQuantile(monetaries, 0.8);

  // For frequency, compute percentiles or rank if discrete
  const fMax = frequencies[frequencies.length - 1];

  return customersRaw.map((cust) => {
    // Recency: Lower days = more recent = higher score (5)
    let r = 1;
    if (cust.recency_days <= r20) r = 5;
    else if (cust.recency_days <= r40) r = 4;
    else if (cust.recency_days <= r60) r = 3;
    else if (cust.recency_days <= r80) r = 2;

    // Frequency: Higher orders = higher score (5)
    let f = 1;
    if (fMax > 4) {
      const fRank = frequencies.filter((x) => x < cust.total_orders).length / N;
      if (fRank >= 0.8 || cust.total_orders >= 5) f = 5;
      else if (fRank >= 0.6 || cust.total_orders >= 4) f = 4;
      else if (fRank >= 0.4 || cust.total_orders >= 3) f = 3;
      else if (fRank >= 0.2 || cust.total_orders >= 2) f = 2;
      else f = 1;
    } else {
      if (cust.total_orders >= 4) f = 5;
      else if (cust.total_orders === 3) f = 4;
      else if (cust.total_orders === 2) f = 3;
      else if (cust.total_orders === 1 && fMax === 1) f = 3;
      else f = 1;
    }

    // Monetary: Higher spend = higher score (5)
    let m = 1;
    if (cust.total_spend >= m80) m = 5;
    else if (cust.total_spend >= m60) m = 4;
    else if (cust.total_spend >= m40) m = 3;
    else if (cust.total_spend >= m20) m = 2;

    const rfm_score = r + f + m;
    const rfm_code = `${r}${f}${m}`;

    // Standard E-Commerce RFM Segmentation
    let segment = 'Potential Loyal Customers';
    if (r >= 4 && f >= 4 && m >= 4) {
      segment = 'Champions / VIP';
    } else if (r <= 2 && f >= 4 && m >= 4) {
      segment = 'Cannot Lose Them';
    } else if (r >= 3 && f >= 3 && m >= 3) {
      segment = 'Loyal Customers';
    } else if (r <= 2 && (f >= 3 || m >= 3)) {
      segment = 'At-Risk Customers';
    } else if (r >= 4 && f <= 1) {
      segment = 'New Customers';
    } else if (r >= 3 && f <= 2 && m >= 2) {
      segment = 'Promising Customers';
    } else if (r >= 3 && f >= 2) {
      segment = 'Potential Loyal Customers';
    } else if (r <= 2 && (f >= 2 || m >= 2)) {
      segment = 'Hibernating Customers';
    } else {
      segment = 'Lost / Inactive Customers';
    }

    return {
      ...cust,
      r_score: r,
      f_score: f,
      m_score: m,
      rfm_score,
      rfm_code,
      rfm_segment: segment,
    };
  }).sort((a, b) => b.total_spend - a.total_spend);
}

/**
 * Period-over-period comparative metrics calculator
 */
export function calculatePeriodComparison(transactions: Transaction[]) {
  const valid = transactions.filter((t) => t.order_status === 'Delivered' || t.order_status === 'Shipped');
  if (valid.length === 0) {
    return {
      currentRev: 0,
      previousRev: 0,
      revChangePct: 0,
      currentProfit: 0,
      previousProfit: 0,
      profitChangePct: 0,
      currentOrders: 0,
      previousOrders: 0,
      ordersChangePct: 0,
      currentAov: 0,
      previousAov: 0,
      aovChangePct: 0,
    };
  }

  // Get list of distinct months sorted
  const monthMap = new Map<string, { revenue: number; profit: number; orders: Set<string> }>();
  for (const t of valid) {
    const key = t.order_date.substring(0, 7); // YYYY-MM
    const cur = monthMap.get(key) || { revenue: 0, profit: 0, orders: new Set() };
    cur.revenue += t.net_revenue;
    cur.profit += t.profit;
    cur.orders.add(t.order_id);
    monthMap.set(key, cur);
  }

  const sortedMonths = Array.from(monthMap.keys()).sort();
  if (sortedMonths.length < 2) {
    const only = monthMap.get(sortedMonths[0])!;
    return {
      currentRev: only.revenue,
      previousRev: only.revenue,
      revChangePct: 0,
      currentProfit: only.profit,
      previousProfit: only.profit,
      profitChangePct: 0,
      currentOrders: only.orders.size,
      previousOrders: only.orders.size,
      ordersChangePct: 0,
      currentAov: only.orders.size > 0 ? only.revenue / only.orders.size : 0,
      previousAov: only.orders.size > 0 ? only.revenue / only.orders.size : 0,
      aovChangePct: 0,
    };
  }

  const latestMonthKey = sortedMonths[sortedMonths.length - 1];
  const prevMonthKey = sortedMonths[sortedMonths.length - 2];

  const cur = monthMap.get(latestMonthKey)!;
  const prev = monthMap.get(prevMonthKey)!;

  const revChangePct = prev.revenue > 0 ? ((cur.revenue - prev.revenue) / prev.revenue) * 100 : 0;
  const profitChangePct = prev.profit > 0 ? ((cur.profit - prev.profit) / prev.profit) * 100 : 0;
  const ordersChangePct = prev.orders.size > 0 ? ((cur.orders.size - prev.orders.size) / prev.orders.size) * 100 : 0;

  const curAov = cur.orders.size > 0 ? cur.revenue / cur.orders.size : 0;
  const prevAov = prev.orders.size > 0 ? prev.revenue / prev.orders.size : 0;
  const aovChangePct = prevAov > 0 ? ((curAov - prevAov) / prevAov) * 100 : 0;

  return {
    currentRev: cur.revenue,
    previousRev: prev.revenue,
    revChangePct: Number(revChangePct.toFixed(1)),
    currentProfit: cur.profit,
    previousProfit: prev.profit,
    profitChangePct: Number(profitChangePct.toFixed(1)),
    currentOrders: cur.orders.size,
    previousOrders: prev.orders.size,
    ordersChangePct: Number(ordersChangePct.toFixed(1)),
    currentAov: curAov,
    previousAov: prevAov,
    aovChangePct: Number(aovChangePct.toFixed(1)),
    latestMonthKey,
    prevMonthKey,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat('en-US').format(val);
}
