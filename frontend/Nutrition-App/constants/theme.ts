// ─── Design System Palette ───────────────────────────────────────────────────
// Strict 5-color palette. Do not add raw hex values in screens — use tokens below.
const Palette = {
  darkGray: '#353535', // Primary Dark — text, deep elements
  teal: '#3C6E71',     // Primary Accent — CTAs, active states
  offWhite: '#F2F0EF', // Main Background — canvas
  lightGray: '#D9D9D9',// Secondary Background — cards, borders, inactive
  navy: '#284B63',     // Secondary Accent — headers, alternate buttons
  white: '#FFFFFF',
  black: '#000000',
};

// ─── Semantic Color Tokens ────────────────────────────────────────────────────
export const Colors = {
  // Surfaces
  background: Palette.offWhite,        // main screen background
  card: Palette.white,                 // card / input surface
  cardAlt: Palette.lightGray,          // secondary card surface

  // Text
  text: Palette.darkGray,              // primary text
  textMuted: 'rgba(53,53,53,0.5)',     // secondary / helper text
  placeholder: 'rgba(53,53,53,0.4)',   // input placeholder

  // Brand
  primary: Palette.teal,              // primary CTA, active tab, highlights
  secondary: Palette.navy,            // headers, alternate buttons

  // UI chrome
  border: Palette.lightGray,
  inactive: Palette.lightGray,        // inactive tabs, disabled states
  overlay: 'rgba(0,0,0,0.5)',         // modal backdrops
  shadow: Palette.black,

  // Semantic states
  danger: '#C0392B',                  // destructive actions (delete, logout)

  // Backward-compatible aliases (token names already used across all screens)
  dark: Palette.darkGray,             // alias for Colors.text — corrected from old #112D4E
  white: Palette.white,               // alias for Colors.card

  // ─── Icon accent colors ───────────────────────────────────────────────────
  // Per design guidelines: icons must use colors relevant to what they represent.
  // These are intentional semantic deviations from the base palette.
  iconWater: '#4FC3F7',      // water — blue
  iconCalories: '#EF5350',   // calories / energy — red
  iconProtein: '#4ECDC4',    // protein — teal-green
  iconCarbs: '#95E1D3',      // carbs — mint
  iconFats: '#FFD93D',       // fats — yellow
  iconStreak: '#FF6B35',     // streak / fire — orange-red
  iconSteps: '#FFA726',      // steps / activity — amber
  iconNutrition: '#66BB6A',  // general nutrition — green
  iconWeightLoss: '#FF9500', // weight loss target — orange
};

// ─── Typography ───────────────────────────────────────────────────────────────
export const Fonts = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
};

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// ─── Border Radius ────────────────────────────────────────────────────────────
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};
