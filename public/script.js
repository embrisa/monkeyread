document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const flashingLetterDisplay = document.getElementById('flashing-letter');
    const startButton = document.getElementById('start-button');
    const nextRoundButton = document.getElementById('next-round-button');
    const reflashButton = document.getElementById('reflash-button');
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
    const progressionStyleRadios = document.querySelectorAll('input[name="progressionStyle"]');
    const difficultySelector = document.getElementById('difficulty-selector');

    // Game State Variables
    let currentLetters = [];
    let currentRound = 1;
    let score = 0;
    let gameActive = false;
    let lettersDisplayed = false;
    let selectedProgressionStyle = "auto";
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
        for (const radio of progressionStyleRadios) {
            if (radio.checked) selectedProgressionStyle = radio.value;
        }
    }

    function toggleOptionsInputs(enable) {
        gameModeRadios.forEach(radio => radio.disabled = !enable);
        progressionStyleRadios.forEach(radio => radio.disabled = !enable);
        difficultySelector.disabled = !enable;
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
        // Core loop: flash N letters, 3s pause, repeat until input
        flashCycleActive = true;
        reflashCount = 0;
        inputArea.classList.add('hidden');
        submitButton.disabled = true;
        flashingLetterDisplay.textContent = '';
        flashingLetterDisplay.style.visibility = 'hidden';
        letterInputs.forEach(input => input.value = '');

        // --- Letter Flashing Sequence ---
        function flashLettersSequence(callback) {
            let letterIndex = 0;
            let phase = 'pauseBefore'; // 'pauseBefore', 'show', 'hide', 'done'
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
                        flashingLetterDisplay.style.color = '#111';
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
                            flashingLetterDisplay.style.color = '#111';
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

        // --- 3s Pause (using requestAnimationFrame) ---
        function startPauseAndMaybeReflash() {
            if (!flashCycleActive) return;
            inputArea.classList.remove('hidden');
            submitButton.disabled = false;
            if (letterInputs.length > 0) letterInputs[0].focus();
            // Show re-flash message if not first cycle
            if (reflashCount > 0) {
                countdownMessageDisplay.textContent = `Re-flash #${reflashCount + 1}! Try to answer for max score.`;
                setTimeout(() => { countdownMessageDisplay.textContent = ''; }, 1200);
            }
            // Start 3s timer using requestAnimationFrame
            let pauseStart = null;
            function pauseStep(now) {
                if (!flashCycleActive) return;
                if (!pauseStart) pauseStart = now;
                let elapsed = now - pauseStart;
                if (elapsed >= 3000) {
                    reflashCount++;
                    flashLettersSequence(startPauseAndMaybeReflash);
                } else {
                    reflashTimeoutId = requestAnimationFrame(pauseStep);
                }
            }
            reflashTimeoutId = requestAnimationFrame(pauseStep);
        }

        flashLettersSequence(startPauseAndMaybeReflash);
    }

    function stopFlashCycle() {
        flashCycleActive = false;
        if (reflashTimeoutId) {
            cancelAnimationFrame(reflashTimeoutId);
            reflashTimeoutId = null;
        }
        flashingLetterDisplay.textContent = '';
        flashingLetterDisplay.style.visibility = 'hidden';
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
        reflashButton.classList.add('hidden');
        submitButton.disabled = true;
        flashingLetterDisplay.textContent = "";
        flashingLetterDisplay.style.visibility = 'hidden';
        if (countdownIntervalId) clearInterval(countdownIntervalId);
        stopFlashCycle();
        reflashCount = 0;
    }

    function startGame() {
        gameActive = true;
        updateSelectedOptions();
        resetUIForNewRound();
        toggleOptionsInputs(false);

        currentRound = 1;
        score = 0;
        actualDisplaySpeed = initialDisplaySpeed; // Reset speed to initial
        updateDisplays();
        startButton.textContent = "Restart Game";
        reflashButton.classList.add('hidden');
        nextRoundButton.classList.add('hidden');

        proceedToNextRoundSetup();
    }

    function advanceToNextRound() {
        currentRound++;
        updateDisplays(); // Update round number
        proceedToNextRoundSetup();
    }

    function proceedToNextRoundSetup() {
        resetUIForNewRound();
        generateLetters();
        createLetterInputs(numberOfLettersToDisplay);
        currentSpeedDisplay.textContent = actualDisplaySpeed;
        manageFlashAndInputCycle();
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
            if (selectedProgressionStyle === "auto") {
                startNextRoundCountdown();
            } else {
                nextRoundButton.classList.remove('hidden');
                nextRoundButton.disabled = false;
            }
        }
        lettersDisplayed = false; // No longer used, but kept for compatibility
    }

    function startNextRoundCountdown() {
        nextRoundButton.classList.add('hidden');
        let count = 3;
        countdownMessageDisplay.textContent = `Next round in ${count}...`;
        if (countdownIntervalId) clearInterval(countdownIntervalId);

        countdownIntervalId = setInterval(() => {
            count--;
            if (count > 0) {
                countdownMessageDisplay.textContent = `Next round in ${count}...`;
            } else if (count === 0) {
                countdownMessageDisplay.textContent = "Starting next round!";
            } else {
                clearInterval(countdownIntervalId);
                countdownMessageDisplay.textContent = "";
                if (gameActive) advanceToNextRound();
            }
        }, 1000);
    }

    function updateDifficulty() {
        numberOfLettersToDisplay = parseInt(difficultySelector.value, 10);
        if (!gameActive) {
            createLetterInputs(numberOfLettersToDisplay);
        }
    }

    // --- Event Listeners ---
    startButton.addEventListener('click', () => {
        stopFlashCycle();
        if (countdownIntervalId) clearInterval(countdownIntervalId);
        gameActive = false;
        toggleOptionsInputs(true);
        startGame();
    });

    nextRoundButton.addEventListener('click', () => {
        if (gameActive && selectedProgressionStyle === "manual") {
            nextRoundButton.classList.add('hidden');
            nextRoundButton.disabled = true;
            countdownMessageDisplay.textContent = "";
            advanceToNextRound();
        }
    });

    reflashButton.addEventListener('click', handleReflashRequest);

    submitButton.addEventListener('click', handleAnswerSubmitted);

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

    [...gameModeRadios, ...progressionStyleRadios].forEach(radio => {
        radio.addEventListener('change', () => {
            if (!gameActive) {
                updateSelectedOptions();
            } else {
                if (radio.name === "gameMode") radio.checked = (radio.value === selectedGameMode);
                if (radio.name === "progressionStyle") radio.checked = (radio.value === selectedProgressionStyle);
            }
        });
    });

    difficultySelector.addEventListener('change', () => {
        if (!gameActive) {
            updateDifficulty();
        }
    });

    // Initial Setup
    updateDifficulty();
    updateDisplays();
    toggleOptionsInputs(true);
    resetUIForNewRound();
    startButton.textContent = "Start Game";
    startButton.classList.add('button-primary');
    startButton.classList.remove('button-secondary');
});