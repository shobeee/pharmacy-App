// ============================================================
// appConfig.js — ONE FILE to transform this app for any business
// ============================================================
// 1. Change BUSINESS_TYPE to pick a preset, OR
// 2. Set USE_CUSTOM = true and fill in everything below
// ============================================================

const BUSINESS_TYPE = 'pharmacy';
const USE_CUSTOM = false;  // set true to ignore presets and use your own values below

// ---------------------------------------------------------------------------
// Per‑business presets
// ---------------------------------------------------------------------------
const PRESETS = {
  pharmacy: {
    name: 'Al‑Shifa Pharmacy',
    tagline: 'Your trusted health partner',
    emoji: '💊',
    icon: 'medkit-outline',
    categories: ['All', 'Tablets', 'Syrups', 'Injections', 'Drops', 'Capsules', 'Ointments'],
    statusSteps: ['Order Placed', 'Confirmed', 'Processing', 'Out for Delivery', 'Completed'],
    trackingSteps: [
      { title: 'Order Placed',        desc: 'Your order has been received.',                                icon: 'receipt-outline' },
      { title: 'Confirmed',           desc: 'The pharmacy has reviewed your order.',                        icon: 'checkmark-circle-outline' },
      { title: 'Processing',          desc: 'Your items are being prepared.',                               icon: 'cube-outline' },
      { title: 'Out for Delivery',    desc: 'Your package is on its way.',                                  icon: 'bicycle-outline' },
      { title: 'Completed',           desc: 'Order completed successfully.',                                icon: 'checkmark-done-circle-outline' },
    ],
    colors: {
      primary: '#2E7D32',
      secondary: '#81C784',
      background: '#F5F7F6',
      surface: '#FFFFFF',
      textPrimary: '#1C2A22',
      textSecondary: '#66756C',
      border: '#E0E5E2',
    },
    currency: 'PKR',
  },

  electronics: {
    name: 'Tech Mart',
    tagline: 'Powering your world',
    emoji: '🔌',
    icon: 'flash-outline',
    categories: ['All', 'Mobiles', 'Laptops', 'Audio', 'Accessories', 'Home Appliances', 'Gaming'],
    statusSteps: ['Order Placed', 'Confirmed', 'Processing', 'Out for Delivery', 'Completed'],
    trackingSteps: [
      { title: 'Order Placed',        desc: 'Your order has been received.',                                icon: 'receipt-outline' },
      { title: 'Confirmed',           desc: 'We verified stock and confirmed your order.',                  icon: 'checkmark-circle-outline' },
      { title: 'Processing',          desc: 'Your items are being tested and packed.',                      icon: 'cube-outline' },
      { title: 'Out for Delivery',    desc: 'Your package is on its way.',                                  icon: 'bicycle-outline' },
      { title: 'Completed',           desc: 'Delivered successfully. Enjoy!',                               icon: 'checkmark-done-circle-outline' },
    ],
    colors: {
      primary: '#1565C0',
      secondary: '#64B5F6',
      background: '#F5F7FA',
      surface: '#FFFFFF',
      textPrimary: '#1A2332',
      textSecondary: '#6B7A8D',
      border: '#DEE3E9',
    },
    currency: 'PKR',
  },

  boutique: {
    name: 'Elegance Boutique',
    tagline: 'Style that speaks',
    emoji: '👗',
    icon: 'shirt-outline',
    categories: ['All', 'Dresses', 'Tops', 'Bottoms', 'Accessories', 'Footwear', 'Sale'],
    statusSteps: ['Order Placed', 'Confirmed', 'Processing', 'Shipped', 'Delivered'],
    trackingSteps: [
      { title: 'Order Placed',        desc: 'Your order has been received.',                                icon: 'receipt-outline' },
      { title: 'Confirmed',           desc: 'Your order is confirmed and being prepared.',                  icon: 'checkmark-circle-outline' },
      { title: 'Processing',          desc: 'We are carefully packing your items.',                         icon: 'cube-outline' },
      { title: 'Shipped',             desc: 'Your package has been handed to the courier.',                 icon: 'bicycle-outline' },
      { title: 'Delivered',           desc: 'Delivered! Thank you for shopping with us.',                   icon: 'checkmark-done-circle-outline' },
    ],
    colors: {
      primary: '#C2185B',
      secondary: '#F48FB1',
      background: '#FDF8FA',
      surface: '#FFFFFF',
      textPrimary: '#2D1B24',
      textSecondary: '#7A6A72',
      border: '#EDE4E8',
    },
    currency: 'PKR',
  },

  general: {
    name: 'City Mart',
    tagline: 'Everything you need',
    emoji: '🛒',
    icon: 'cart-outline',
    categories: ['All', 'Electronics', 'Clothing', 'Home', 'Groceries', 'Toys', 'Stationery'],
    statusSteps: ['Order Placed', 'Confirmed', 'Processing', 'Out for Delivery', 'Completed'],
    trackingSteps: [
      { title: 'Order Placed',        desc: 'Your order has been received.',                                icon: 'receipt-outline' },
      { title: 'Confirmed',           desc: 'Your order is confirmed.',                                    icon: 'checkmark-circle-outline' },
      { title: 'Processing',          desc: 'We are gathering your items.',                                 icon: 'cube-outline' },
      { title: 'Out for Delivery',    desc: 'Your order is on its way.',                                    icon: 'bicycle-outline' },
      { title: 'Completed',           desc: 'Delivered successfully!',                                     icon: 'checkmark-done-circle-outline' },
    ],
    colors: {
      primary: '#FF6F00',
      secondary: '#FFB74D',
      background: '#FEFCF5',
      surface: '#FFFFFF',
      textPrimary: '#2C2416',
      textSecondary: '#7A7262',
      border: '#EDE8DE',
    },
    currency: 'PKR',
  },

  grocery: {
    name: 'Fresh Bazaar',
    tagline: 'Farm to table',
    emoji: '🥦',
    icon: 'nutrition-outline',
    categories: ['All', 'Fruits', 'Vegetables', 'Dairy', 'Bakery', 'Beverages', 'Snacks'],
    statusSteps: ['Order Placed', 'Confirmed', 'Processing', 'Out for Delivery', 'Completed'],
    trackingSteps: [
      { title: 'Order Placed',        desc: 'Your order has been received.',                                icon: 'receipt-outline' },
      { title: 'Confirmed',           desc: 'We are picking fresh items for you.',                          icon: 'checkmark-circle-outline' },
      { title: 'Processing',          desc: 'Your groceries are being packed.',                             icon: 'cube-outline' },
      { title: 'Out for Delivery',    desc: 'Your order is on its way.',                                    icon: 'bicycle-outline' },
      { title: 'Completed',           desc: 'Delivered! Enjoy your fresh items.',                           icon: 'checkmark-done-circle-outline' },
    ],
    colors: {
      primary: '#558B2F',
      secondary: '#8BC34A',
      background: '#F6FAF2',
      surface: '#FFFFFF',
      textPrimary: '#1E2E14',
      textSecondary: '#667A5A',
      border: '#E0E8D8',
    },
    currency: 'PKR',
  },
};

// ---------------------------------------------------------------------------
// Custom override — fill this in when USE_CUSTOM = true
// ---------------------------------------------------------------------------
const CUSTOM = {
  name: 'My Store',
  tagline: 'Welcome',
  emoji: '🛍️',
  icon: 'storefront-outline',

  colors: {
    primary: '#2E7D32',
    secondary: '#81C784',
    background: '#F5F7F6',
    surface: '#FFFFFF',
    textPrimary: '#1C2A22',
    textSecondary: '#66756C',
    border: '#E0E5E2',
  },

  currency: 'PKR',
  categories: ['All', 'Category 1', 'Category 2', 'Category 3'],
  statusSteps: ['Order Placed', 'Confirmed', 'Processing', 'Out for Delivery', 'Completed'],
  trackingSteps: [
    { title: 'Order Placed',     desc: 'Your order has been received.',       icon: 'receipt-outline' },
    { title: 'Confirmed',        desc: 'Your order is confirmed.',             icon: 'checkmark-circle-outline' },
    { title: 'Processing',       desc: 'Your items are being prepared.',       icon: 'cube-outline' },
    { title: 'Out for Delivery', desc: 'Your package is on its way.',          icon: 'bicycle-outline' },
    { title: 'Completed',        desc: 'Delivered successfully.',              icon: 'checkmark-done-circle-outline' },
  ],

  // ── Firebase ──────────────────────────────────────────────
  firebase: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT',
    storageBucket: 'YOUR_PROJECT.firebasestorage.app',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
    measurementId: 'YOUR_MEASUREMENT_ID',
  },

  // ── Firestore collection names ────────────────────────────
  collections: {
    Orders: 'Orders',
    Products: 'Products',
    Users: 'Users',
    SystemAccess: 'SystemAccess',
    AdminDeviceTokens: 'AdminDeviceTokens',
    AppConfig: 'AppConfig',
  },
};

// ---------------------------------------------------------------------------
// Resolve current preset
// ---------------------------------------------------------------------------
const preset = USE_CUSTOM ? CUSTOM : (PRESETS[BUSINESS_TYPE] || PRESETS.general);

// ---------------------------------------------------------------------------
// Exported config — import this everywhere instead of theme.js / config.js
// ---------------------------------------------------------------------------
export const APP_CONFIG = {
  // ── Identity ──────────────────────────────────────────────
  businessType: BUSINESS_TYPE,
  name: preset.name,
  tagline: preset.tagline,
  emoji: preset.emoji,
  icon: preset.icon,

  // ── Look & feel ───────────────────────────────────────────
  colors: preset.colors,
  currency: preset.currency,

  // ── Domain data ───────────────────────────────────────────
  categories: preset.categories,
  statusSteps: preset.statusSteps,
  trackingSteps: preset.trackingSteps,

  // ── Firebase ──────────────────────────────────────────────
  firebase: preset.firebase || {
    apiKey: 'AIzaSyCTz6t5WMOgfoQ_gW2pxacG1xlcsGlMIJs',
    authDomain: 'pharmacy-4514e.firebaseapp.com',
    projectId: 'pharmacy-4514e',
    storageBucket: 'pharmacy-4514e.firebasestorage.app',
    messagingSenderId: '237683995708',
    appId: '1:237683995708:web:43d9f905e7da88eb6b3f39',
    measurementId: 'G-TBKSYLES9W',
  },

  // ── Firestore collection names ────────────────────────────
  collections: preset.collections || {
    Orders: 'Orders',
    Products: 'Products',
    Users: 'Users',
    SystemAccess: 'SystemAccess',
    AdminDeviceTokens: 'AdminDeviceTokens',
    AppConfig: 'AppConfig',
  },

  // ── Server ────────────────────────────────────────────────
  paymentServerUrl: 'https://cooperative-stillness-production-3194.up.railway.app',
};

// Convenience re‑exports so existing code that imports COLORS still works
export const COLORS = preset.colors;
export const currentPharmacyConfig = { name: preset.name, tagline: preset.tagline };
