# UI/UX & Design Guidelines for Nutrition_RAG

You are assisting in building the frontend (React Native / Expo) for an AI-powered Egyptian nutrition and fitness tracking application. You must strictly adhere to the following UI/UX rules:

## 1. Design Aesthetics & Philosophy
*   **Minimalist & Clean:** The design should be simple and slightly minimal. Avoid cluttered interfaces. 
*   **Ease of Use:** Prioritize a user-friendly experience. Navigation and actions (like logging a meal or starting a workout) should be intuitive and require minimal taps.
*   **Iconography:** Icons representing specific concepts (e.g., Calories, Protein, Water, Workouts) must use colors relevant to what they represent (e.g., Blue for water, Red/Orange for Calories or active workouts) while remaining harmonious with the overall palette.

## 2. Component Architecture (CRITICAL)
*   **Native Only:** You must build all UI components using core `react-native` primitives (View, Text, Pressable, StyleSheet, etc.).
*   **No External UI Libraries:** Do NOT use external component libraries (e.g., NativeBase, React Native Paper, UI Kitten, Tailwind, or gluestack-ui). We are avoiding these to prevent version control conflicts and maintain absolute control over the UI layer.
*   **Reusability:** Build custom, reusable atomic components (e.g., `<CustomButton>`, `<Card>`, `<Typography>`) inside `src/components/` and use them consistently across screens.

## 3. Color Palette
The app uses a strict hex color palette. Do not deviate from these colors unless adjusting opacity (e.g., via `rgba` or hex alpha channels) for specific effects like disabled states or shadows.

*   `#353535` - Primary Dark / Text / Deep elements.
*   `#3C6E71` - Primary Accent / Active States / Call to Action.
*   `#F2F0EF` - Main Background / Canvas color.
*   `#D9D9D9` - Secondary Background / Cards / Borders / Inactive states.
*   `#284B63` - Secondary Accent / Headers / Alternate buttons.
