document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const gameContainer = document.getElementById("game-container");
    const chargeTrack = document.getElementById("charge-track");
    const chargeIndicator = document.getElementById("charge-indicator");
    const playerCharger = document.getElementById("player-charger");
    const batteryProgressBar = document.getElementById("battery-progress-bar");
    const chargeLevelDisplay = document.getElementById("charge-level");
    const instructionsDisplay = document.getElementById("instructions");
    const backButton = document.getElementById("back-button");
    // Add elements for win/lose messages (can be added to HTML or created dynamically)
    let messageOverlay = null; // Will be created dynamically

    // --- Game Constants & Variables ---
    const trackHeight = chargeTrack.offsetHeight;
    const indicatorHeight = chargeIndicator.offsetHeight;
    const chargerHeight = playerCharger.offsetHeight;
    const winCharge = 100;

    let gameLoopInterval = null;
    let isCharging = false;
    let chargeProgress = 0;
    let gameActive = false;
    let gameWon = false;

    // Player Charger Physics
    let chargerPos = 10;
    let chargerVelocity = 0;
    const chargerGravity = 0.5;
    const chargeBoost = 0.2; // Reduced from 1.2 to make the charger less responsive to clicks
    const maxChargerVelocity = 10;
    const minChargerVelocity = -10;

    // Charge Indicator Movement (Difficulty increases with progress)
    let indicatorPos = trackHeight / 2;
    let indicatorVelocity = 0;
    let indicatorMaxSpeed = 1.5; // Initial max speed
    let indicatorAcceleration = 0.08; // Initial acceleration
    const baseIndicatorMaxSpeed = 1.5;
    const baseIndicatorAcceleration = 0.08;
    const difficultyFactor = 0.02; // How much difficulty increases with chargeProgress
    let indicatorTargetPos = trackHeight / 2;
    let indicatorMoveCooldown = 0;
    const maxCooldown = 45; // Max wait time before changing direction
    const minCooldown = 15; // Min wait time

    // --- Game Functions ---

    function updateCharger() {
        if (isCharging) {
            chargerVelocity += chargeBoost;
        } else {
            chargerVelocity -= chargerGravity;
        }
        chargerVelocity = Math.max(minChargerVelocity, Math.min(maxChargerVelocity, chargerVelocity));
        chargerPos += chargerVelocity;
        if (chargerPos < 0) {
            chargerPos = 0;
            chargerVelocity = 0;
        }
        if (chargerPos > trackHeight - chargerHeight) {
            chargerPos = trackHeight - chargerHeight;
            chargerVelocity = 0;
        }
        playerCharger.style.bottom = `${chargerPos}px`;
    }

    function updateIndicator() {
        if (indicatorMoveCooldown > 0) {
            indicatorMoveCooldown--;
            return;
        }

        // Adjust difficulty based on progress
        indicatorMaxSpeed = baseIndicatorMaxSpeed + (chargeProgress * difficultyFactor);
        indicatorAcceleration = baseIndicatorAcceleration + (chargeProgress * difficultyFactor * 0.1);

        // More erratic movement pattern
        if (Math.random() < 0.03) { // Chance to change target
            let currentDirection = Math.sign(indicatorTargetPos - indicatorPos);
            let newTarget;
            // Try to move in the opposite direction or make a larger jump
            if (Math.random() < 0.6 && currentDirection !== 0) {
                newTarget = indicatorPos - currentDirection * (trackHeight * (0.3 + Math.random() * 0.4));
            } else {
                newTarget = Math.random() * (trackHeight - indicatorHeight);
            }
            indicatorTargetPos = Math.max(0, Math.min(trackHeight - indicatorHeight, newTarget));
            indicatorMoveCooldown = Math.floor(minCooldown + Math.random() * (maxCooldown - minCooldown));
        }

        let direction = Math.sign(indicatorTargetPos - indicatorPos);
        indicatorVelocity += direction * indicatorAcceleration;
        indicatorVelocity *= 0.92; // Slightly less damping
        indicatorVelocity = Math.max(-indicatorMaxSpeed, Math.min(indicatorMaxSpeed, indicatorVelocity));
        indicatorPos += indicatorVelocity;
        indicatorPos = Math.max(0, Math.min(trackHeight - indicatorHeight, indicatorPos));
        chargeIndicator.style.bottom = `${indicatorPos}px`;
    }

    function updateChargeProgress() {
        const chargerTop = chargerPos + chargerHeight;
        const indicatorTop = indicatorPos + indicatorHeight;
        let isOverlapping = false;

        if (chargerTop > indicatorPos && chargerPos < indicatorTop) {
            chargeProgress += 0.4; // Slightly slower charge rate
            isOverlapping = true;
        } else {
            chargeProgress -= 0.25; // Faster decrease rate
        }

        // Apply visual feedback for charging
        if (isOverlapping) {
            playerCharger.classList.add("charging");
        } else {
            playerCharger.classList.remove("charging");
        }

        chargeProgress = Math.max(0, Math.min(winCharge, chargeProgress));
        batteryProgressBar.style.width = `${chargeProgress}%`;
        chargeLevelDisplay.textContent = `Carga: ${Math.floor(chargeProgress)}%`;

        // Lose condition: If progress drops to 0 after starting significantly
        // if (chargeProgress <= 0 && gameActive && /* maybe add a condition like score > 10 */) {
        //     loseGame();
        // }

        if (chargeProgress >= winCharge) {
            winGame();
        }
    }

    // --- Game Loop ---
    function gameLoop() {
        if (!gameActive) return;
        updateCharger();
        updateIndicator();
        updateChargeProgress();
    }

    // --- Game State ---
    function resetGameVariables() {
        chargeProgress = 0;
        chargerPos = 10;
        chargerVelocity = 0;
        indicatorPos = trackHeight / 2;
        indicatorVelocity = 0;
        indicatorMaxSpeed = baseIndicatorMaxSpeed;
        indicatorAcceleration = baseIndicatorAcceleration;
        gameActive = false;
        gameWon = false;
        isCharging = false;
        batteryProgressBar.style.width = `0%`;
        chargeLevelDisplay.textContent = `Carga: 0%`;
        playerCharger.classList.remove("charging");
        if (messageOverlay) {
            messageOverlay.remove();
            messageOverlay = null;
        }
    }

    function startGame() {
        if (gameActive) return;
        resetGameVariables();
        gameActive = true;
        instructionsDisplay.textContent = "Mantén pulsado para subir el cargador."; // Update instructions
        if (gameLoopInterval) clearInterval(gameLoopInterval);
        gameLoopInterval = setInterval(gameLoop, 1000 / 60);
    }

    function stopGame() {
        gameActive = false;
        if (gameLoopInterval) {
            clearInterval(gameLoopInterval);
            gameLoopInterval = null;
        }
        playerCharger.classList.remove("charging");
    }

    function displayMessage(message, isWin) {
        stopGame();
        if (messageOverlay) messageOverlay.remove(); // Remove previous if exists

        messageOverlay = document.createElement("div");
        messageOverlay.id = "message-overlay";
        messageOverlay.innerHTML = `
            <h2>${message}</h2>
            <button id="restart-button">${isWin ? "Cargar Otra" : "Reintentar"}</button>
        `;
        messageOverlay.style.position = "absolute";
        messageOverlay.style.top = "50%";
        messageOverlay.style.left = "50%";
        messageOverlay.style.transform = "translate(-50%, -50%)";
        messageOverlay.style.backgroundColor = "rgba(44, 62, 80, 0.9)";
        messageOverlay.style.padding = "30px 40px";
        messageOverlay.style.borderRadius = "10px";
        messageOverlay.style.border = "2px solid var(--highlight-yellow)";
        messageOverlay.style.color = "var(--text-color)";
        messageOverlay.style.zIndex = "10";
        messageOverlay.querySelector("h2").style.color = isWin ? "var(--player-green-light)" : "var(--indicator-border)";
        messageOverlay.querySelector("h2").style.marginBottom = "20px";
        const button = messageOverlay.querySelector("button");
        button.style.padding = "10px 20px";
        button.style.fontSize = "1em";
        button.style.backgroundColor = isWin ? "var(--player-green)" : "var(--highlight-orange)";
        button.style.color = "#fff";
        button.style.border = "none";
        button.style.borderRadius = "5px";
        button.style.cursor = "pointer";

        gameContainer.appendChild(messageOverlay);

        button.addEventListener("click", () => {
            resetGameVariables();
            instructionsDisplay.textContent = "Pulsa para empezar";
            chargeLevelDisplay.textContent = "Pulsa para empezar";
        });
    }

    function winGame() {
        if (gameWon) return; // Prevent multiple wins
        gameWon = true;
        displayMessage("¡Batería Cargada!", true);
    }

    // function loseGame() {
    //     displayMessage("¡Carga Fallida!", false);
    // }

    // --- Event Listeners ---
    // Add back button functionality
    backButton.addEventListener("click", () => {
        // Navigate back to the 3D model page
        window.location.href = "../index.html";
    });

    function handleChargeStart(event) {
        if (event.target.id === "restart-button") return; // Don't affect restart button
        // Prevent default behavior for spacebar scrolling etc.
        if (event.type === "keydown" && event.code === "Space") {
            event.preventDefault();
        }
        if (!gameActive && !gameWon && !messageOverlay) {
             startGame();
        }
        if (gameActive) {
            isCharging = true;
        }
    }

    function handleChargeEnd(event) {
         if (event.target.id === "restart-button") return;
         if (gameActive) {
            isCharging = false;
         }
    }

    // Mouse controls
    document.body.addEventListener("mousedown", handleChargeStart);
    document.body.addEventListener("mouseup", handleChargeEnd);
    // Touch controls
    document.body.addEventListener("touchstart", handleChargeStart, { passive: false }); // Need passive: false to prevent scroll on touch
    document.body.addEventListener("touchend", handleChargeEnd);
    // Keyboard controls
    document.body.addEventListener("keydown", (e) => {
        if (e.code === "Space") {
            handleChargeStart(e);
        }
    });
    document.body.addEventListener("keyup", (e) => {
        if (e.code === "Space") {
            handleChargeEnd(e);
        }
    });

    // --- Initial Setup ---
    resetGameVariables(); // Set initial state
    instructionsDisplay.textContent = "Pulsa para empezar";
    chargeLevelDisplay.textContent = "Pulsa para empezar";

});