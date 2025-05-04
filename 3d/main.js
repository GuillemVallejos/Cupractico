import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Scene & Camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(4, 5, 11);

// Controls - configuración básica y funcional para rotar y hacer zoom
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false; // Solo rotar y zoom
controls.enableRotate = true;
controls.enableZoom = true;
controls.minDistance = 2;
controls.maxDistance = 50;
controls.minPolarAngle = 0.1;
controls.maxPolarAngle = Math.PI / 2;
controls.target.set(0, 0.5, 0); // Centra la cámara en el coche
controls.update();

// Agregamos eventos de logging para debug
controls.addEventListener('change', () => {
    console.log('Controls changed', camera.position);
});

// Debug - verifica si estamos capturando eventos
renderer.domElement.addEventListener('pointerdown', () => {
    console.log('Pointer down detected');
});

// Listeners para interacción
document.addEventListener('mousedown', () => {
    document.body.style.cursor = 'grabbing'; // Cambiar cursor al hacer clic
});

document.addEventListener('mouseup', () => {
    document.body.style.cursor = 'grab'; // Restaurar cursor al soltar
});

document.body.style.cursor = 'grab'; // Cursor por defecto

// Ground (más claro para contraste)
const groundGeometry = new THREE.PlaneGeometry(40, 40);
groundGeometry.rotateX(-Math.PI / 2);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.receiveShadow = true;
scene.add(groundMesh);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffffff, 1.2, 100, Math.PI / 5, 0.3);
spotLight.position.set(5, 15, 10);
spotLight.castShadow = true;
scene.add(spotLight);

// Opcional: helpers para depuración de luces
// import { SpotLightHelper } from 'three/addons/helpers/SpotLightHelper.js';
// const spotHelper = new SpotLightHelper(spotLight);
// scene.add(spotHelper);

// Progress UI
let modelsLoaded = 0;
const totalModels = 2;
function updateProgress() {
	if (++modelsLoaded === totalModels) {
		const progress = document.getElementById('progress-container');
		if (progress) progress.style.display = 'none';
	}
}

// Hotspot management
const hotspots = [];
const hotspotContainer = document.getElementById('hotspot-container');
let activeContent = null;
let carModel = null;

// Function to create a hotspot with predefined text
function createHotspot(position, label, description, redirectUrl, redirectText) {
    // Create 3D position for the hotspot
    const position3D = new THREE.Vector3(position.x, position.y, position.z);
    
    // Create the hotspot element
    const hotspotElement = document.createElement('div');
    hotspotElement.className = 'hotspot';
    hotspotElement.innerHTML = '+';
    hotspotElement.setAttribute('aria-label', label);
    hotspotContainer.appendChild(hotspotElement);
    
    // Create content element
    const contentElement = document.createElement('div');
    contentElement.className = 'hotspot-content';
    
    // Add close button
    const closeButton = document.createElement('span');
    closeButton.className = 'close-btn';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        contentElement.style.display = 'none';
        activeContent = null;
    });
    contentElement.appendChild(closeButton);
    
    // Add title
    const titleElement = document.createElement('h3');
    titleElement.textContent = label;
    contentElement.appendChild(titleElement);
    
    // Add description paragraph instead of textarea
    const descriptionElement = document.createElement('p');
    descriptionElement.textContent = description;
    descriptionElement.className = 'hotspot-description';
    contentElement.appendChild(descriptionElement);
    
    // Add redirect button instead of save button
    const redirectButton = document.createElement('button');
    redirectButton.textContent = redirectText || 'Ver más detalles';
    redirectButton.className = 'redirect-button';
    redirectButton.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = redirectUrl;
    });
    contentElement.appendChild(redirectButton);
    
    hotspotContainer.appendChild(contentElement);
    
    // Add click event to hotspot
    hotspotElement.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Close any open content
        if (activeContent && activeContent !== contentElement) {
            activeContent.style.display = 'none';
        }
        
        // Toggle content visibility
        if (contentElement.style.display === 'block') {
            contentElement.style.display = 'none';
            activeContent = null;
        } else {
            // Calculate position - display beside the hotspot
            contentElement.style.left = (e.clientX + 15) + 'px';
            contentElement.style.top = (e.clientY - 20) + 'px';
            
            // Make sure the content stays within the window
            setTimeout(() => {
                const rect = contentElement.getBoundingClientRect();
                if (rect.right > window.innerWidth) {
                    contentElement.style.left = (e.clientX - rect.width - 15) + 'px';
                }
                if (rect.bottom > window.innerHeight) {
                    contentElement.style.top = (e.clientY - rect.height - 15) + 'px';
                }
            }, 0);
            
            contentElement.style.display = 'block';
            activeContent = contentElement;
        }
    });
    
    // Store hotspot data
    hotspots.push({
        position3D,
        element: hotspotElement,
        contentElement
    });
}

// Function to update hotspot positions on screen
function updateHotspotsPositions() {
    hotspots.forEach(hotspot => {
        // Convert 3D position to screen position
        const position = hotspot.position3D.clone();
        position.project(camera);
        
        // Check if the position is in front of the camera
        if (position.z < 1) {
            // Convert to screen coordinates
            const x = (position.x * 0.5 + 0.5) * window.innerWidth;
            const y = (- position.y * 0.5 + 0.5) * window.innerHeight;
            
            hotspot.element.style.left = `${x}px`;
            hotspot.element.style.top = `${y}px`;
            hotspot.element.style.display = 'flex';
        } else {
            // Hide if behind the camera
            hotspot.element.style.display = 'none';
        }
    });
}

// Close content when clicking elsewhere
document.addEventListener('click', (e) => {
    if (activeContent && !e.target.closest('.hotspot-content') && !e.target.closest('.hotspot')) {
        activeContent.style.display = 'none';
        activeContent = null;
    }
});

const specTexts = {
	motor: `Ficha Técnica: Sistema de Propulsión
  Versión estándar: Motor eléctrico trasero con 210 kW (286 CV)
  Versión VZ: Doble motor con tracción total (4WD) y 250 kW (340 CV)
  Batería de 77 kWh de capacidad
  Aceleración 0-100 km/h: 6,8s (estándar) / 5,6s (VZ)
  Autonomía: Hasta 569 km (estándar) / 521 km (VZ)
  Consumo energético: 15,6 kWh/100 km (WLTP)`,
  
	llantaYAmortiguador: `Ficha Técnica: Suspensión y Dinámica
  Llantas deportivas de aleación de hasta 21 pulgadas
  Sistema de suspensión adaptativa DCC (Dynamic Chassis Control)
  Amortiguación variable electrónicamente para máximo confort o deportividad
  Modos de conducción seleccionables: Comfort, Performance, CUPRA y personalizable
  Altura optimizada para equilibrio entre aerodinámica y comportamiento dinámico`,
  
	frenos: `Ficha Técnica: Sistema de Frenado
  Discos de freno ventilados de alto rendimiento
  Sistema de recuperación de energía en frenada con múltiples niveles de intensidad
  Freno de estacionamiento eléctrico con función Auto-Hold
  Sistema antibloqueo ABS con distribución electrónica de frenada (EBD)
  Asistente de frenada de emergencia`,
  
	maletero: `Ficha Técnica: Capacidad y Versatilidad
  Capacidad de 540 litros con asientos traseros en posición normal
  Sistema de apertura eléctrica con función manos libres
  Bandejas organizadoras y puntos de anclaje flexibles
  Espacio adicional para almacenamiento de cables de carga
  Asientos traseros abatibles para ampliar capacidad de carga`,
  
	interior: `El Tavascan cuenta con volante multifunción de cuero con levas, cuadro digital de 5,3″ y pantalla táctil de 15″ con conectividad y navegación; consola ergonómica en “Y” de materiales sostenibles; audio inmersivo 3D Sennheiser; y asistentes semiautónomos (Travel Assist, park assists, alerta de ángulo muerto y tráfico cruzado).` 
  };
  
  // Ejemplo de uso:
  // console.log(specTexts.motor);
  // document.getElementById('motorSection').textContent = specTexts.motor;
  


// Load Car Model
const carLoader = new GLTFLoader();
carLoader.load(
	'public/cupra/scene.gltf',
	(gltf) => {
		const car = gltf.scene;
		car.traverse(child => {
			if (child.isMesh) {
				child.castShadow = true;
				child.receiveShadow = true;
				if (child.material) {
					child.material.metalness = 0.4;
					child.material.roughness = 0.6;
				}
			}
		});
		car.position.set(0, 0.15, 0);
		car.scale.set(1.2, 1.2, 1.2);
		scene.add(car);
        
        carModel = car;

		// Create hotspots at specific positions with predefined text
        // Hood hotspot
        createHotspot(
            {x: 0, y: 1.25, z: 2}, 
            "Motor eléctrico", 
            specTexts.motor
            // This hotspot doesn't have a link button
        );
        
        // Door hotspot - Link to CONDUCCION
        createHotspot(
            {x: 1.0, y: 1.0, z: 0}, 
            "Diseño interior", 
            specTexts.interior,
            "CONDUCCION/index.html",
            "Explorar interior"
        );
        
        // Front wheel hotspot - Link to FRENADA EXACTA
        createHotspot(
            {x: 1.0, y: 0.5, z: 1.5}, 
            "Llantas de aleación", 
            specTexts.llantaYAmortiguador,
            "FRENADA EXACTA/index.html",
            "Probar sistema de frenado"
        );
        
        // Modified: Trunk hotspot - aligned with the center at the rear of the car
        createHotspot(
            {x: 0, y: 1.25, z: -2.5}, 
            "Maletero", 
            specTexts.maletero,
            "maletero.html",
            "Ver opciones de almacenamiento"
        );
        
        // Rear wheel hotspot - Link to CUPRA JUMP
        createHotspot(
            {x: 1.0, y: 0.5, z: -1.5}, 
            "Sistema de suspensión", 
            specTexts.llantaYAmortiguador,
            "CUPRA JUMP/index.html",
            "Probar suspensión"
        );
        
        // Charging port hotspot
        createHotspot(
            {x: -1.0, y: 1.5, z: -1.5}, 
            "Puerto de carga", 
            "El puerto de carga rápida permite recuperar hasta el 80% de la batería en solo 30 minutos utilizando un cargador de 125 kW. La batería de 77 kWh proporciona una autonomía de hasta 450 km según el ciclo WLTP.",
            "battery/index.html",
            "Jugar simulador de carga"
        );
        
        // Exhaust pipe area hotspot (actually showing electric drivetrain info since it's an EV)
        createHotspot(
            {x: 0, y: 0.5, z: -2.5}, 
            "Sistema de propulsión", 
            "El CUPRA Tavascan, siendo 100% eléctrico, elimina el sistema de escape tradicional. En su lugar, cuenta con un sofisticado sistema de refrigeración para la batería y los componentes eléctricos, optimizando el rendimiento y la eficiencia.",
            "drivetrain-details.html",
            "Ver detalles técnicos"
        );

		// Asegura que el target esté en el centro del coche y actualiza controles
		controls.target.copy(car.position);
		controls.update();

		updateProgress();
	},
	undefined,
	(error) => { console.error('Error loading car model:', error); }
);

// Load Road Model
const roadLoader = new GLTFLoader();
roadLoader.load(
	'public/carretera/carretera.gltf',
	(gltf) => {
		const road = gltf.scene;
		road.traverse(child => {
			if (child.isMesh) {
				child.castShadow = true;
				child.receiveShadow = true;
				// Mejora materiales para visibilidad
				if (child.material) {
					child.material.metalness = 0.2;
					child.material.roughness = 0.8;
				}
			}
		});
		road.position.set(0, 0, 0);
		road.scale.set(0.13, 0.13, 0.13); // Ajusta escala para que sea visible
		scene.add(road);
		updateProgress();
	},
	undefined,
	(error) => { console.error('Error loading road model:', error); }
);

// Responsive resize
window.addEventListener('resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});

// Ajustar la cámara a una buena posición inicial
camera.position.set(6, 3, 8);
controls.update();

// Aseguramos que el loop de animación siempre llama a controls.update()
function animate() {
    requestAnimationFrame(animate);
    
    // Esta línea es crucial para que OrbitControls funcione con damping
    controls.update();
    
    // Update hotspots positions
    updateHotspotsPositions();
    
    renderer.render(scene, camera);
}
animate();

// Help Button and Home Button Functionality
document.addEventListener('DOMContentLoaded', () => {
    const helpButton = document.getElementById('help-button');
    const helpModal = document.getElementById('help-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const homeButton = document.getElementById('home-button');
    
    // Home button functionality
    homeButton.addEventListener('click', () => {
        window.location.href = '../index.html';
    });
    
    // Open modal when help button is clicked
    helpButton.addEventListener('click', () => {
        helpModal.style.display = 'block';
        modalBackdrop.style.display = 'block';
    });
    
    // Close modal when X is clicked
    closeModal.addEventListener('click', () => {
        helpModal.style.display = 'none';
        modalBackdrop.style.display = 'none';
    });
    
    // Close modal when clicking outside
    modalBackdrop.addEventListener('click', () => {
        helpModal.style.display = 'none';
        modalBackdrop.style.display = 'none';
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && helpModal.style.display === 'block') {
            helpModal.style.display = 'none';
            modalBackdrop.style.display = 'none';
        }
    });
});