document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const flashingLetterDisplay = document.getElementById('flashing-letter');
    const startButton = document.getElementById('start-button');
    const nextRoundButton = document.getElementById('next-round-button');
    const submitButton = document.getElementById('submit-button');
    const inputArea = document.getElementById('input-area');
    const letterInputsWrapper = document.getElementById('letter-inputs-wrapper');
    let letterInputs = [];
    const messageDisplay = document.getElementById('message');
    const currentLevelDisplay = document.getElementById('current-level'); // Now represents "Round"
    const currentScoreDisplay = document.getElementById('current-score');
    const currentSpeedDisplay = document.getElementById('current-speed');
    const countdownMessageDisplay = document.getElementById('countdown-message');
    const gameModeRadios = document.querySelectorAll('input[name="gameMode"]');
    const difficultySelector = document.getElementById('difficulty-selector');
    const reflashButton = document.getElementById('reflash-button');

    // Game State Variables
    let currentLetters = [];
    let currentRound = 1;
    let score = 0;
    let gameActive = false;
    let lettersDisplayed = false;
    let selectedGameMode = "auto";
    let numberOfLettersToDisplay = 3;
    let reflashCount = 0;
    let reflashTimeoutId = null;
    let flashCycleActive = false;

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // Timers and Intervals
    let loopIntervalId = null;
    let isLoopingActive = false;
    let loopCounter = 0;
    let countdownIntervalId = null;

    // --- Dynamic Speed and Scoring Logic ---
    let actualDisplaySpeed = 300; // This will be dynamically adjusted
    const initialDisplaySpeed = 300; // Base speed to start and for score calculation reference
    const minPracticalDisplaySpeed = 20; // Practical floor for setTimeout and perception
    const maxDisplaySpeed = 700; // A cap if speed gets too slow

    // Color codes for flashing letters (1st: Red, 2nd: Green, 3rd: Blue)
    const flashingLetterColors = [
        '#FF2D2D', // Vivid Red (1st)
        '#16C172', // Darker Green (2nd)
        '#2D9CFF'  // Vivid Blue (3rd)
    ];

    const defaultSpeedChangeOnCorrect = 25; // ms, base speed decrease for correct letters (wrong order)
    const perfectRoundSpeedBoost = 20;    // ms, additional speed decrease for perfect round
    const mistakeSpeedPenalty = 30;       // ms, speed increase on any error

    const basePointsPerLetter = 5;       // Base points before speed multiplier
    const orderBonusBasePoints = 10;     // Base bonus points before speed multiplier

    // Add a helper text element for Enter-to-continue
    let nextRoundHint = document.getElementById('next-round-hint');
    if (!nextRoundHint) {
        nextRoundHint = document.createElement('div');
        nextRoundHint.id = 'next-round-hint';
        nextRoundHint.style.display = 'none';
        nextRoundButton.parentNode.insertBefore(nextRoundHint, nextRoundButton.nextSibling);
    }

    // --- Utility Functions ---
    function getRandomLetter() {
        return alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    function generateLetters(numLetters = numberOfLettersToDisplay) {
        currentLetters = [];
        while (currentLetters.length < numLetters) {
            const letter = getRandomLetter();
            if (!currentLetters.includes(letter)) {
                currentLetters.push(letter);
            }
        }
    }

    function updateSelectedOptions() {
        for (const radio of gameModeRadios) {
            if (radio.checked) selectedGameMode = radio.value;
        }
    }

    function toggleOptionsInputs(enable) {
        gameModeRadios.forEach(radio => radio.disabled = !enable);
    }

    function createLetterInputs(num) {
        letterInputsWrapper.innerHTML = '';
        letterInputs = [];
        for (let i = 0; i < num; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.id = `letter${i + 1}`;
            input.className = `input-pos-${(i + 1)}`;
            input.placeholder = `${i + 1}${getOrdinalSuffix(i + 1)}`;
            input.setAttribute('aria-label', `Letter ${i + 1}`);
            letterInputsWrapper.appendChild(input);
            letterInputs.push(input);
        }
    }

    function getOrdinalSuffix(n) {
        if (n === 1) return 'st';
        if (n === 2) return 'nd';
        if (n === 3) return 'rd';
        return 'th';
    }

    // --- Display Logic ---
    function manageFlashAndInputCycle() {
        // Core loop: flash N letters, then input area is shown, re-flash is manual
        flashCycleActive = true;
        reflashCount = 0;
        inputArea.classList.add('hidden');
        submitButton.disabled = true;
        reflashButton.classList.add('hidden');
        reflashButton.disabled = true;
        flashingLetterDisplay.textContent = '';
        flashingLetterDisplay.style.visibility = 'hidden';
        letterInputs.forEach(input => input.value = '');

        function flashLettersSequence(callback) {
            let letterIndex = 0;
            let phase = 'pauseBefore';
            let lastTimestamp = null;
            let pauseBeforeMs = 300;
            let pauseBetweenMs = Math.max(10, actualDisplaySpeed / 3);

            function step(now) {
                if (!flashCycleActive) return;
                if (!lastTimestamp) lastTimestamp = now;
                let elapsed = now - lastTimestamp;

                if (phase === 'pauseBefore') {
                    if (elapsed >= pauseBeforeMs) {
                        phase = 'show';
                        lastTimestamp = now;
                        flashingLetterDisplay.textContent = currentLetters[letterIndex];
                        flashingLetterDisplay.style.color = '#000';
                        flashingLetterDisplay.style.visibility = 'visible';
                    }
                } else if (phase === 'show') {
                    if (elapsed >= actualDisplaySpeed) {
                        flashingLetterDisplay.style.visibility = 'hidden';
                        phase = 'hide';
                        lastTimestamp = now;
                    }
                } else if (phase === 'hide') {
                    if (elapsed >= pauseBetweenMs) {
                        letterIndex++;
                        if (letterIndex < currentLetters.length) {
                            phase = 'show';
                            flashingLetterDisplay.textContent = currentLetters[letterIndex];
                            flashingLetterDisplay.style.color = '#000';
                            flashingLetterDisplay.style.visibility = 'visible';
                            lastTimestamp = now;
                        } else {
                            phase = 'done';
                            flashingLetterDisplay.textContent = '';
                            flashingLetterDisplay.style.visibility = 'hidden';
                            if (callback) callback();
                            return;
                        }
                    }
                }
                if (phase !== 'done') {
                    requestAnimationFrame(step);
                }
            }
            requestAnimationFrame(step);
        }

        function afterFlashShowInput() {
            if (!flashCycleActive) return;
            inputArea.classList.remove('hidden');
            submitButton.disabled = false;
            reflashButton.classList.remove('hidden');
            reflashButton.disabled = false;
            if (letterInputs.length > 0) letterInputs[0].focus();
        }

        flashLettersSequence(afterFlashShowInput);
    }

    function handleReflashRequest() {
        if (!gameActive || reflashButton.disabled) return;
        reflashCount++;
        submitButton.disabled = true;
        reflashButton.disabled = true;
        flashingLetterDisplay.textContent = '';
        flashingLetterDisplay.style.visibility = 'hidden';
        inputArea.classList.add('hidden');
        function afterFlashShowInput() {
            if (!flashCycleActive) return;
            inputArea.classList.remove('hidden');
            submitButton.disabled = false;
            reflashButton.disabled = false;
            if (letterInputs.length > 0) letterInputs[0].focus();
        }
        flashLettersSequence(afterFlashShowInput);
    }

    function stopFlashCycle() {
        flashCycleActive = false;
        flashingLetterDisplay.textContent = '';
        flashingLetterDisplay.style.visibility = 'hidden';
        reflashButton.classList.add('hidden');
        reflashButton.disabled = true;
    }

    // --- Game Flow & UI Updates ---
    function updateDisplays() {
        currentLevelDisplay.textContent = currentRound;
        currentScoreDisplay.textContent = score;
        currentSpeedDisplay.textContent = gameActive ? actualDisplaySpeed : "N/A";
    }

    function resetUIForNewRound() {
        messageDisplay.textContent = "";
        messageDisplay.className = "";
        countdownMessageDisplay.textContent = "";
        inputArea.classList.add('hidden');
        nextRoundButton.classList.add('hidden');
        submitButton.disabled = true;
        reflashButton.classList.add('hidden');
        reflashButton.disabled = true;
        flashingLetterDisplay.textContent = "";
        flashingLetterDisplay.style.visibility = 'hidden';
        if (countdownIntervalId) clearInterval(countdownIntervalId);
        stopFlashCycle();
        reflashCount = 0;
        showNextRoundHint(false);
    }

    function startGame() {
        gameActive = true;
        updateSelectedOptions();
        resetUIForNewRound(); // Use the round reset
        toggleOptionsInputs(false);

        currentRound = 1;
        score = 0;
        actualDisplaySpeed = initialDisplaySpeed; // Reset speed to initial
        updateDisplays();
        startButton.textContent = "Restart Game";

        proceedToNextRoundSetup();
    }

    function advanceToNextRound() { // Renamed from advanceLevel
        currentRound++;
        // actualDisplaySpeed is adjusted in handleAnswerSubmitted, not here directly by level
        updateDisplays(); // Update round number
        proceedToNextRoundSetup();
    }

    function proceedToNextRoundSetup() {
        resetUIForNewRound();
        generateLetters();
        currentSpeedDisplay.textContent = actualDisplaySpeed; // Ensure speed is updated for this round
        // Add countdown pause before flashing letters
        let countdownDuration = 1000; // 1 second
        let startTimestamp = null;
        flashingLetterDisplay.style.visibility = 'visible';
        flashingLetterDisplay.style.color = '#000';
        function countdownStep(now) {
            if (!startTimestamp) startTimestamp = now;
            let elapsed = now - startTimestamp;
            let remaining = Math.max(0, countdownDuration - elapsed);
            // Display only milliseconds (e.g., 532)
            let ms = Math.floor(remaining).toString().padStart(3, '0');
            flashingLetterDisplay.textContent = ms;
            if (remaining > 0) {
                requestAnimationFrame(countdownStep);
            } else {
                flashingLetterDisplay.textContent = '';
                flashingLetterDisplay.style.visibility = 'hidden';
                manageFlashAndInputCycle();
            }
        }
        requestAnimationFrame(countdownStep);
    }

    function calculateSpeedDecrease(isPerfect, speed, minSpeed) {
        if (speed > 100) {
            // Use original values above 100ms
            return isPerfect ? (defaultSpeedChangeOnCorrect + perfectRoundSpeedBoost) : defaultSpeedChangeOnCorrect;
        } else if (speed > 50) {
            // 100ms >= speed > 50ms
            if (isPerfect) {
                // 20ms at 100ms, 10ms at 50ms
                return 10 + 10 * (speed - 50) / 50;
            } else {
                // 10ms at 100ms, 5ms at 50ms
                return 5 + 5 * (speed - 50) / 50;
            }
        } else {
            // 50ms >= speed >= minPracticalDisplaySpeed
            if (isPerfect) {
                // 12ms at 50ms, 5ms at min
                return 5 + 7 * (speed - minSpeed) / (50 - minSpeed);
            } else {
                // 7ms at 50ms, 1ms at min
                return 1 + 6 * (speed - minSpeed) / (50 - minSpeed);
            }
        }
    }

    function handleAnswerSubmitted() {
        stopFlashCycle();
        flashingLetterDisplay.style.visibility = 'hidden';
        flashingLetterDisplay.textContent = "";
        reflashButton.classList.add('hidden');
        reflashButton.disabled = true;

        const userGuess = letterInputs.map(input => input.value.toUpperCase().trim());

        if (userGuess.some(letter => letter.length !== 1 || !alphabet.includes(letter))) {
            messageDisplay.textContent = "Please enter a valid single letter in all boxes.";
            messageDisplay.className = "incorrect";
            if (gameActive) submitButton.disabled = false;
            return;
        }

        submitButton.disabled = true;
        inputArea.classList.add('hidden');

        let roundScore = 0;
        let feedbackMessage = "";
        let speedChangeMessage = "";
        let reflashPenaltyMessage = "";

        // Check for any letter typed that was NOT in currentLetters
        const incorrectLettersTyped = userGuess.filter(ul => !currentLetters.includes(ul));
        // Check if all letters from currentLetters were present in the user's guess
        const allTargetLettersGuessedCorrectly = currentLetters.every(cl => userGuess.includes(cl)) &&
            userGuess.length === currentLetters.length &&
            new Set(userGuess).size === currentLetters.length;

        // Scoring penalty for re-flashes: 20% off per re-flash (configurable)
        const reflashPenaltyPer = 0.2;
        const reflashMultiplier = Math.max(0, 1 - reflashCount * reflashPenaltyPer);
        if (reflashCount > 0) {
            reflashPenaltyMessage = ` (Re-flashed ${reflashCount} time${reflashCount > 1 ? 's' : ''}, score reduced)`;
        }

        if (incorrectLettersTyped.length > 0 || !allTargetLettersGuessedCorrectly) {
            // MISTAKE: Either an invalid letter was typed, or not all correct letters were identified
            roundScore = 0;
            actualDisplaySpeed = Math.min(maxDisplaySpeed, actualDisplaySpeed + mistakeSpeedPenalty);
            speedChangeMessage = "Speed decreased slightly.";
            if (incorrectLettersTyped.length > 0) {
                feedbackMessage = `Oops! '${incorrectLettersTyped.join(', ')}' wasn't shown. No points.`;
            } else {
                feedbackMessage = `Not quite all letters identified. No points.`;
            }
            feedbackMessage += ` Glyphs were: ${currentLetters.join(', ')}.`;
            messageDisplay.className = "incorrect";
        } else {
            // All letters identified are correct and all target letters were identified. Now check order.
            const isOrderPerfect = userGuess.every((letter, index) => letter === currentLetters[index]);
            const speedMultiplier = Math.max(0.2, initialDisplaySpeed / actualDisplaySpeed); // Min multiplier 0.2

            let baseRoundPoints = basePointsPerLetter * currentLetters.length * speedMultiplier;
            roundScore = baseRoundPoints;

            if (isOrderPerfect) {
                roundScore += orderBonusBasePoints * speedMultiplier;
                feedbackMessage = `Perfect! All correct and in order!`;
                const decrease = calculateSpeedDecrease(true, actualDisplaySpeed, minPracticalDisplaySpeed);
                actualDisplaySpeed = Math.max(minPracticalDisplaySpeed, actualDisplaySpeed - decrease);
                speedChangeMessage = "Speed increased significantly!";
                messageDisplay.className = "bonus";
            } else {
                feedbackMessage = `All glyphs correct, but wrong order.`;
                const decrease = calculateSpeedDecrease(false, actualDisplaySpeed, minPracticalDisplaySpeed);
                actualDisplaySpeed = Math.max(minPracticalDisplaySpeed, actualDisplaySpeed - decrease);
                speedChangeMessage = "Speed increased.";
                messageDisplay.className = "correct";
            }
            // Apply re-flash penalty
            roundScore = Math.round(roundScore * reflashMultiplier);
            feedbackMessage += ` +${roundScore} points${reflashPenaltyMessage}. Glyphs: ${currentLetters.join(', ')}.`;
        }

        messageDisplay.textContent = feedbackMessage + " " + speedChangeMessage;
        score += roundScore; // Add roundScore (0 if mistake)
        updateDisplays(); // Update score, round, and new speed display

        if (gameActive) {
            nextRoundButton.classList.remove('hidden');
            nextRoundButton.disabled = false;
            showNextRoundHint(true);
        }
        lettersDisplayed = false; // No longer used, but kept for compatibility
    }

    function updateDifficulty() {
        numberOfLettersToDisplay = parseInt(difficultySelector.value, 10);
        createLetterInputs(numberOfLettersToDisplay);
    }

    // --- Event Listeners ---
    startButton.addEventListener('click', () => {
        stopFlashCycle();
        gameActive = false;
        toggleOptionsInputs(true);
        startGame();
    });

    nextRoundButton.addEventListener('click', () => {
        if (gameActive) {
            nextRoundButton.classList.add('hidden');
            nextRoundButton.disabled = true;
            showNextRoundHint(false);
            countdownMessageDisplay.textContent = "";
            advanceToNextRound();
        }
    });

    submitButton.addEventListener('click', handleAnswerSubmitted);

    reflashButton.addEventListener('click', handleReflashRequest);

    // Add event listeners to letterInputsWrapper using event delegation
    letterInputsWrapper.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
            const currentInput = e.target;
            currentInput.value = currentInput.value.toUpperCase(); // Auto-uppercase

            const currentIndex = letterInputs.indexOf(currentInput);

            if (currentInput.value.length === 1 && currentIndex !== -1 && currentIndex < letterInputs.length - 1) {
                letterInputs[currentIndex + 1].focus();
            }
        }
    });

    letterInputsWrapper.addEventListener('keydown', (event) => {
        if (event.target.tagName === 'INPUT' && event.target.type === 'text') {
            const currentInput = event.target;
            const currentIndex = letterInputs.indexOf(currentInput);

            if (event.key === "Backspace" && currentInput.value.length === 0 && currentIndex !== -1 && currentIndex > 0) {
                letterInputs[currentIndex - 1].focus();
            }

            if (event.key === 'Enter' && currentIndex !== -1 && currentIndex === letterInputs.length - 1 && !submitButton.disabled) {
                handleAnswerSubmitted();
            }
        }
    });

    [...gameModeRadios].forEach(radio => {
        radio.addEventListener('change', () => {
            if (!gameActive) {
                updateSelectedOptions();
            } else {
                if (radio.name === "gameMode") radio.checked = (radio.value === selectedGameMode);
            }
        });
    });

    difficultySelector.addEventListener('change', () => {
        if (!gameActive) {
            updateDifficulty();
        }
    });

    // Listen for Enter key to trigger next round if button is visible/enabled
    window.addEventListener('keydown', (e) => {
        if (
            e.key === 'Enter' &&
            !nextRoundButton.classList.contains('hidden') &&
            !nextRoundButton.disabled
        ) {
            nextRoundButton.click();
        }
    });

    // Initial Setup
    updateDifficulty();
    updateDisplays();
    toggleOptionsInputs(true);
    resetUIForNewRound();
});

function showNextRoundHint(show) {
    nextRoundHint.textContent = show ? 'Tip: Press Enter to start the next round.' : '';
    nextRoundHint.style.display = show ? 'block' : 'none';
}