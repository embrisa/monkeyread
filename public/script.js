document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const flashingLetterDisplay = document.getElementById('flashing-letter');
    const startButton = document.getElementById('start-button');
    const submitButton = document.getElementById('submit-button');
    const inputArea = document.getElementById('input-area');
    const letterInputsWrapper = document.getElementById('letter-inputs-wrapper');
    let letterInputs = [];
    const messageDisplay = document.getElementById('message');
    const currentLevelDisplay = document.getElementById('current-level'); // Now represents "Round"
    const currentScoreDisplay = document.getElementById('current-score');
    const currentSpeedDisplay = document.getElementById('current-speed');
    const countdownMessageDisplay = document.getElementById('countdown-message');
    const difficultySlider = document.getElementById('difficulty-slider');
    const difficultyValue = document.getElementById('difficulty-value');
    const reflashButton = document.getElementById('reflash-button');
    const accuracyRatingDisplay = document.getElementById('accuracy-rating');
    const pauseCountdownDisplay = document.getElementById('pause-countdown-display');
    const nextRoundHint = document.getElementById('next-round-hint');

    const totalTimeDisplay = document.getElementById('total-time');
    const effectiveHzDisplay = document.getElementById('effective-hz-display');

    // Game State Variables
    let currentLetters = [];
    let currentRound = 1;
    let score = 0;
    let gameActive = false;
    let numberOfLettersToDisplay = 3; // This is set by difficulty slider
    let reflashCount = 0;
    let flashCycleActive = false;
    // --- Accuracy Tracking ---
    let totalLettersAttempted = 0;
    let totalLettersCorrect = 0;

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // --- Dynamic Speed and Scoring Logic ---
    const initialDisplaySpeed = 150;    // ms,
    const maxDisplaySpeed = 700;        // A cap if speed gets too slow

    // New speed change constants
    const speedDecreasePerfect = 20;     // ms, speed decrease for a perfect round
    const speedDecreaseCorrectOrder = 15;// ms, speed decrease for correct letters, wrong order
    const mistakeSpeedPenalty = 10;      // ms, speed increase on any error

    // New Scoring Point Constants
    const POINTS_CORRECT_POSITION = 5;
    const POINTS_CORRECT_WRONG_POSITION = 2;
    const POINTS_PERFECT_ORDER_BONUS = 10; // For a perfect round, on top of per-letter points

    const MAX_ROUNDS = 16; // Maximum number of rounds per game

    // Initialize actualDisplaySpeed. It's set in startGame for game rounds,
    // but needs a defined value for UI updates before game starts (e.g., initial Total Time display).
    let actualDisplaySpeed = initialDisplaySpeed;
    let minPracticalDisplaySpeed = 16; // ms, Default to 16ms (good for 60Hz), will be dynamically updated by estimateFrameInterval.
    const ABSOLUTE_MIN_SPEED_ALLOWED = 8; // ms, absolute floor for display speed for very high refresh rate monitors
    let estimatedFrameIntervalMs = 1000 / 60; // Initialize with a common default (60Hz)

    // --- Utility Functions ---
    function getRandomLetter() {
        return alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    function estimateFrameInterval(callback) {
        const samples = [];
        const totalSamplesToCollect = 20; // Collect timestamps of 20 frames, yielding 19 intervals

        function frameSampler(timestamp) {
            samples.push(timestamp);
            if (samples.length < totalSamplesToCollect) {
                requestAnimationFrame(frameSampler);
            } else {
                // We have enough samples, calculate average interval
                let totalIntervalTime = 0;
                let validIntervals = 0;
                for (let i = 1; i < samples.length; i++) {
                    const interval = samples[i] - samples[i - 1];
                    // Sanity check for each interval (e.g., 4ms to 100ms, covering ~10Hz to 250Hz)
                    if (interval >= 4 && interval < 100) {
                        totalIntervalTime += interval;
                        validIntervals++;
                    }
                }

                if (validIntervals > totalSamplesToCollect / 2) { // Require at least half valid intervals
                    const averageInterval = totalIntervalTime / validIntervals;
                    estimatedFrameIntervalMs = averageInterval;

                    // Sanity check the average interval (e.g., 5ms to 40ms, covering ~25Hz to 200Hz - typical gaming range)
                    if (averageInterval >= 4 && averageInterval <= 40) {
                        let currentFrameTargetSpeed = Math.round(averageInterval);

                        // If display is roughly 60Hz (interval results in 16ms or 17ms rounded), target 16ms.
                        if (currentFrameTargetSpeed >= 16 && currentFrameTargetSpeed <= 17) {
                            minPracticalDisplaySpeed = 16;
                        } else {
                            // For other refresh rates: use frame interval, floored by ABSOLUTE_MIN_SPEED_ALLOWED, capped at 20ms.
                            minPracticalDisplaySpeed = Math.max(ABSOLUTE_MIN_SPEED_ALLOWED, Math.min(currentFrameTargetSpeed, 20));
                        }
                        console.log(`Estimated display frame interval: ${averageInterval.toFixed(2)}ms over ${validIntervals} samples. Min practical display speed set to: ${minPracticalDisplaySpeed}ms.`);
                    } else {
                        minPracticalDisplaySpeed = 16; // Fallback if average is out of typical gaming/monitor range
                        console.warn(`Average estimated frame interval (${averageInterval.toFixed(2)}ms) out of expected range (5-40ms). Using default min speed: ${minPracticalDisplaySpeed}ms.`);
                    }
                } else {
                    minPracticalDisplaySpeed = 16; // Fallback if not enough valid samples
                    console.warn(`Could not reliably estimate frame interval (not enough valid samples: ${validIntervals}/${samples.length - 1}). Using default min speed: ${minPracticalDisplaySpeed}ms.`);
                }
                if (callback) callback();
            }
        }
        requestAnimationFrame(frameSampler); // Start sampling
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
    function startCountdown(duration, displayElement, onCompleteCallback) {
        let startTimestamp = null;
        flashingLetterDisplay.textContent = ''; // Clear main display during countdown
        flashingLetterDisplay.style.visibility = 'hidden';
        if (displayElement) displayElement.textContent = (duration / 1000).toFixed(3) + 's';

        function countdownStep(now) {
            if (!startTimestamp) startTimestamp = now;
            let elapsed = now - startTimestamp;
            let remaining = Math.max(0, duration - elapsed);

            if (displayElement) {
                displayElement.textContent = (remaining / 1000).toFixed(3) + 's';
            }

            if (remaining > 0) {
                requestAnimationFrame(countdownStep);
            } else {
                if (displayElement) displayElement.textContent = "";
                if (onCompleteCallback) onCompleteCallback();
            }
        }
        requestAnimationFrame(countdownStep);
    }

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

    function manageFlashAndInputCycle() {
        // Core loop: flash N letters, then input area is shown, re-flash is manual
        flashCycleActive = true;
        reflashCount = 0;
        submitButton.disabled = true;
        reflashButton.disabled = true;
        flashingLetterDisplay.textContent = '';
        flashingLetterDisplay.style.visibility = 'hidden';
        letterInputs.forEach(input => input.value = '');

        function afterFlashShowInput() {
            if (!flashCycleActive) return;
            submitButton.disabled = false;
            reflashButton.disabled = false;
            if (letterInputs.length > 0) letterInputs[0].focus();
        }

        flashLettersSequence(afterFlashShowInput);
    }

    function handleReflashRequest() {
        if (!gameActive || reflashButton.disabled) return;

        // Set necessary states for flashing
        flashCycleActive = true; // flashLettersSequence relies on this
        reflashCount++;
        submitButton.disabled = true;
        reflashButton.disabled = true;
        flashingLetterDisplay.textContent = ''; // Clear display before countdown/flash
        flashingLetterDisplay.style.visibility = 'hidden';

        // Define what happens after the re-flash letter sequence itself completes
        function afterReflashSequenceCompletes() {
            if (!flashCycleActive) return; // Good practice to check
            submitButton.disabled = false;
            reflashButton.disabled = false;
            if (letterInputs.length > 0) letterInputs[0].focus();
        }

        // Define what happens after the 1-second countdown completes for a re-flash
        function onReflashCountdownEnd() {
            flashingLetterDisplay.textContent = ''; // Ensure it's still clear before flash
            flashingLetterDisplay.style.visibility = 'hidden';
            flashLettersSequence(afterReflashSequenceCompletes); // Now call the flasher
        }

        // Start the 1-second countdown, then trigger the flashing sequence
        startCountdown(1000, pauseCountdownDisplay, onReflashCountdownEnd);
    }

    function stopFlashCycle() {
        flashCycleActive = false;
        flashingLetterDisplay.textContent = '';
        flashingLetterDisplay.style.visibility = 'hidden';
        if (pauseCountdownDisplay) pauseCountdownDisplay.textContent = "";
        reflashButton.disabled = true;
    }

    // --- Game Flow & UI Updates ---
    function updateDisplays() {
        currentLevelDisplay.textContent = `${currentRound} / ${MAX_ROUNDS}`;
        currentScoreDisplay.textContent = score;
        currentSpeedDisplay.textContent = gameActive ? actualDisplaySpeed : "N/A";
        if (totalLettersAttempted === 0) {
            accuracyRatingDisplay.textContent = '100%';
        } else {
            let percent = (totalLettersCorrect / totalLettersAttempted) * 100;
            accuracyRatingDisplay.textContent = (percent % 1 === 0 ? Math.round(percent) : percent.toFixed(1)) + '%';
        }
        if (effectiveHzDisplay) {
            if (gameActive && actualDisplaySpeed > 0) {
                const effectiveHz = 1000 / actualDisplaySpeed;
                effectiveHzDisplay.textContent = `${effectiveHz.toFixed(2)} Hz`;
            } else {
                effectiveHzDisplay.textContent = "N/A";
            }
        }
        updateTotalTimeDisplay();
    }

    function updateTotalTimeDisplay() {
        // Total time for the round = number of letters * actualDisplaySpeed (in ms)
        const totalMs = numberOfLettersToDisplay * actualDisplaySpeed;
        if (totalMs >= 1000) {
            totalTimeDisplay.textContent = (totalMs / 1000).toFixed(3) + ' s';
        } else {
            totalTimeDisplay.textContent = totalMs + ' ms';
        }
    }

    // Helper to set submitButton as 'Submit Answer' or 'Next Round'
    function setSubmitButtonMode(mode) {
        if (mode === 'submit') {
            submitButton.textContent = 'Submit Answer';
            submitButton.disabled = false;
            submitButton.onclick = handleAnswerSubmitted;
        } else if (mode === 'next') {
            submitButton.textContent = 'Next Round';
            submitButton.disabled = false;
            submitButton.onclick = function () {
                if (gameActive) {
                    countdownMessageDisplay.textContent = "";
                    advanceToNextRound();
                }
            };
        }
    }

    function resetUIForNewRound() {
        countdownMessageDisplay.textContent = "";
        submitButton.disabled = true;
        submitButton.textContent = 'Submit Answer';
        submitButton.onclick = handleAnswerSubmitted;
        reflashButton.disabled = true;
        flashingLetterDisplay.textContent = "";
        flashingLetterDisplay.style.visibility = 'hidden';
        stopFlashCycle();
        reflashCount = 0;
        updateTotalTimeDisplay();
        if (nextRoundHint) nextRoundHint.classList.remove('visible-hint');
    }

    function startGame() {
        gameActive = true;
        resetUIForNewRound();
        messageDisplay.textContent = "";
        messageDisplay.className = "";
        currentRound = 1;
        score = 0;
        actualDisplaySpeed = initialDisplaySpeed;
        totalLettersAttempted = 0;
        totalLettersCorrect = 0;
        updateDisplays();
        updateTotalTimeDisplay();
        startButton.textContent = "Restart Game";
        difficultySlider.disabled = true;
        proceedToNextRoundSetup();
    }

    function advanceToNextRound() {
        currentRound++;
        updateDisplays();
        proceedToNextRoundSetup();
    }

    function proceedToNextRoundSetup() {
        resetUIForNewRound();
        generateLetters();
        currentSpeedDisplay.textContent = actualDisplaySpeed;
        function onNewRoundCountdownEnd() {
            messageDisplay.textContent = "";
            messageDisplay.className = "";
            manageFlashAndInputCycle();
        }
        startCountdown(1000, pauseCountdownDisplay, onNewRoundCountdownEnd);
    }

    function calculateSpeedDecrease(isPerfect, speed, minSpeed) {
        const baseDecrease = isPerfect ? speedDecreasePerfect : speedDecreaseCorrectOrder;

        if (speed <= minSpeed) return 1; // Minimal change if at or below floor

        // If speed is significantly > initialDisplaySpeed (e.g., after many mistakes), apply baseDecrease directly.
        // This ensures that player can recover speed even if it has become very slow.
        if (speed > initialDisplaySpeed + (mistakeSpeedPenalty * 2)) { // e.g., > 100 + 20 = 120ms
            return baseDecrease;
        }

        // Scale decrease between initialDisplaySpeed and minSpeed
        const speedRange = initialDisplaySpeed - minSpeed; // e.g., 100 - 20 = 80

        // If initialDisplaySpeed is somehow less than or equal to minSpeed, return a small fixed decrease.
        if (speedRange <= 0) return Math.max(1, Math.round(baseDecrease / 4));

        // currentProgressInScaling goes from 0 (at minSpeed) to 1 (at initialDisplaySpeed)
        // We clamp speed to be within [minSpeed, initialDisplaySpeed] for this scaling calculation
        // to avoid negative progress or progress > 1 if speed is outside this typical 'good performance' range.
        const clampedSpeed = Math.max(minSpeed, Math.min(speed, initialDisplaySpeed));
        const currentProgressInScaling = (clampedSpeed - minSpeed) / speedRange;

        // Define minimum meaningful decrease factor, e.g., 25% of baseDecrease at minSpeed
        const minDecreaseFactor = 0.25; // So, at minSpeed, decrease is 25% of baseDecrease
        const scaledDecrease = baseDecrease * (minDecreaseFactor + (1 - minDecreaseFactor) * currentProgressInScaling);

        return Math.max(1, Math.round(scaledDecrease));
    }

    function handleAnswerSubmitted() {
        stopFlashCycle();
        flashingLetterDisplay.style.visibility = 'hidden';
        flashingLetterDisplay.textContent = "";
        reflashButton.disabled = true;
        const userGuess = letterInputs.map(input => input.value.toUpperCase().trim());
        if (userGuess.some(letter => letter.length !== 1 || !alphabet.includes(letter))) {
            messageDisplay.textContent = "Please enter a valid single letter in all boxes.";
            messageDisplay.className = "incorrect";
            if (gameActive) submitButton.disabled = false;
            reflashButton.disabled = !gameActive;
            return;
        }
        submitButton.disabled = true;
        let numCorrectInPosition = 0;
        let numCorrectWrongPosition = 0;
        let completelyIncorrectTyped = 0; // Guessed letters NOT in currentLetters at all

        let currentRoundBaseScore = 0; // Score before multipliers
        let feedbackMessage = "";
        let reflashPenaltyMessage = "";

        const tempCurrentLetters = [...currentLetters]; // Modifiable copy for matching
        const guessStatus = userGuess.map(() => ({ matchedCorrectLetter: false, inCorrectPosition: false }));

        // Pass 1: Check for correct letters in correct positions
        for (let i = 0; i < userGuess.length; i++) {
            if (i < tempCurrentLetters.length && userGuess[i] === tempCurrentLetters[i]) {
                numCorrectInPosition++;
                currentRoundBaseScore += POINTS_CORRECT_POSITION;
                tempCurrentLetters[i] = null; // Mark as matched in correct position
                guessStatus[i].matchedCorrectLetter = true;
                guessStatus[i].inCorrectPosition = true;
            }
        }

        // Pass 2: Check for correct letters in wrong positions
        for (let i = 0; i < userGuess.length; i++) {
            if (!guessStatus[i].inCorrectPosition && i < currentLetters.length) { // Only consider if not already awarded for correct position
                const indexInTemp = tempCurrentLetters.indexOf(userGuess[i]);
                if (indexInTemp !== -1) {
                    numCorrectWrongPosition++;
                    currentRoundBaseScore += POINTS_CORRECT_WRONG_POSITION;
                    tempCurrentLetters[indexInTemp] = null; // Mark as matched in wrong position
                    guessStatus[i].matchedCorrectLetter = true;
                }
            }
        }

        // Count letters guessed by user that were not in the sequence at all
        for (let i = 0; i < userGuess.length; i++) {
            if (!guessStatus[i].matchedCorrectLetter) {
                completelyIncorrectTyped++;
            }
        }

        // --- Update Accuracy Display Stats ---
        totalLettersAttempted += userGuess.length;
        // Grant 1 point for accuracy for correct position, 0.5 for correct letter in wrong position
        totalLettersCorrect += numCorrectInPosition + (numCorrectWrongPosition * 0.5);

        // --- Speed Adjustment Logic ---
        const isPerfectRound = (numCorrectInPosition === currentLetters.length) && (userGuess.length === currentLetters.length);

        // Condition for penalty: majority of *guessed* letters are completely wrong AND no letter was in correct position.
        const applyPenalty = (completelyIncorrectTyped > userGuess.length / 2) && (numCorrectInPosition === 0);

        if (applyPenalty) {
            actualDisplaySpeed = Math.min(maxDisplaySpeed, actualDisplaySpeed + mistakeSpeedPenalty);
            messageDisplay.className = "incorrect";
        } else {
            if (isPerfectRound) {
                const decrease = calculateSpeedDecrease(true, actualDisplaySpeed, minPracticalDisplaySpeed);
                actualDisplaySpeed = Math.max(minPracticalDisplaySpeed, actualDisplaySpeed - decrease);
                messageDisplay.className = "bonus"; // Perfect round gets bonus style
            } else if (numCorrectInPosition > 0 || numCorrectWrongPosition > 0) {
                // Some letters correct (either position or just the letter type), and no penalty
                const decrease = calculateSpeedDecrease(false, actualDisplaySpeed, minPracticalDisplaySpeed);
                actualDisplaySpeed = Math.max(minPracticalDisplaySpeed, actualDisplaySpeed - decrease);
                messageDisplay.className = "correct";
            } else {
                messageDisplay.className = "incorrect"; // Still an incorrect round in terms of score
            }
        }

        // Always show the new time
        const speedChangeMessage = `New time: ${actualDisplaySpeed} ms.`;

        // --- Final Scoring --- 
        let finalRoundScore = currentRoundBaseScore;
        if (isPerfectRound) {
            finalRoundScore += POINTS_PERFECT_ORDER_BONUS; // Add flat bonus for perfect, before speed/reflash multipliers
        }

        const speedMultiplier = Math.max(0.2, initialDisplaySpeed / actualDisplaySpeed);
        finalRoundScore *= speedMultiplier;

        const reflashMultiplier = Math.max(0, 1 - reflashCount * 0.20); // 0.20 is reflashPenaltyPer
        finalRoundScore = Math.round(finalRoundScore * reflashMultiplier);

        if (reflashCount > 0) {
            reflashPenaltyMessage = ` (Re-flashed ${reflashCount} time${reflashCount > 1 ? 's' : ''}, score reduced)`;
        }

        // --- Construct Feedback Message ---
        // Emoji arrays for each tier
        let startEmojis = [];
        let endEmojis = [];
        let supportiveMessages = [];
        if (finalRoundScore >= 15) {
            startEmojis = ['🎉', '🏆', '🥇', '🤩', '🙊'];
            endEmojis = ['🙊', '🎊', '👏', '💯', '🎉'];
            supportiveMessages = [
                "Amazing!",
                "Incredible memory!",
                "You're on fire!",
                "Superb!",
                "Banana genius!"
            ];
        } else if (finalRoundScore >= 8) {
            startEmojis = ['🍌', '🙈', '🦍', '🌟', '🍍'];
            endEmojis = ['🙈', '🍌', '👍', '💪', '🍃'];
            supportiveMessages = [
                "Great job!",
                "Nice work!",
                "Keep it up!",
                "Solid round!",
                "You're getting sharper!"
            ];
        } else if (finalRoundScore > 0) {
            startEmojis = ['🐒', '🙉', '🦧', '🍃', '😺'];
            endEmojis = ['🙉', '🐒', '🙂', '🌱', '🍂'];
            supportiveMessages = [
                "Not bad!",
                "Keep practicing!",
                "You can do it!",
                "Stay focused!",
                "Almost there!"
            ];
        } else {
            startEmojis = ['🌱', '😅', '🥲', '🫣', '🫤'];
            endEmojis = ['🌱', '😬', '😶‍🌫️', '🫠', '💤'];
            supportiveMessages = [
                "Don't give up!",
                "Try again!",
                "Every round helps!",
                "Keep going!",
                "You'll get it next time!"
            ];
        }
        // Pick random emojis for start and end (can be the same, but usually not)
        const startEmoji = startEmojis[Math.floor(Math.random() * startEmojis.length)];
        let endEmoji = endEmojis[Math.floor(Math.random() * endEmojis.length)];
        // If by chance they're the same, pick again for end (unless only one in array)
        if (startEmojis.length > 1 && startEmoji === endEmoji) {
            let tries = 0;
            while (endEmoji === startEmoji && tries < 5) {
                endEmoji = endEmojis[Math.floor(Math.random() * endEmojis.length)];
                tries++;
            }
        }
        const randomMsg = supportiveMessages[Math.floor(Math.random() * supportiveMessages.length)];
        // Compose guess and answer string
        const guessStr = userGuess.join('');
        const answerStr = currentLetters.join('');
        // Build the new feedback message
        feedbackMessage = `${startEmoji} ${randomMsg}  Guess: ${guessStr}, Answer: ${answerStr}. `;
        if (finalRoundScore > 0) {
            feedbackMessage += `+${finalRoundScore} points. `;
        } else {
            feedbackMessage += `No points this round. `;
        }
        if (reflashCount > 0) {
            feedbackMessage += `(Re-flashed ${reflashCount} time${reflashCount > 1 ? 's' : ''}, score reduced). `;
        }
        feedbackMessage += speedChangeMessage + ` ${endEmoji}`;

        messageDisplay.textContent = feedbackMessage;
        score += finalRoundScore;
        updateDisplays();

        if (currentRound >= MAX_ROUNDS && gameActive) {
            endGame();
        } else if (gameActive) {
            setSubmitButtonMode('next');
            if (nextRoundHint) {
                nextRoundHint.textContent = "Press Enter to start next round.";
                nextRoundHint.classList.add('visible-hint');
            }
            requestAnimationFrame(() => { submitButton.focus(); });
        }
    }

    function endGame() {
        gameActive = false;
        stopFlashCycle();
        // --- Refined: Use normalized score (score per letter) for fairer end-game messaging ---
        const scoreBrackets = [
            {
                min: 0, max: 99,
                emoji: ['🌱', '😅', '🥲', '🫣', '🫤', '🙈', '🍌', '💤', '😬', '😶‍🌫️'],
                messages: [
                    "Banana Beginner! Back to the trees for more practice!",
                    "Oops! Did you slip on a banana peel?",
                    "Don't worry, even monkeys fall sometimes!",
                    "You'll get it next time, seedling!",
                    "The jungle giggles, but you'll be back!",
                    "Keep trying, little monkey!",
                    "Banana memory loading…",
                    "You're just getting started!",
                    "Every monkey starts somewhere!",
                    "At least you didn't eat your keyboard!"
                ]
            },
            {
                min: 100, max: 199,
                emoji: ['🐒', '🍃', '🌱', '🙉', '🍂', '😺', '🌴', '🥉', '🦧', '🧭'],
                messages: [
                    "Jungle Explorer! You made it through the vines!",
                    "Not bad! Keep climbing, explorer!",
                    "You're learning the ways of the jungle!",
                    "Banana potential detected!",
                    "You're on the right branch!",
                    "Keep swinging, you'll get there!",
                    "Monkey see, monkey do – and you did!",
                    "You're almost a Monkey Master!",
                    "The jungle is rooting for you!",
                    "Practice makes perfect (and bananas)!"
                ]
            },
            {
                min: 200, max: 299,
                emoji: ['🐵', '🍌', '🌿', '🙊', '🍍', '🦧', '🍂', '🌴', '🧗', '🦜'],
                messages: [
                    "Banana Bud! You're getting the hang of this!",
                    "Monkey moves detected!",
                    "You're swinging higher!",
                    "Banana stash growing!",
                    "You're a jungle up-and-comer!",
                    "Keep munching those memory bananas!",
                    "You're on the right vine!",
                    "Monkey business is booming!",
                    "You're climbing the jungle ranks!",
                    "Banana brain in progress!"
                ]
            },
            {
                min: 300, max: 399,
                emoji: ['🙈', '🍌', '🦍', '🌟', '🍍', '👏', '😎', '🦧', '🍃', '🥈'],
                messages: [
                    "Monkey Apprentice! The jungle is impressed!",
                    "Great job! You're swinging through those letters!",
                    "Banana-fuelled brilliance!",
                    "You're a memory machine!",
                    "That's some serious monkey business!",
                    "You've got more focus than a monkey with a magnifying glass!",
                    "You're climbing the leaderboard vine!",
                    "You're one smart primate!",
                    "Keep going, Monkey Apprentice!",
                    "Banana stash: growing rapidly!"
                ]
            },
            {
                min: 400, max: 499,
                emoji: ['🦍', '🍌', '🎊', '💪', '🌟', '🍍', '👏', '😎', '🥈', '🙈'],
                messages: [
                    "Monkey Master! The jungle is impressed!",
                    "Banana stash overflowing!",
                    "You're a memory machine!",
                    "That's some serious monkey business!",
                    "You've got more focus than a monkey with a magnifying glass!",
                    "You're climbing the leaderboard vine!",
                    "Banana-fuelled brilliance!",
                    "You're one smart primate!",
                    "Keep going, Monkey Master!",
                    "Banana brain: upgraded!"
                ]
            },
            {
                min: 500, max: 599,
                emoji: ['🦍', '🍌', '🏅', '🎉', '🙊', '💪', '🌟', '🍍', '👏', '😎'],
                messages: [
                    "Banana Boss! You're dominating the jungle!",
                    "Memory muscles flexed!",
                    "You're a banana-slinging superstar!",
                    "Jungle legend in the making!",
                    "You're swinging with style!",
                    "Banana brain: supercharged!",
                    "You're a focus phenom!",
                    "Monkey business is your business!",
                    "You're a vine-swinging virtuoso!",
                    "Banana Boss badge unlocked!"
                ]
            },
            {
                min: 600, max: 699,
                emoji: ['🦍', '🍌', '🏅', '🎉', '🙊', '💪', '🌟', '🍍', '👏', '😎'],
                messages: [
                    "Banana Baron! The jungle is in awe!",
                    "You're a memory marvel!",
                    "Banana brilliance!",
                    "You're a focus force of nature!",
                    "Monkey mind: maxed out!",
                    "You're a legend in the making!",
                    "Banana Baron badge unlocked!",
                    "You're a vine-swinging virtuoso!",
                    "Banana Baron: bananas for days!",
                    "You're a focus phenom!"
                ]
            },
            {
                min: 700, max: 799,
                emoji: ['🙊', '🍌', '🏆', '🎉', '👑', '🚀', '🤩', '💯', '🔥', '🥇'],
                messages: [
                    "Banana King! You're ruling the jungle!",
                    "Unstoppable! The jungle bows to your memory powers!",
                    "Legendary! Did you eat a whole bunch of bananas before playing?",
                    "You see letters faster than a monkey spots a banana truck!",
                    "Top of the tree! Is that a crown or just a banana peel?",
                    "You broke the banana speed limit!",
                    "Monkeyread Mastermind!",
                    "Your neurons are doing backflips!",
                    "Banana trophy unlocked!",
                    "You just set a new jungle record!"
                ]
            },
            {
                min: 800, max: 899,
                emoji: ['👑', '🍌', '🏆', '🎉', '🙊', '🚀', '🤩', '💯', '🔥', '🥇'],
                messages: [
                    "Banana Emperor! You're a legend!",
                    "Unbelievable! The jungle is speechless!",
                    "You're a memory monarch!",
                    "Banana Emperor badge unlocked!",
                    "You're rewriting the jungle record books!",
                    "Banana Emperor: bananas for eternity!",
                    "You're a focus force of nature!",
                    "Monkey mind: maxed out!",
                    "Banana Emperor: the legend continues!",
                    "You're a vine-swinging virtuoso!"
                ]
            },
            {
                min: 900, max: 999,
                emoji: ['👑', '🍌', '🏆', '🎉', '🙊', '🚀', '🤩', '💯', '🔥', '🥇'],
                messages: [
                    "Banana Supreme! You're rewriting the laws of monkey memory!",
                    "Unreal! The jungle is in shock!",
                    "You're a memory machine!",
                    "Banana Supreme badge unlocked!",
                    "You're a legend among monkeys!",
                    "Banana Supreme: bananas for centuries!",
                    "You're a focus force of nature!",
                    "Monkey mind: maxed out!",
                    "Banana Supreme: the saga continues!",
                    "You're a vine-swinging virtuoso!"
                ]
            },
            {
                min: 1000, max: 1099,
                emoji: ['👑', '🍌', '🏆', '🎉', '🙊', '🚀', '🤩', '💯', '🔥', '🥇'],
                messages: [
                    "Banana Immortal! You've ascended to monkey legend!",
                    "Transcendent! The jungle is in awe!",
                    "You're a memory immortal!",
                    "Banana Immortal badge unlocked!",
                    "You're rewriting the jungle's history books!",
                    "Banana Immortal: bananas for millennia!",
                    "You're a focus force of nature!",
                    "Monkey mind: maxed out!",
                    "Banana Immortal: the legend grows!",
                    "You're a vine-swinging virtuoso!"
                ]
            },
            {
                min: 1100, max: 1199,
                emoji: ['👑', '🍌', '🏆', '🎉', '🙊', '🚀', '🤩', '💯', '🔥', '🥇'],
                messages: [
                    "Banana Ascendant! You're a myth in the jungle!",
                    "Unbelievable! The jungle is speechless!",
                    "You're a memory ascendant!",
                    "Banana Ascendant badge unlocked!",
                    "You're rewriting the jungle's legends!",
                    "Banana Ascendant: bananas for eons!",
                    "You're a focus force of nature!",
                    "Monkey mind: maxed out!",
                    "Banana Ascendant: the myth continues!",
                    "You're a vine-swinging virtuoso!"
                ]
            },
            {
                min: 1200, max: 1299,
                emoji: ['👑', '🍌', '🏆', '🎉', '🙊', '🚀', '🤩', '💯', '🔥', '🥇'],
                messages: [
                    "Banana Deity! You're a god among monkeys!",
                    "Transcendent! The jungle is in awe!",
                    "You're a memory deity!",
                    "Banana Deity badge unlocked!",
                    "You're rewriting the jungle's divine records!",
                    "Banana Deity: bananas for infinity!",
                    "You're a focus force of nature!",
                    "Monkey mind: maxed out!",
                    "Banana Deity: the saga continues!",
                    "You're a vine-swinging virtuoso!"
                ]
            },
            {
                min: 1300, max: 1399,
                emoji: ['👑', '🍌', '🏆', '🎉', '🙊', '🚀', '🤩', '💯', '🔥', '🥇'],
                messages: [
                    "Banana Cosmic! You're out of this world!",
                    "Unreal! The universe is in shock!",
                    "You're a cosmic memory!",
                    "Banana Cosmic badge unlocked!",
                    "You're rewriting the universe's records!",
                    "Banana Cosmic: bananas for galaxies!",
                    "You're a focus force of nature!",
                    "Monkey mind: maxed out!",
                    "Banana Cosmic: the legend expands!",
                    "You're a vine-swinging virtuoso!"
                ]
            },
            {
                min: 1400, max: 1499,
                emoji: ['👑', '🍌', '🏆', '🎉', '🙊', '🚀', '🤩', '💯', '🔥', '🥇'],
                messages: [
                    "Banana Multiversal! You're a legend in every dimension!",
                    "Transcendent! The multiverse is in awe!",
                    "You're a multiversal memory!",
                    "Banana Multiversal badge unlocked!",
                    "You're rewriting the multiverse's records!",
                    "Banana Multiversal: bananas for all realities!",
                    "You're a focus force of nature!",
                    "Monkey mind: maxed out!",
                    "Banana Multiversal: the saga continues!",
                    "You're a vine-swinging virtuoso!"
                ]
            },
            {
                min: 1500, max: Infinity,
                emoji: ['👑', '🍌', '🏆', '🎉', '🙊', '🚀', '🤩', '💯', '🔥', '🥇'],
                messages: [
                    "Banana Infinite! You've broken the game!",
                    "Unstoppable! The cosmos bows to your memory powers!",
                    "You're a memory singularity!",
                    "Banana Infinite badge unlocked!",
                    "You're rewriting the laws of reality!",
                    "Banana Infinite: bananas for eternity!",
                    "You're a focus force of nature!",
                    "Monkey mind: maxed out!",
                    "Banana Infinite: the legend is eternal!",
                    "You're a vine-swinging virtuoso!"
                ]
            }
        ];
        // Calculate normalized score (score per letter)
        const normalizedScore = numberOfLettersToDisplay > 0 ? score / numberOfLettersToDisplay : score;
        // Find the correct bracket using normalized score
        const bracket = scoreBrackets.find(b => normalizedScore >= b.min && normalizedScore <= b.max) || scoreBrackets[0];
        const chosenEmoji = bracket.emoji[Math.floor(Math.random() * bracket.emoji.length)];
        const chosenMsg = bracket.messages[Math.floor(Math.random() * bracket.messages.length)];
        // Show both raw score and difficulty in the message
        const gameOverMsg = `${chosenEmoji} ${chosenMsg} Final Score: ${score} (Difficulty: ${numberOfLettersToDisplay} letters) in ${MAX_ROUNDS} rounds.`;
        messageDisplay.textContent = gameOverMsg;
        messageDisplay.className = "bonus";
        submitButton.disabled = true;
        submitButton.textContent = 'Submit Answer';
        submitButton.onclick = handleAnswerSubmitted;
        reflashButton.disabled = true;
        startButton.textContent = "Play Again?";
        difficultySlider.disabled = false;
        if (nextRoundHint) nextRoundHint.classList.remove('visible-hint');
        updateDisplays();
    }

    function updateDifficulty() {
        numberOfLettersToDisplay = parseInt(difficultySlider.value, 10);
        difficultyValue.textContent = numberOfLettersToDisplay;
        createLetterInputs(numberOfLettersToDisplay);
        // Set thumb color based on value (7-step gradient)
        const thumbColors = [
            '#16C172', // 1 - green
            '#6CD86C', // 2 - lighter green
            '#C6E84E', // 3 - yellow-green
            '#FFE156', // 4 - yellow
            '#FFC300', // 5 - orange-yellow
            '#FF6E1A', // 6 - orange
            '#FF2D2D'  // 7 - red
        ];
        const idx = Math.max(1, Math.min(7, numberOfLettersToDisplay)) - 1;
        document.documentElement.style.setProperty('--difficulty-thumb-color', thumbColors[idx]);
    }

    // --- Event Listeners ---
    startButton.addEventListener('click', () => {
        stopFlashCycle();
        gameActive = false; // Explicitly set gameActive to false before starting/restarting
        startGame();
    });

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
                event.preventDefault();
                handleAnswerSubmitted();
            }
        }
    });

    difficultySlider.addEventListener('input', () => {
        if (!gameActive) {
            updateDifficulty();
            // Update total time display if difficulty changes when game not active
            updateTotalTimeDisplay();
        }
    });

    letterInputsWrapper.addEventListener('focusin', (event) => {
        if (event.target.tagName === 'INPUT' && event.target.type === 'text') {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS) {
                setTimeout(() => {
                    inputArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 300); // Delay to allow keyboard to animate
            }
        }
    });

    // Initial Setup
    updateDifficulty();
    updateDisplays();
    resetUIForNewRound();
    difficultySlider.disabled = false;

    // Estimate frame interval to adjust minPracticalDisplaySpeed
    estimateFrameInterval(() => {
        console.log(`Async: Min practical display speed has been finalized to ${minPracticalDisplaySpeed}ms.`);
        updateDisplays();
    });
});