document.addEventListener("DOMContentLoaded", () => {
    const gameContainer = document.getElementById("game-container");
    const player = document.getElementById("player");
    const scoreDisplay = document.getElementById("score");
    const obstacleContainer = document.getElementById("obstacle-container");
    const winPanel = document.getElementById("win-panel");
    const closePanelBtn = document.getElementById("close-panel-btn");
    const unlockAnimation = document.getElementById("unlock-animation");
    const ground = document.getElementById("ground");

    let score = 0;
    let isJumping = false;
    let gameSpeed = 8; // Initial speed
    let obstacleInterval;
    let scoreInterval;
    let isGameOver = false;
    const winScore = 1000;
    const gravity = 1.2;
    let jumpVelocity = 0;
    const initialJumpVelocity = 22;
    const playerBottom = 50;
    const obstacleWidth = 90; // Match CSS obstacle width
    const obstacleHeight = 55; // Match CSS obstacle height

    // --- Game Initialization ---
    function initGame() {
        score = 0;
        isJumping = false;
        isGameOver = false;
        gameSpeed = 8; // Reset initial speed
        player.style.bottom = `${playerBottom}px`;
        scoreDisplay.textContent = `Score: ${score}`;
        scoreDisplay.classList.remove("score-update"); // Ensure animation class is removed
        obstacleContainer.innerHTML = "";
        winPanel.classList.add("hidden");
        unlockAnimation.classList.add("hidden");
        player.style.display = "block";
        player.style.animationPlayState = "running"; // Ensure player animation is running
        document.getElementById("instructions").textContent = "Press SPACE to jump over obstacles";
        startGame();
    }

    // --- Player Jump ---
    function jump() {
        if (!isJumping && !isGameOver) {
            isJumping = true;
            jumpVelocity = initialJumpVelocity;
            player.style.animationPlayState = "paused"; // Pause bobbing animation during jump

            let jumpInterval = setInterval(() => {
                if (isGameOver) {
                    clearInterval(jumpInterval);
                    player.style.animationPlayState = "running"; // Resume bobbing if game over during jump
                    return;
                }
                let currentBottom = parseInt(player.style.bottom);
                currentBottom += jumpVelocity;
                jumpVelocity -= gravity;
                player.style.bottom = `${currentBottom}px`;

                if (currentBottom <= playerBottom) {
                    clearInterval(jumpInterval);
                    player.style.bottom = `${playerBottom}px`;
                    isJumping = false;
                    jumpVelocity = 0;
                    player.style.animationPlayState = "running"; // Resume bobbing animation after landing
                }
            }, 20);
        }
    }

    // --- Obstacle Handling ---
    function createObstacle() {
        if (isGameOver) return;

        const obstacle = document.createElement("div");
        obstacle.classList.add("obstacle");
        obstacle.style.right = `-${obstacleWidth}px`;
        obstacleContainer.appendChild(obstacle);

        moveObstacle(obstacle);
    }

    function moveObstacle(obstacle) {
        let obstaclePosition = -obstacleWidth;
        let moveInterval = setInterval(() => {
            if (isGameOver || !obstacle.parentElement) {
                clearInterval(moveInterval);
                if (obstacle.parentElement) obstacle.remove();
                return;
            }
            obstaclePosition += gameSpeed;
            obstacle.style.right = `${obstaclePosition}px`;

            if (obstaclePosition > gameContainer.offsetWidth) {
                clearInterval(moveInterval);
                if (obstacle.parentElement) obstacle.remove();
            }

            checkCollision(obstacle);

        }, 20);
    }

    // --- Collision Detection (Refined) ---
    function checkCollision(obstacle) {
        if (isGameOver || !obstacle.parentElement) return;

        const playerRect = player.getBoundingClientRect();
        const obstacleRect = obstacle.getBoundingClientRect();

        // More precise collision check (adjust pixel values as needed for feel)
        const collisionMarginX = 20; // Horizontal margin
        const collisionMarginY = 15; // Vertical margin (mainly for top of obstacle)

        if (
            playerRect.right > obstacleRect.left + collisionMarginX &&
            playerRect.left < obstacleRect.right - collisionMarginX &&
            playerRect.bottom > obstacleRect.top + collisionMarginY
            // No need to check playerRect.top < obstacleRect.bottom usually
        ) {
            gameOver();
        }
    }

    // --- Scoring with Animation ---
    function updateScore() {
        if (isGameOver) return;
        score++;
        scoreDisplay.textContent = `Score: ${score}`;

        // Trigger score animation
        scoreDisplay.classList.add("score-update");
        // Remove class after animation completes to allow re-triggering
        setTimeout(() => {
            scoreDisplay.classList.remove("score-update");
        }, 300); // Match animation duration in CSS

        // Increase speed
        if (score > 0 && score % 100 === 0) {
            gameSpeed += 0.5;
            adjustObstacleSpawnRate();
        }

        if (score >= winScore) {
            winGame();
        }
    }

    // --- Adjust Obstacle Spawn Rate ---
    function adjustObstacleSpawnRate() {
        if (obstacleInterval) {
            clearInterval(obstacleInterval);
        }
        // Adjust interval based on game speed
        let intervalTime = Math.max(1000, 3500 / (gameSpeed / 5)); // Adjusted formula
        obstacleInterval = setInterval(createObstacle, intervalTime);
    }

    // --- Game State Management ---
    function startGame() {
        if (scoreInterval) clearInterval(scoreInterval);
        obstacleContainer.innerHTML = "";
        adjustObstacleSpawnRate(); // Set initial spawn rate
        scoreInterval = setInterval(updateScore, 100);
    }

    function gameOver() {
        if (isGameOver) return;
        isGameOver = true;
        clearInterval(obstacleInterval);
        clearInterval(scoreInterval);
        player.style.animationPlayState = "paused"; // Stop player bobbing

        console.log(`Game Over! Final Score: ${score}`);

        // Add a slight delay before showing restart text
        setTimeout(() => {
             if (isGameOver) { // Check again in case of quick restart
                document.getElementById("instructions").textContent = "Game Over! Click or Press SPACE to Restart";
                gameContainer.addEventListener("click", restartGame, { once: true });
             }
        }, 500);
    }

    function restartGame() {
        gameContainer.removeEventListener("click", restartGame);
        initGame();
    }

    function winGame() {
        if (isGameOver) return;
        isGameOver = true;
        clearInterval(obstacleInterval);
        clearInterval(scoreInterval);
        player.style.animationPlayState = "paused"; // Stop player bobbing
        winPanel.classList.remove("hidden");
    }

    // --- Event Listeners ---
    document.addEventListener("keydown", (e) => {
        if (!isGameOver && (e.code === "Space" || e.code === "ArrowUp")) {
            jump();
        }
        if (isGameOver && e.code === "Space") {
            restartGame();
        }
    });

    gameContainer.addEventListener("click", () => {
        if (!isGameOver) {
            jump();
        }
    });

    closePanelBtn.addEventListener("click", () => {
        winPanel.classList.add("hidden");
        unlockAnimation.classList.remove("hidden");
        setTimeout(() => {
            unlockAnimation.classList.add("hidden");
            document.getElementById("instructions").textContent = "Game Won! Click or Press SPACE to Restart";
            gameContainer.addEventListener("click", restartGame, { once: true });
        }, 2000);
    });

    // --- Start the game ---
    initGame();

});

