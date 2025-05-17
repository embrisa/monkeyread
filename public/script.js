document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const flashingLetterDisplay = document.getElementById('flashing-letter');
    const startButton = document.getElementById('start-button');
    const nextRoundButton = document.getElementById('next-round-button');
    const submitButton = document.getElementById('submit-button');
    const inputArea = document.getElementById('input-area');
    const letterInputs = [
        document.getElementById('letter1'),
        document.getElementById('letter2'),
        document.getElementById('letter3')
    ];
    const messageDisplay = document.getElementById('message');
    const currentLevelDisplay = document.getElementById('current-level'); // Now represents "Round"
    const currentScoreDisplay = document.getElementById('current-score');
    const currentSpeedDisplay = document.getElementById('current-speed');
    const countdownMessageDisplay = document.getElementById('countdown-message');
    const gameModeRadios = document.querySelectorAll('input[name="gameMode"]');
    const progressionStyleRadios = document.querySelectorAll('input[name="progressionStyle"]');

    // Game State Variables
    let currentLetters = [];
    let currentRound = 1;
    let score = 0;
    let gameActive = false;
    let lettersDisplayed = false;
    let selectedGameMode = "classic";
    let selectedProgressionStyle = "auto";

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

    function generateLetters() {
        currentLetters = [];
        while (currentLetters.length < 3) {
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
    }

    // --- Display Logic ---
    function displayLettersSequential() {
        lettersDisplayed = false;
        flashingLetterDisplay.style.visibility = 'hidden';
        let phase = 'pauseBefore'; // 'pauseBefore', 'show', 'hide', 'done'
        let letterIndex = 0;
        let lastTimestamp = null;
        let pauseBeforeMs = 300;
        let pauseBetweenMs = Math.max(10, actualDisplaySpeed / 3);
        let isPaused = false;

        function step(now) {
            if (!lastTimestamp) lastTimestamp = now;
            let elapsed = now - lastTimestamp;

            if (phase === 'pauseBefore') {
                if (elapsed >= pauseBeforeMs) {
                    phase = 'show';
                    lastTimestamp = now;
                    flashingLetterDisplay.textContent = currentLetters[letterIndex];
                    flashingLetterDisplay.style.color = flashingLetterColors[letterIndex];
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
                    if (letterIndex < 3) {
                        phase = 'show';
                        flashingLetterDisplay.textContent = currentLetters[letterIndex];
                        flashingLetterDisplay.style.color = flashingLetterColors[letterIndex];
                        flashingLetterDisplay.style.visibility = 'visible';
                        lastTimestamp = now;
                    } else {
                        phase = 'done';
                        flashingLetterDisplay.textContent = '';
                        flashingLetterDisplay.style.visibility = 'hidden';
                        inputArea.classList.remove('hidden');
                        letterInputs.forEach(input => input.value = '');
                        letterInputs[0].focus();
                        submitButton.disabled = false;
                        lettersDisplayed = true;
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

    function startLetterLoop() {
        stopLetterLoop();
        isLoopingActive = true;
        loopCounter = 0;
        flashingLetterDisplay.style.visibility = 'visible';
        let lastTimestamp = null;

        function loopStep(now) {
            if (!isLoopingActive) return;
            if (!lastTimestamp) lastTimestamp = now;
            let elapsed = now - lastTimestamp;
            if (elapsed >= actualDisplaySpeed) {
                flashingLetterDisplay.textContent = currentLetters[loopCounter % 3];
                flashingLetterDisplay.style.color = flashingLetterColors[loopCounter % 3];
                loopCounter++;
                lastTimestamp = now;
            }
            requestAnimationFrame(loopStep);
        }
        flashingLetterDisplay.textContent = currentLetters[loopCounter % 3];
        flashingLetterDisplay.style.color = flashingLetterColors[loopCounter % 3];
        loopCounter++;
        requestAnimationFrame(loopStep);

        inputArea.classList.remove('hidden');
        letterInputs.forEach(input => input.value = '');
        letterInputs[0].focus();
        submitButton.disabled = false;
    }

    function stopLetterLoop() {
        isLoopingActive = false;
    }

    // --- Game Flow & UI Updates ---
    function updateDisplays() {
        currentLevelDisplay.textContent = currentRound;
        currentScoreDisplay.textContent = score;
        currentSpeedDisplay.textContent = gameActive ? actualDisplaySpeed : "N/A";
    }

    function resetUIForNewRound() { // Renamed from resetUIForNewGame for clarity
        messageDisplay.textContent = "";
        messageDisplay.className = "";
        countdownMessageDisplay.textContent = "";
        inputArea.classList.add('hidden');
        nextRoundButton.classList.add('hidden');
        submitButton.disabled = true;
        flashingLetterDisplay.textContent = "";
        flashingLetterDisplay.style.visibility = 'hidden';
        if (countdownIntervalId) clearInterval(countdownIntervalId);
        stopLetterLoop();
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

        if (selectedGameMode === "classic") {
            displayLettersSequential();
        } else if (selectedGameMode === "looping") {
            startLetterLoop();
        }
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
        if (selectedGameMode === "classic" && !lettersDisplayed) return;

        if (selectedGameMode === "looping") {
            stopLetterLoop();
            flashingLetterDisplay.style.visibility = 'hidden';
            flashingLetterDisplay.textContent = "";
        }

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

        // Check for any letter typed that was NOT in currentLetters
        const incorrectLettersTyped = userGuess.filter(ul => !currentLetters.includes(ul));
        // Check if all letters from currentLetters were present in the user's guess
        const allTargetLettersGuessedCorrectly = currentLetters.every(cl => userGuess.includes(cl)) &&
            userGuess.length === currentLetters.length &&
            new Set(userGuess).size === currentLetters.length;


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
            feedbackMessage += ` +${Math.round(roundScore)} points. Glyphs: ${currentLetters.join(', ')}.`;
        }

        messageDisplay.textContent = feedbackMessage + " " + speedChangeMessage;
        score += Math.round(roundScore); // Add roundScore (0 if mistake)
        updateDisplays(); // Update score, round, and new speed display

        if (gameActive) {
            if (selectedProgressionStyle === "auto") {
                startNextRoundCountdown();
            } else {
                nextRoundButton.classList.remove('hidden');
                nextRoundButton.disabled = false;
            }
        }
        lettersDisplayed = false; // Reset for classic mode
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

    // --- Event Listeners ---
    startButton.addEventListener('click', () => {
        stopLetterLoop();
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

    submitButton.addEventListener('click', handleAnswerSubmitted);

    letterInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            // Auto-uppercase and move to next input
            e.target.value = e.target.value.toUpperCase();
            if (e.target.value.length === 1 && index < letterInputs.length - 1) {
                letterInputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', (event) => {
            // Move to previous input on backspace if current is empty
            if (event.key === "Backspace" && input.value.length === 0 && index > 0) {
                letterInputs[index - 1].focus();
            }
            // Submit on Enter from last input
            if (event.key === 'Enter' && index === letterInputs.length - 1 && !submitButton.disabled) {
                handleAnswerSubmitted();
            }
        });
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

    // Initial Setup
    updateSelectedOptions();
    updateDisplays();
    toggleOptionsInputs(true);
    resetUIForNewRound();
});