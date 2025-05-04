document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const gameContainer = document.getElementById("game-container");
    const steeringWheel = document.getElementById("steering-wheel");
    const speedDisplay = document.getElementById("speed-display");
    const scoreDisplay = document.getElementById("score-display"); // Agregar referencia
    const roadCanvas = document.getElementById("roadCanvas");
    const ctx = roadCanvas.getContext("2d");
    const instructions = document.getElementById("instructions");

    // --- Game Constants & Variables ---
    const updateIntervalMs = 16;
    const maxSteeringAngle = 60;
    const steeringSensitivity = 0.5;
    const roadWidth = 2000;
    const segmentLength = 100;
    const rumbleLength = 3;
    const drawDistance = 100;
    const fieldOfView = 100;
    const cameraHeight = 1000;
    let cameraDepth = 0;
    const lanes = 3;

    // Colors
    const COLORS = {
        SKY: "#3a4a5a",
        TREE: "#005108",
        FOG: "#0a192f",
        LIGHT: { road: "#6B6B6B", grass: "#10AA10", rumble: "#555555", lane: "#CCCCCC" },
        DARK: { road: "#696969", grass: "#009A00", rumble: "#BBBBBB" },
        START: { road: "#FFFFFF", grass: "#FFFFFF", rumble: "#FFFFFF" },
        FINISH: { road: "#000000", grass: "#000000", rumble: "#000000" }
    };

    // Steering & Position
    let isDraggingWheel = false;
    let dragStartX = 0;
    let currentWheelAngle = 0;
    let steeringInput = 0;
    let playerX = 0;
    let position = 0;
    let speed = 0;
    const maxSpeed = (segmentLength / (updateIntervalMs / 1000)) * 0.4; // solo 40%
    const accel = maxSpeed / 2;
    const breaking = -maxSpeed;
    const decel = -maxSpeed / 5;
    const centrifugal = 0.35;
    const offRoadDecel = -maxSpeed / 2;
    const offRoadLimitFactor = 0.4;

    // Road Geometry
    let roadSegments = [];
    let trackLength = 0;

    let gameActive = false;
    let finished = false; // Track if finish line crossed

    // Variables para el juego de adelantamiento
    let score = 0;
    let obstacles = [];
    const lanePositions = [-0.45, 0, 0.45]; // Valores anteriores: [-0.7, 0, 0.7]

    // --- Utility Functions ---
    function easeIn(a, b, percent) { return a + (b - a) * Math.pow(percent, 2); }
    function easeOut(a, b, percent) { return a + (b - a) * (1 - Math.pow(1 - percent, 2)); }
    function easeInOut(a, b, percent) { return a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5); }
    function accelerate(v, accel, dt) { return v + (accel * dt); }
    function limit(value, min, max) { return Math.max(min, Math.min(value, max)); }
    function percentRemaining(n, total) { return (n % total) / total; }
    function project(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
        p.camera.x = (p.world.x || 0) - cameraX;
        p.camera.y = (p.world.y || 0) - cameraY;
        p.camera.z = (p.world.z || 0) - cameraZ;
        if (p.camera.z <= 0) p.camera.z = 1;
        p.screen.scale = cameraDepth / p.camera.z;
        p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
        p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
        p.screen.w = Math.round((p.screen.scale * roadWidth * width / 2));
    }

    // --- Road Generation ---
    function buildRoad() {
        roadSegments = [];
        // Generar carretera recta larga
        addStraight(500);
        trackLength = roadSegments.length * segmentLength;
        console.log("Track Length:", trackLength);
        
        // Generar obstáculos iniciales
        generateObstacles();
    }

    function addSegment(curve, y = 0) { // Allow setting y for hills later
        const index = roadSegments.length;
        const z = index * segmentLength;
        roadSegments.push({
            index: index,
            p1: { world: { z: z, y: getLastY() }, camera: {}, screen: {} },
            p2: { world: { z: z + segmentLength, y: y }, camera: {}, screen: {} },
            curve: curve,
            color: Math.floor(index / rumbleLength) % 2 ? COLORS.LIGHT : COLORS.DARK
        });
    }

    function getLastY() {
        return roadSegments.length === 0 ? 0 : roadSegments[roadSegments.length - 1].p2.world.y;
    }

    function addRoad(enter, hold, leave, curve) {
        for (let n = 0; n < enter; n++) addSegment(easeIn(0, curve, n / enter));
        for (let n = 0; n < hold; n++) addSegment(curve);
        for (let n = 0; n < leave; n++) addSegment(easeInOut(curve, 0, n / leave));
    }

    function addStraight(num) { addRoad(num, num, num, 0); }
    function addCurve(num, curve) { addRoad(num, num, num, curve); }

    function addFinishLineSegments(num) {
        for (let n = 0; n < num; n++) {
            addSegment(0); // Add straight segments
            roadSegments[roadSegments.length - 1].color = COLORS.FINISH; // Set color
            roadSegments[roadSegments.length - 1].finish = true; // Mark as finish
        }
    }

    // --- Road Drawing ---
    function drawRoad() {
        const baseSegment = findSegment(position);
        const basePercent = percentRemaining(position, segmentLength);
        const width = roadCanvas.width;
        const height = roadCanvas.height;
        let playerSegment = findSegment(position + cameraHeight);
        let playerPercent = percentRemaining(position + cameraHeight, segmentLength);
        let playerY = interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);
        let dx = -(baseSegment.curve * basePercent);
        let x = 0;

        ctx.clearRect(0, 0, width, height);

        let maxy = height;
        let n, segment;

        for (n = 0; n < drawDistance; n++) {
            segment = roadSegments[(baseSegment.index + n) % roadSegments.length];
            segment.looped = segment.index < baseSegment.index;
            segment.fog = exponentialFog(n / drawDistance, 4);

            project(segment.p1, (playerX * roadWidth) - x, playerY + cameraHeight, position - (segment.looped ? trackLength : 0), cameraDepth, width, height, roadWidth);
            project(segment.p2, (playerX * roadWidth) - x - dx, playerY + cameraHeight, position - (segment.looped ? trackLength : 0), cameraDepth, width, height, roadWidth);

            x += dx;
            dx += segment.curve;

            if ((segment.p1.camera.z <= cameraDepth) || (segment.p2.screen.y >= maxy) || (segment.p2.screen.y >= segment.p1.screen.y)) {
                continue;
            }

            drawSegment(ctx, width, lanes, segment.p1, segment.p2, segment.color, segment.fog);
            maxy = segment.p1.screen.y;
        }

        // TODO: Draw sprites (trees, billboards etc.)
    }

    function findSegment(z) {
        const index = Math.floor(z / segmentLength) % roadSegments.length;
        return roadSegments[index >= 0 ? index : index + roadSegments.length];
    }

    function interpolate(a, b, percent) {
        return a + (b - a) * percent;
    }

    function exponentialFog(distance, density) {
        return 1 / (Math.pow(Math.E, (distance * distance * density)));
    }

    function drawSegment(ctx, width, lanes, p1, p2, color, fog) {
        const x1 = p1.screen.x, y1 = p1.screen.y, w1 = p1.screen.w;
        const x2 = p2.screen.x, y2 = p2.screen.y, w2 = p2.screen.w;
        const rumbleWidth1 = w1 / Math.max(6, 2 * lanes);
        const rumbleWidth2 = w2 / Math.max(6, 2 * lanes);
        const laneMarkerWidth1 = w1 / Math.max(32, 8 * lanes);
        const laneMarkerWidth2 = w2 / Math.max(32, 8 * lanes);

        ctx.fillStyle = color.grass;
        ctx.fillRect(0, y2, width, y1 - y2);

        polygon(ctx, x1 - w1 - rumbleWidth1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - rumbleWidth2, y2, color.rumble);
        polygon(ctx, x1 + w1 + rumbleWidth1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + rumbleWidth2, y2, color.rumble);
        polygon(ctx, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, color.road);

        if (color.lane) {
            let lanex1 = x1 - w1 + rumbleWidth1;
            let lanex2 = x2 - w2 + rumbleWidth2;
            for (let lane = 1; lane < lanes; lane++) {
                lanex1 += w1 * 2 / lanes;
                lanex2 += w2 * 2 / lanes;
                polygon(ctx, lanex1 - laneMarkerWidth1 / 2, y1, lanex1 + laneMarkerWidth1 / 2, y1, lanex2 + laneMarkerWidth2 / 2, y2, lanex2 - laneMarkerWidth2 / 2, y2, color.lane);
            }
        }

        if (fog < 1) {
            ctx.fillStyle = COLORS.FOG;
            ctx.globalAlpha = 1 - fog;
            ctx.fillRect(0, y2, width, y1 - y2);
            ctx.globalAlpha = 1;
        }
    }

    function polygon(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.lineTo(x4, y4);
        ctx.closePath();
        ctx.fill();
    }

    // --- Steering Wheel Controls ---
    function handleWheelMouseDown(event) {
        if (!gameActive || event.button !== 0) return;
        isDraggingWheel = true;
        dragStartX = event.clientX;
        steeringWheel.style.cursor = "grabbing";
        event.preventDefault();
        document.addEventListener("mousemove", handleWheelMouseMove);
        document.addEventListener("mouseup", handleWheelMouseUp);
    }

    function handleWheelMouseMove(event) {
        if (!isDraggingWheel) return;
        const currentX = event.clientX;
        const deltaX = currentX - dragStartX;
        let targetAngle = deltaX * steeringSensitivity;
        currentWheelAngle = limit(targetAngle, -maxSteeringAngle, maxSteeringAngle);
        steeringWheel.style.transform = `rotate(${currentWheelAngle}deg)`;
        steeringInput = currentWheelAngle / maxSteeringAngle;
    }

    function handleWheelMouseUp(event) {
        if (event.button !== 0 || !isDraggingWheel) return;
        isDraggingWheel = false;
        steeringWheel.style.cursor = "grab";
        document.removeEventListener("mousemove", handleWheelMouseMove);
        document.removeEventListener("mouseup", handleWheelMouseUp);
        smoothReturnToCenter();
    }

    let returnInterval = null;
    function smoothReturnToCenter() {
        if (returnInterval) clearInterval(returnInterval);
        returnInterval = setInterval(() => {
            if (!isDraggingWheel && Math.abs(currentWheelAngle) < 1) {
                currentWheelAngle = 0;
                steeringInput = 0;
                steeringWheel.style.transform = `rotate(0deg)`;
                clearInterval(returnInterval);
                returnInterval = null;
            } else if (!isDraggingWheel) {
                currentWheelAngle *= 0.8;
                steeringInput = currentWheelAngle / maxSteeringAngle;
                steeringWheel.style.transform = `rotate(${currentWheelAngle}deg)`;
            } else {
                clearInterval(returnInterval);
                returnInterval = null;
            }
        }, 16);
    }

    // --- Game Loop ---
    function updateGame(dt) {
        if (!gameActive) return;

        // Velocidad constante
        speed = maxSpeed * 0.8;
        position += speed * dt;
        
        // Determinar si estamos cerca del lateral
        const atLeftEdge = playerX <= -0.95;
        const atRightEdge = playerX >= 0.95;
        
        // Si estamos en un borde, limitar la dirección del volante
        if (atLeftEdge && steeringInput < 0) {
            // No permitir girar más a la izquierda si ya estamos en el borde izquierdo
            steeringInput = 0;
            instructions.textContent = "¡Borde izquierdo! No puedes girar más hacia la izquierda";
        } 
        else if (atRightEdge && steeringInput > 0) {
            // No permitir girar más a la derecha si ya estamos en el borde derecho
            steeringInput = 0;
            instructions.textContent = "¡Borde derecho! No puedes girar más hacia la derecha";
        }
        else {
            // En otros casos, mostrar instrucciones normales
            instructions.textContent = "Mueve el volante para cambiar de carril y esquivar coches";
        }
        
        // Control de volante para cambio de carril - LIMITADA por bordes
        playerX += steeringInput * dt * 3;
        playerX = limit(playerX, -0.99, 0.99); // Limitamos pero no exactamente al -1/1 para evitar problemas
        
        // Determinar carril actual
        const playerLaneIndex = playerX < -0.25 ? 0 : (playerX > 0.25 ? 2 : 1);
        
        // Mejorar las instrucciones en pantalla cuando un coche esté cerca
        let nearbyObstacle = obstacles.find(o => 
            !o.passed && 
            o.z - position > 0 && 
            o.z - position < segmentLength * 5 && 
            o.lane === playerLaneIndex
        );
        
        if (nearbyObstacle) {
            instructions.textContent = "¡CUIDADO! Gira el volante para cambiar de carril y esquivar";
        }
        
        // Comprobar colisiones y adelantamientos
        obstacles.forEach(obstacle => {
            const distance = obstacle.z - position;
            
            if (distance >= 0 && distance < segmentLength * 2) {
                // Colisión: mismo carril y cerca
                if (!obstacle.passed && playerLaneIndex === obstacle.lane && distance < segmentLength * 0.8) {
                    instructions.textContent = "¡Has chocado! Reiniciando...";
                    gameContainer.classList.add("shake");
                    setTimeout(() => gameContainer.classList.remove("shake"), 300);
                    
                    position = 0;
                    playerX = 0;
                    score = 0;
                    scoreDisplay.textContent = "Score: " + score;
                    generateObstacles();
                    return;
                }
                
                // Adelantamiento exitoso
                if (!obstacle.passed && distance < segmentLength * 0.5) {
                    obstacle.passed = true;
                    score += 50;
                    scoreDisplay.textContent = "Score: " + score;
                    
                    if (score >= 1000) {
                        gameActive = false;
                        instructions.textContent = "¡Has ganado! 1000 puntos alcanzados";
                        const victoryPanel = document.getElementById("victory-panel");
                        const victoryMessage = document.getElementById("victory-message");
                        if (victoryPanel && victoryMessage) {
                            victoryMessage.innerHTML = "<h2>¡Victoria!</h2><p>Has alcanzado 1000 puntos adelantando coches con éxito. Eres un conductor experto.</p>";
                            victoryPanel.classList.remove("hidden");
                        }
                    }
                }
            }
        });
        
        // Regenerar obstáculos de forma más espaciada y solo cuando sea necesario
        if (obstacles.filter(o => !o.passed).length < 2) {
            // Si quedan menos de 2 obstáculos por pasar, añadir uno nuevo
            const furthestZ = Math.max(
                position + segmentLength * 15, // Mínimo 15 segmentos por delante 
                ...obstacles.map(o => o.z)
            );
            
            obstacles.push({
                lane: Math.floor(Math.random() * 3),
                z: furthestZ + segmentLength * 10, // 10 segmentos más allá del último
                passed: false,
                color: ["#cc0000", "#00aa00", "#0000cc"][Math.floor(Math.random() * 3)]
            });
            
            console.log("Añadido nuevo obstáculo a: ", furthestZ + segmentLength * 10);
        }
        
        // Eliminar obstáculos muy lejanos ya pasados para optimizar
        obstacles = obstacles.filter(o => 
            !o.passed || // mantener los no pasados
            (o.passed && o.z > position - segmentLength * 50) // o los pasados recientemente
        );
        
        // Limpiar canvas y dibujar
        ctx.clearRect(0, 0, roadCanvas.width, roadCanvas.height);
        drawRoad();
        drawObstacles();
        
        // Actualizar velocímetro
        const displaySpeed = Math.round((speed / maxSpeed) * 200);
        speedDisplay.textContent = `${displaySpeed} km/h`;
    }

    // --- Game State ---
    let lastTimestamp = null;
    let animationFrameId = null;
    function frame(timestamp) {
        if (!gameActive) return;
        if (!lastTimestamp) lastTimestamp = timestamp;
        const dt = Math.min(1, (timestamp - lastTimestamp) / 1000);

        updateGame(dt);

        lastTimestamp = timestamp;
        animationFrameId = requestAnimationFrame(frame);
    }

    function startGame() {
        if (gameActive) return;
        console.log("Starting game...");

        // Configuración del canvas
        roadCanvas.width = gameContainer.offsetWidth;
        roadCanvas.height = gameContainer.offsetHeight * 0.65;
        cameraDepth = 1 / Math.tan((fieldOfView / 2) * Math.PI / 180);

        // Construir carretera y obstáculos
        buildRoad();
        generateObstacles();

        // Resetear variables
        currentWheelAngle = 0;
        steeringInput = 0;
        steeringWheel.style.transform = `rotate(0deg)`;
        position = 0;
        speed = 0;
        playerX = 0;
        score = 0;
        
        // Actualizar UI
        scoreDisplay.textContent = "Score: 0";
        instructions.textContent = "Adelanta coches cambiando de carril sin chocar";
        gameContainer.classList.remove("shake");

        // Iniciar animación
        gameActive = true;
        lastTimestamp = null;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(frame);
    }

    function stopGame() {
        console.log("Stopping game loop.");
        gameActive = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        // TODO: Show game over screen or results
        instructions.textContent = "Juego Terminado. (Refresca para reiniciar)";
    }

    // --- Event Listeners ---
    steeringWheel.addEventListener("mousedown", handleWheelMouseDown);
    steeringWheel.addEventListener("contextmenu", (e) => e.preventDefault());

    // --- Initial Setup ---
    startGame();

    // Añadir event listener para el botón de cierre del panel de victoria
    const closeButton = document.getElementById("close-victory-panel");
    if (closeButton) {
        closeButton.addEventListener("click", () => {
            const victoryPanel = document.getElementById("victory-panel");
            if (victoryPanel) {
                victoryPanel.classList.add("hidden");
                startGame();
            }
        });
    }

    // Función para generar coches a adelantar - REDUCIDA A SOLO 2 COCHES Y MÁS ESPACIADOS
    function generateObstacles() {
        obstacles = [];
        
        // Crear solo 2 coches iniciales, con mucho espacio entre ellos
        for (let i = 0; i < 2; i++) {
            // Primer coche a 15 segmentos, luego cada 30 segmentos
            const z = segmentLength * 15 + (i * segmentLength * 30);
            obstacles.push({
                lane: Math.floor(Math.random() * 3), // 0, 1, o 2
                z: z,
                passed: false,
                color: ["#cc0000", "#00aa00", "#0000cc"][Math.floor(Math.random() * 3)],
                timeToReact: 1.5 // Tiempo en segundos para reaccionar
            });
        }
    }

    // Dibujar los obstáculos (coches) - MEJORAR VISUALIZACIÓN
    function drawObstacles() {
        obstacles.forEach(obstacle => {
            // Saltar si está muy lejos o ya pasado
            if (obstacle.z < position || obstacle.z > position + (segmentLength * drawDistance)) 
                return;
            
            // Encontrar el segmento correcto
            const segmentIndex = Math.floor(obstacle.z / segmentLength) % roadSegments.length;
            const segment = roadSegments[segmentIndex];
            
            // Calcular posición en el carril (izquierda, centro, derecha)
            // Posiciones más centradas para los carriles laterales
            const laneX = obstacle.lane === 0 ? -0.45 : (obstacle.lane === 1 ? 0 : 0.45);
            
            // Proyectar la posición al espacio de la pantalla
            const worldX = laneX * roadWidth;
            const worldZ = obstacle.z - position;
            
            // Solo dibujar si está adelante y visible
            if (worldZ <= 0) return;
            
            const scale = cameraDepth / worldZ;
            const screenX = Math.round((roadCanvas.width / 2) + (scale * worldX * roadCanvas.width / 2));
            const screenY = Math.round((roadCanvas.height / 2) - (scale * 500 * roadCanvas.height / 2));
            
            // Dibujar coche como un polígono con forma de coche
            const carWidth = Math.max(20, 80 * scale);
            const carHeight = Math.max(30, 120 * scale);
            
            // Fondo del coche
            ctx.fillStyle = obstacle.color;
            ctx.fillRect(screenX - carWidth/2, screenY - carHeight, carWidth, carHeight);
            
            // Contorno para mejor visibilidad
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2 * scale;
            ctx.strokeRect(screenX - carWidth/2, screenY - carHeight, carWidth, carHeight);
            
            // Detalles del coche (ventanas)
            ctx.fillStyle = "#333333";
            ctx.fillRect(screenX - carWidth*0.4, screenY - carHeight*0.8, carWidth*0.8, carHeight*0.3);
            
            // Indicador de carril (texto L, C, R)
            ctx.fillStyle = "#ffffff";
            ctx.font = `bold ${Math.max(12, 24 * scale)}px Arial`;
            ctx.textAlign = "center";
            ctx.fillText(
                obstacle.lane === 0 ? "I" : (obstacle.lane === 1 ? "C" : "D"), 
                screenX, 
                screenY - carHeight/2
            );

            // Mejora visual: línea direccional para mostrar cómo esquivarlos
            if (worldZ > 0 && worldZ < segmentLength * 5) {
                // Dibujar una línea desde la posición del jugador hacia los carriles libres
                const playerLaneIndex = playerX < -0.33 ? 0 : (playerX > 0.33 ? 2 : 1);
                if (obstacle.lane === playerLaneIndex) {
                    // Si estamos en el mismo carril que el obstáculo, mostrar alternativas
                    const availableLanes = [0, 1, 2].filter(lane => lane !== obstacle.lane);
                    
                    // Dibujar flechas hacia los carriles disponibles
                    ctx.strokeStyle = "#ffff00"; // Amarillo brillante
                    ctx.lineWidth = 5;
                    
                    availableLanes.forEach(lane => {
                        const laneX = lane === 0 ? -0.6 : (lane === 1 ? 0 : 0.6);
                        const targetScreenX = Math.round((roadCanvas.width / 2) + (scale * laneX * roadWidth * 0.8));
                        
                        // Flecha direccional
                        ctx.beginPath();
                        ctx.moveTo(roadCanvas.width / 2, roadCanvas.height - 30);
                        ctx.lineTo(targetScreenX, screenY);
                        ctx.stroke();
                        
                        // Círculo para marcar el carril objetivo
                        ctx.fillStyle = "#ffff00";
                        ctx.beginPath();
                        ctx.arc(targetScreenX, screenY - carHeight/2, 15 * scale, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }
            }
        });
    }
});

