import { RawTransaction, INITIAL_SAMPLE_ROWS } from './dataset';

const CITIES_STATES = [
  { city: 'New York', state: 'NY' },
  { city: 'Los Angeles', state: 'CA' },
  { city: 'Chicago', state: 'IL' },
  { city: 'Houston', state: 'TX' },
  { city: 'Phoenix', state: 'AZ' },
  { city: 'San Francisco', state: 'CA' },
  { city: 'Seattle', state: 'WA' },
  { city: 'Austin', state: 'TX' },
  { city: 'Denver', state: 'CO' },
  { city: 'Boston', state: 'MA' },
  { city: 'Miami', state: 'FL' },
  { city: 'Atlanta', state: 'GA' },
];

const PRODUCTS = [
  { id: 'PROD-TEC-001', name: 'Wireless Noise-Canceling Headphones', category: 'Electronics', sub_category: 'Audio', price: 199.99, cost: 110.00 },
  { id: 'PROD-TEC-002', name: 'Bluetooth Mechanical Keyboard', category: 'Electronics', sub_category: 'Peripherals', price: 89.50, cost: 42.00 },
  { id: 'PROD-TEC-003', name: 'Smart 4K Ultra-HD Monitor 27-inch', category: 'Electronics', sub_category: 'Displays', price: 349.00, cost: 230.00 },
  { id: 'PROD-TEC-004', name: 'Fast USB-C Multiport Charging Hub', category: 'Electronics', sub_category: 'Accessories', price: 39.99, cost: 14.50 },
  { id: 'PROD-TEC-005', name: 'Noise-Isolating Gaming Headset', category: 'Electronics', sub_category: 'Audio', price: 79.99, cost: 35.00 },
  { id: 'PROD-APP-001', name: 'Organic Cotton Crewneck T-Shirt', category: 'Apparel', sub_category: "Men's Wear", price: 28.00, cost: 11.00 },
  { id: 'PROD-APP-002', name: 'Seamless High-Waist Yoga Leggings', category: 'Apparel', sub_category: 'Activewear', price: 48.00, cost: 17.50 },
  { id: 'PROD-APP-003', name: 'Waterproof All-Weather Parka', category: 'Apparel', sub_category: 'Outerwear', price: 185.00, cost: 95.00 },
  { id: 'PROD-APP-004', name: 'Merino Wool Knit Sweater', category: 'Apparel', sub_category: "Women's Wear", price: 92.00, cost: 44.00 },
  { id: 'PROD-APP-005', name: 'Everyday Canvas Sneakers', category: 'Apparel', sub_category: 'Footwear', price: 65.00, cost: 28.00 },
  { id: 'PROD-HOM-001', name: 'Stainless Steel Espresso Machine', category: 'Home & Kitchen', sub_category: 'Appliances', price: 329.99, cost: 195.00 },
  { id: 'PROD-HOM-002', name: 'Cast Iron Dutch Oven 6-Quart', category: 'Home & Kitchen', sub_category: 'Cookware', price: 89.95, cost: 40.00 },
  { id: 'PROD-HOM-003', name: 'Japanese Chef Knife 8-inch Damascus', category: 'Home & Kitchen', sub_category: 'Cutlery', price: 119.00, cost: 52.00 },
  { id: 'PROD-HOM-004', name: 'Double-Walled Glass French Press', category: 'Home & Kitchen', sub_category: 'Coffee & Tea', price: 34.50, cost: 12.00 },
  { id: 'PROD-BEA-001', name: 'Hydrating Hyaluronic Acid Serum 50ml', category: 'Beauty', sub_category: 'Skincare', price: 26.00, cost: 7.00 },
  { id: 'PROD-BEA-002', name: 'Vitamin C Brightening Daily Oil', category: 'Beauty', sub_category: 'Skincare', price: 32.50, cost: 9.00 },
  { id: 'PROD-BEA-003', name: 'Botanical Clarifying Clay Mask', category: 'Beauty', sub_category: 'Skincare', price: 24.00, cost: 6.50 },
  { id: 'PROD-BOO-001', name: 'Python for Data Analysis (3rd Edition)', category: 'Books', sub_category: 'Technical', price: 49.99, cost: 24.00 },
  { id: 'PROD-BOO-002', name: 'Designing Data-Intensive Applications', category: 'Books', sub_category: 'Technical', price: 54.95, cost: 26.00 },
  { id: 'PROD-BOO-003', name: 'The Psychology of Money', category: 'Books', sub_category: 'Business', price: 22.00, cost: 9.50 },
];

const CUSTOMERS = [
  { id: 'CUST-101', name: 'Sophia Martinez', age: 29, gender: 'Female', city: 'New York', state: 'NY' },
  { id: 'CUST-102', name: 'Liam Chen', age: 34, gender: 'Male', city: 'San Francisco', state: 'CA' },
  { id: 'CUST-103', name: 'Emma Johnson', age: 28, gender: 'Female', city: 'Chicago', state: 'IL' },
  { id: 'CUST-104', name: 'Noah Patel', age: 41, gender: 'Male', city: 'Austin', state: 'TX' },
  { id: 'CUST-105', name: 'Ava Robinson', age: 26, gender: 'Female', city: 'Seattle', state: 'WA' },
  { id: 'CUST-106', name: 'Mason Miller', age: 52, gender: 'Male', city: 'Miami', state: 'FL' },
  { id: 'CUST-107', name: 'Isabella Taylor', age: 31, gender: 'Female', city: 'New York', state: 'NY' },
  { id: 'CUST-108', name: 'Lucas White', age: 23, gender: 'Male', city: 'Denver', state: 'CO' },
  { id: 'CUST-109', name: 'Mia Davis', age: 38, gender: 'Female', city: 'Austin', state: 'TX' },
  { id: 'CUST-110', name: 'Ethan Garcia', age: 45, gender: 'Male', city: 'Phoenix', state: 'AZ' },
  { id: 'CUST-111', name: 'Charlotte Brown', age: 30, gender: 'Female', city: 'Chicago', state: 'IL' },
  { id: 'CUST-112', name: 'Oliver Wilson', age: 36, gender: 'Male', city: 'Seattle', state: 'WA' },
  { id: 'CUST-113', name: 'Amelia Harris', age: 27, gender: 'Female', city: 'Boston', state: 'MA' },
  { id: 'CUST-114', name: 'Elijah Clark', age: 49, gender: 'Male', city: 'Houston', state: 'TX' },
  { id: 'CUST-115', name: 'Harper Lewis', age: 33, gender: 'Female', city: 'Los Angeles', state: 'CA' },
  { id: 'CUST-116', name: 'James Walker', age: 61, gender: 'Male', city: 'Atlanta', state: 'GA' },
  { id: 'CUST-117', name: 'Evelyn Hall', age: 24, gender: 'Female', city: 'New York', state: 'NY' },
  { id: 'CUST-118', name: 'Alexander Allen', age: 39, gender: 'Male', city: 'San Francisco', state: 'CA' },
  { id: 'CUST-119', name: 'Abigail Young', age: 42, gender: 'Female', city: 'Denver', state: 'CO' },
  { id: 'CUST-120', name: 'Benjamin King', age: 35, gender: 'Male', city: 'Chicago', state: 'IL' },
];

export function generateFullDataset(count = 120): RawTransaction[] {
  const result: RawTransaction[] = [...INITIAL_SAMPLE_ROWS];
  const paymentMethods = ['Credit Card', 'PayPal', 'Debit Card', 'UPI', 'Cash on Delivery'];
  const discounts = [0.0, 0.0, 0.05, 0.10, 0.15, 0.20, 0.25];

  let currentId = 1013;
  for (let i = result.length; i < count; i++) {
    const cust = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
    const prod = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    const year = Math.random() > 0.35 ? 2023 : 2024;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Intentional data quality quirks for teaching:
    const isDirtyDate = i % 23 === 0;
    const isMissingAge = i % 17 === 0;
    const isLowercaseCity = i % 19 === 0;
    const isNegativeQty = i % 29 === 0;

    const formattedDate = isDirtyDate
      ? `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
      : dateStr;

    const quantity = isNegativeQty ? -1 : Math.floor(Math.random() * 3) + 1;
    const orderStatus = isNegativeQty
      ? 'Returned'
      : Math.random() > 0.08
      ? 'Delivered'
      : Math.random() > 0.5
      ? 'Shipped'
      : 'Cancelled';

    result.push({
      order_id: `ORD-${year}-${currentId++}`,
      order_date: formattedDate,
      customer_id: cust.id,
      customer_name: cust.name,
      customer_age: isMissingAge ? null : cust.age,
      customer_gender: cust.gender,
      city: isLowercaseCity ? cust.city.toLowerCase() : cust.city,
      state: cust.state,
      country: 'United States',
      product_id: prod.id,
      product_name: prod.name,
      category: prod.category,
      sub_category: prod.sub_category,
      quantity: quantity,
      unit_price: prod.price,
      unit_cost: prod.cost,
      discount_percent: discounts[Math.floor(Math.random() * discounts.length)],
      payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      order_status: orderStatus,
    });
  }

  return result;
}
