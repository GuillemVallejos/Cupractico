document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const gameContainer = document.getElementById("game-container");
    const car = document.getElementById("car");
    const speedValue = document.getElementById("speed-value");
    const brakeButton = document.getElementById("brake-button");
    const road = document.getElementById("road");
    const targetZone = document.getElementById("target-zone");
    const instructions = document.getElementById("instructions");
    const victoryPanel = document.getElementById("victory-panel");
    const closePanelBtn = document.getElementById("close-panel-btn");
    const unlockAnimation = document.getElementById("unlock-animation");
    const roadLine = document.querySelector(".road-line"); // For stopping animation

    // --- Game Constants & Variables ---
    const gameWidth = gameContainer.offsetWidth;
    const carWidth = car.offsetWidth;
    const initialSpeedKmh = 100;
    const pixelsPerMeter = 5;
    const updateIntervalMs = 16;
    const initialSpeedPps = (initialSpeedKmh * 1000 / 3600) * pixelsPerMeter;
    const initialSpeedPpu = initialSpeedPps * (updateIntervalMs / 1000);
    const brakingDecelerationPpu = initialSpeedPpu / (3 * (1000 / updateIntervalMs));
    const targetZoneWidth = 100;
    const targetZoneStart = gameWidth * 0.75;
    const targetZoneEnd = targetZoneStart + targetZoneWidth;

    let currentSpeedPpu = initialSpeedPpu;
    let carPositionPx = 50;
    let isBraking = false;
    let gameLoopInterval = null;
    let gameActive = false;
    let gameResult = null;

    // --- Game Functions ---

    function setupTargetZone() {
        targetZone.style.left = `${targetZoneStart}px`;
        targetZone.style.width = `${targetZoneWidth}px`;
    }

    function updateGame() {
        if (!gameActive) return;

        if (isBraking) {
            car.classList.add("braking"); // Add braking class
            currentSpeedPpu -= brakingDecelerationPpu;
            if (currentSpeedPpu <= 0) {
                currentSpeedPpu = 0;
                stopGame();
                checkWinCondition();
                return;
            }
        } else {
            car.classList.remove("braking");
            currentSpeedPpu = initialSpeedPpu;
        }

        carPositionPx += currentSpeedPpu;
        car.style.left = `${carPositionPx}px`;

        let currentSpeedKmh = ((currentSpeedPpu / (updateIntervalMs / 1000)) / pixelsPerMeter) * 3600 / 1000;
        speedValue.textContent = Math.max(0, Math.round(currentSpeedKmh));

        if (!isBraking && carPositionPx > targetZoneEnd + carWidth * 2) { // Check further out
            console.log("Car missed the zone completely");
            gameResult = "lose_missed";
            stopGame();
            showResult();
        }
    }

    function checkWinCondition() {
        const carFrontPosition = carPositionPx + carWidth;
        console.log(`Car stopped at: ${carPositionPx} (Front: ${carFrontPosition})`);
        console.log(`Target Zone: ${targetZoneStart} - ${targetZoneEnd}`);

        if (carPositionPx >= targetZoneStart && carFrontPosition <= targetZoneEnd) {
            gameResult = "win";
            console.log("Result: WIN!");
        } else if (carFrontPosition < targetZoneStart) {
            gameResult = "lose_short";
            console.log("Result: LOSE (Too Short)");
        } else {
            gameResult = "lose_long";
            console.log("Result: LOSE (Too Long)");
        }
        showResult();
    }

    function showResult() {
        instructions.classList.remove("win", "lose"); // Clear previous result styles

        if (gameResult === "win") {
            instructions.textContent = "¡Frenada Perfecta!";
            instructions.classList.add("win");
            // Show victory panel after a short delay
            setTimeout(() => {
                victoryPanel.classList.remove("hidden");
            }, 500);
        } else {
            let message = "Inténtalo de nuevo.";
            if (gameResult === "lose_short") {
                message = "¡Demasiado corto! Inténtalo de nuevo.";
            } else if (gameResult === "lose_long") {
                message = "¡Demasiado largo! Inténtalo de nuevo.";
            } else if (gameResult === "lose_missed") {
                message = "¡Te pasaste la zona! Inténtalo de nuevo.";
            }
            instructions.textContent = message;
            instructions.classList.add("lose");
            // Allow restarting after a delay for lose conditions
            setTimeout(() => {
                instructions.textContent = message + " (Pulsa para reiniciar)";
                gameContainer.addEventListener("click", restartGame, { once: true });
                document.addEventListener("keydown", handleRestartKey, { once: true });
            }, 1500);
        }
    }

    // --- Game State ---
    function startGame() {
        if (gameActive) return;
        console.log("Starting game...");
        // Reset variables and UI
        carPositionPx = 50;
        car.style.left = `${carPositionPx}px`;
        car.classList.remove("braking");
        currentSpeedPpu = initialSpeedPpu;
        speedValue.textContent = initialSpeedKmh;
        isBraking = false;
        gameResult = null;
        brakeButton.disabled = false;
        instructions.textContent = "Pulsa FRENAR para detenerte en la zona objetivo";
        instructions.classList.remove("win", "lose");
        victoryPanel.classList.add("hidden");
        unlockAnimation.classList.add("hidden");
        roadLine.style.animationPlayState = 'running'; // Ensure road lines are moving
        car.style.animationPlayState = 'running'; // Ensure car bobbing is active
        gameActive = true;

        setupTargetZone();

        if (gameLoopInterval) clearInterval(gameLoopInterval);
        gameLoopInterval = setInterval(updateGame, updateIntervalMs);
    }

    function stopGame() {
        console.log("Stopping game loop.");
        gameActive = false;
        if (gameLoopInterval) {
            clearInterval(gameLoopInterval);
            gameLoopInterval = null;
        }
        brakeButton.disabled = true;
        roadLine.style.animationPlayState = 'paused'; // Stop road lines
        car.style.animationPlayState = 'paused'; // Stop car bobbing
        car.classList.remove("braking");
    }

    function restartGame() {
        console.log("Restarting game...");
        // Remove potential keydown listener if click triggered restart
        document.removeEventListener("keydown", handleRestartKey);
        startGame();
    }

    function handleRestartKey(e) {
        if (e.code === "Space" || e.code === "Enter") {
             // Remove potential click listener if key triggered restart
            gameContainer.removeEventListener("click", restartGame);
            restartGame();
        }
    }

    // --- Event Listeners ---
    brakeButton.addEventListener("click", () => {
        if (gameActive && !isBraking) {
            console.log("Braking initiated!");
            isBraking = true;
            // Button is disabled in stopGame
        }
    });

    closePanelBtn.addEventListener("click", () => {
        victoryPanel.classList.add("hidden");
        // Show unlock animation
        unlockAnimation.classList.remove("hidden");
        // Hide animation and allow restart after a delay
        setTimeout(() => {
            unlockAnimation.classList.add("hidden");
            instructions.textContent = "¡Pieza Desbloqueada! (Pulsa para reiniciar)";
            gameContainer.addEventListener("click", restartGame, { once: true });
            document.addEventListener("keydown", handleRestartKey, { once: true });
        }, 2000); // Adjust timing based on animation length
    });

    // --- Initial Setup ---
    startGame();

});

