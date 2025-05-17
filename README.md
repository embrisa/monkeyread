**Project Context: Monkeyread - Dynamic Focus Challenge**

**Before addressing the specific request below, please always consider the following established context for the Monkeyread project:**

**1. Core Project Goal:**
Monkeyread is a fast-paced, focus-driven memory game designed to challenge and improve user's short-term memory and focus by recalling sequences of flashing letters (glyphs). The game's difficulty (display speed) dynamically adjusts based on player performance. The overall aim is an engaging and accessible brain-training experience.

**2. Technical Foundation & Key Files:**
   - **Language:** Vanilla JavaScript (ES6+), HTML5, CSS3.
   - **Primary Logic:** `public/script.js` contains all game mechanics, state management, DOM manipulation, event handling, dynamic speed adjustments, and scoring logic. **This is the most frequently modified file.**
   - **Structure:** `public/index.html` defines the UI elements and overall page layout. Element IDs are crucial for JavaScript interaction.
   - **Styling:** `public/style.css` handles all visual aspects. It utilizes CSS custom properties (variables) for theming (Banana/Jungle theme).
   - **Simplicity:** The project is a static web app with no backend and minimal external dependencies (only GoatCounter for analytics). Avoid introducing build steps or complex libraries unless specifically requested as part of the task.

**3. Key Coding Conventions & Architectural Patterns:**
   - **DOM Interaction:** Direct manipulation via `document.getElementById`, `classList`, and `style` properties.
   - **State Management:** Game state is managed by global variables within the `DOMContentLoaded` scope in `script.js`.
   - **Event Handling:** Listeners are typically attached directly to DOM elements (e.g., `element.addEventListener('click', ...)`).
   - **UI Updates:** Centralized functions (like `updateDisplays`) are preferred for refreshing dynamic content. Feedback messages use `messageDisplay.textContent` and associated CSS classes.
   - **Function Design:** Aim for descriptive function names and maintain a degree of functional cohesion where each function has a clear purpose.
   - **CSS:** Leverage existing CSS custom properties (e.g., `--color-primary-accent`, `--font-body`) and established class patterns. Prefer adding/removing classes over inline styles from JS.
   - **Readability:** Maintain and enhance code clarity with comments where necessary.
   - **Accessibility:** Be mindful of existing ARIA attributes and strive to maintain or improve accessibility.

**4. General Guidelines for ALL Modifications:**
   - **Consistency:** Ensure your changes are consistent with the existing coding style, naming conventions, and architectural patterns outlined above and observable in the codebase.
   - **File Structure Adherence:** Respect the current organization of HTML, JavaScript, and CSS.
   - **Impact Awareness:** Consider how changes in one part (e.g., `script.js`) might affect `index.html` (e.g., needing new IDs) or `style.css` (e.g., needing new classes or style adjustments).
   - **No Unnecessary Complexity:** Solutions should be as straightforward as possible within the existing project constraints.

**5. Timing & Animation:**
    - All game timing (letter flashing, pauses, re-flash cycles, etc.) **must use `requestAnimationFrame`** for accuracy and smoothness. Do **not** use `setTimeout` or `setInterval` for these purposes, as they are subject to browser throttling and can be inaccurate at high speeds.
    - This approach ensures that all visual updates are synchronized with the browser's rendering loop and the user's screen refresh rate, which is critical for perceptual accuracy in a fast-paced memory game like Monkeyread.

**6. Game Logic & Game Loop:**
    - Monkeyread operates in a single, difficulty-adjustable game mode. At the start of each round, a sequence of N unique letters (N = difficulty, 1–6) is generated and flashed sequentially to the player.
    - After the sequence is shown, the input area is revealed and a 3-second pause begins. If the player submits their answer during this pause, the round is scored immediately.
    - If no answer is submitted within the 3-second window, the *same* sequence is re-flashed, and the cycle (flash → pause → input) repeats until the player submits an answer.
    - Each re-flash reduces the potential score for that round (e.g., by 20% per re-flash). The scoring system also considers speed and correctness (all correct/in order vs. correct but unordered).
    - All timing and animation for flashing and pauses is managed using `requestAnimationFrame` for accuracy and to match the browser's rendering loop.
    - State variables (such as current letters, round, score, reflash count, and display speed) are reset or updated appropriately at the start of each new round or game.
