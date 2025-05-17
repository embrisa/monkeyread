**Project Context: Monkeyread - Dynamic Focus Challenge**

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

**6. Game Logic & Game Loop (Current Implementation):**
- Monkeyread operates in a single, difficulty-adjustable game mode. At the start of each round, a sequence of N unique letters (N = difficulty, 1–7) is generated and flashed sequentially to the player.
- **Before each round starts, there is a 1-second pause.**
- After the pause, the sequence is shown. The input area and two buttons become available:
    - **Submit Answer**: Enter your guess for the sequence.
    - **Re-flash Letters**: Replay the current sequence (each use reduces the round's score by 20%).
- The player can submit their answer at any time. After submission, feedback and scoring are shown, and only the **Next Round** button is enabled.
- **Progression is strictly manual:** The player must click the Next Round button or press Enter to start the next round. A small hint below the button informs the user of the Enter shortcut.
- All timing and animation for flashing and pauses is managed using `requestAnimationFrame` for accuracy and to match the browser's rendering loop.
- State variables (such as current letters, round, score, reflash count, and display speed) are reset or updated appropriately at the start of each new round or game.

**7. Scoring System:**
- Points are awarded based on the current display speed (faster speed = more points).
- **Perfect (All glyphs correct & in order):** Max points for the round! Display speed for the next round significantly decreases (gets faster).
- **Correct glyphs, wrong order:** Good points! Display speed moderately decreases.
- **Any incorrect glyph / Not all glyphs identified:** No points for the round. Display speed slightly increases (gets slower).
- **Each re-flash reduces your score for the round by 20%.**
- **Time per Letter:** The "Speed" or "Letter Time" shown in the scoreboard is the number of milliseconds each letter is displayed during the flashing sequence. The total time to display the full sequence is (Letter Time × Number of Letters). Faster letter times mean a greater challenge and higher potential score.
- **Accuracy Score:** The "Accuracy" shown in the scoreboard is the percentage of letters you have entered correctly (including partial credit for correct letters in the wrong position) out of all letters attempted during the session. This helps you track your overall precision, not just your score.

**8. User Experience Flow:**
1. Click "Start Game". A 1-second millisecond countdown appears in the letter display area.
2. Letters flash in sequence.
3. Input area and buttons appear. User can submit an answer or re-flash the sequence (with penalty).
4. After submitting, feedback and score are shown. Only the Next Round button is enabled, with a hint for Enter.
5. User clicks Next Round or presses Enter to continue. The cycle repeats.

**9. Accessibility & UI:**
- All interactive elements are accessible by keyboard.
- The countdown, letter flashes, and feedback are visually clear and high-contrast.
- The Enter-to-continue hint is always present in the HTML and styled via CSS.
