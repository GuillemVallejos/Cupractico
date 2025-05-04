// Main JavaScript file for 3D scene setup and interaction using Babylon.js

// Global variables
let engine, scene, camera;
let car, road;
let infoDots = [];
let loadingElement;
let isLoaded = false;

// DOM elements
const canvas = document.getElementById('renderCanvas');
const container = document.getElementById('container');
const infoPanel = document.getElementById('info-panel');
const infoTitle = document.getElementById('info-title');
const infoDescription = document.getElementById('info-description');
const closeInfoButton = document.getElementById('close-info');

// Initialize the Babylon engine
function initEngine() {
    loadingElement = document.getElementById('loading');
    
    // Create engine
    engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    
    // Create scene
    createScene();
    
    // Run render loop
    engine.runRenderLoop(() => {
        scene.render();
        
        // Update info points after the scene is fully loaded
        if (isLoaded) {
            updateInfoPointsPosition();
        }
    });
    
    // Handle browser resize
    window.addEventListener('resize', () => {
        engine.resize();
    });
    
    // Handle close button click
    closeInfoButton.addEventListener('click', closeInfoPanel);
}

// Create Babylon scene
function createScene() {
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    
    // Create camera
    camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3, 10, 
        new BABYLON.Vector3(0, 0, 0), scene);
    camera.attachControl(canvas, true);
    camera.minZ = 0.1;
    camera.maxZ = 1000;
    camera.lowerRadiusLimit = 3;
    camera.upperRadiusLimit = 20;
    camera.upperBetaLimit = Math.PI / 2; // Limit vertical rotation
    
    // Setup lighting
    setupLighting();
    
    // Load models
    loadModels();
    
    // Add action manager for click events
    scene.onPointerDown = function(evt, pickResult) {
        if (evt.button === 0) { // Left click
            if (pickResult.hit && pickResult.pickedMesh) {
                // Check if it's the car
                if (car && pickResult.pickedMesh.parent === car) {
                    handleCarClick(pickResult);
                }
            }
        }
    };
}

// Set up scene lighting
function setupLighting() {
    // Ambient light
    const ambientLight = new BABYLON.HemisphericLight("ambientLight", 
        new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.4;
    
    // Directional light (sun)
    const dirLight = new BABYLON.DirectionalLight("dirLight", 
        new BABYLON.Vector3(-1, -3, -2), scene);
    dirLight.intensity = 0.8;
    dirLight.position = new BABYLON.Vector3(5, 10, 5);
    
    // Enable shadows
    const shadowGenerator = new BABYLON.ShadowGenerator(2048, dirLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurScale = 2;
    shadowGenerator.setDarkness(0.2);
    
    // Store shadowGenerator for adding meshes later
    scene.shadowGenerator = shadowGenerator;
}

// Create a simple car model as fallback
function createDefaultCarModel() {
    const carRoot = new BABYLON.TransformNode("carRoot", scene);
    
    // Car body - customize dimensions and colors here
    const body = BABYLON.MeshBuilder.CreateBox("carBody", {
        width: 4,  // Change width
        height: 1, // Change height
        depth: 2.5 // Change depth
    }, scene);
    body.position.y = 0.5;
    body.material = new BABYLON.StandardMaterial("bodyMat", scene);
    body.material.diffuseColor = new BABYLON.Color3(0.8, 0.1, 0.1); // Make it red
    body.receiveShadows = true;
    body.parent = carRoot;
    
    // Car roof
    const roof = BABYLON.MeshBuilder.CreateBox("carRoof", {
        width: 2,
        height: 0.7,
        depth: 1.8
    }, scene);
    roof.position.y = 1.35;
    roof.position.x = -0.3;
    roof.material = new BABYLON.StandardMaterial("roofMat", scene);
    roof.material.diffuseColor = new BABYLON.Color3(0.20, 0.28, 0.37); // 34495e
    roof.parent = carRoot;
    
    // Wheels
    const wheelMat = new BABYLON.StandardMaterial("wheelMat", scene);
    wheelMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    
    // Front-left wheel
    const wheel1 = BABYLON.MeshBuilder.CreateCylinder("wheel1", {
        height: 0.2,
        diameter: 0.8
    }, scene);
    wheel1.rotation.z = Math.PI / 2;
    wheel1.position = new BABYLON.Vector3(1.3, 0.4, 1);
    wheel1.material = wheelMat;
    wheel1.parent = carRoot;
    
    // Front-right wheel
    const wheel2 = BABYLON.MeshBuilder.CreateCylinder("wheel2", {
        height: 0.2,
        diameter: 0.8
    }, scene);
    wheel2.rotation.z = Math.PI / 2;
    wheel2.position = new BABYLON.Vector3(1.3, 0.4, -1);
    wheel2.material = wheelMat;
    wheel2.parent = carRoot;
    
    // Rear-left wheel
    const wheel3 = BABYLON.MeshBuilder.CreateCylinder("wheel3", {
        height: 0.2,
        diameter: 0.8
    }, scene);
    wheel3.rotation.z = Math.PI / 2;
    wheel3.position = new BABYLON.Vector3(-1.3, 0.4, 1);
    wheel3.material = wheelMat;
    wheel3.parent = carRoot;
    
    // Rear-right wheel
    const wheel4 = BABYLON.MeshBuilder.CreateCylinder("wheel4", {
        height: 0.2,
        diameter: 0.8
    }, scene);
    wheel4.rotation.z = Math.PI / 2;
    wheel4.position = new BABYLON.Vector3(-1.3, 0.4, -1);
    wheel4.material = wheelMat;
    wheel4.parent = carRoot;
    
    // Headlights
    const headlightMat = new BABYLON.StandardMaterial("headlightMat", scene);
    headlightMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    headlightMat.emissiveColor = new BABYLON.Color3(1, 1, 0.8);
    
    // Left headlight
    const headlight1 = BABYLON.MeshBuilder.CreateDisc("headlight1", {
        radius: 0.2
    }, scene);
    headlight1.position = new BABYLON.Vector3(2, 0.7, 0.7);
    headlight1.rotation.y = Math.PI / 2;
    headlight1.material = headlightMat;
    headlight1.parent = carRoot;
    
    // Right headlight
    const headlight2 = BABYLON.MeshBuilder.CreateDisc("headlight2", {
        radius: 0.2
    }, scene);
    headlight2.position = new BABYLON.Vector3(2, 0.7, -0.7);
    headlight2.rotation.y = Math.PI / 2;
    headlight2.material = headlightMat;
    headlight2.parent = carRoot;
    
    // Add car meshes to shadow generator
    if (scene.shadowGenerator) {
        scene.shadowGenerator.addShadowCaster(body);
        scene.shadowGenerator.addShadowCaster(roof);
        scene.shadowGenerator.addShadowCaster(wheel1);
        scene.shadowGenerator.addShadowCaster(wheel2);
        scene.shadowGenerator.addShadowCaster(wheel3);
        scene.shadowGenerator.addShadowCaster(wheel4);
    }
    
    return carRoot;
}

// Create a simple ground model as fallback
function createDefaultGroundModel() {
    const ground = BABYLON.MeshBuilder.CreateGround("ground", {
        width: 50,
        height: 50
    }, scene);
    ground.position.y = -0.5;
    
    const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.33, 0.33, 0.33);
    ground.material = groundMat;
    ground.receiveShadows = true;
    
    return ground;
}

// Monitoreo de carga para archivos GLTF
BABYLON.SceneLoader.OnPluginActivatedObservable.add(function(loader) {
    if (loader.name === "gltf") {
        loader.onParsedObservable.add(function(data) {
            console.log("GLTF contenido parseado:", data);
        });
        
        loader.onExtensionLoadedObservable.add(function(extension) {
            console.log("GLTF extensión cargada:", extension);
        });
    }
});

// Load 3D models
function loadModels() {
    let modelLoadCount = 0;
    const totalModels = 2; // car and road
    rueba cargado correctamente");sh("", "./models/", "scene.gltf", scene, function(meshes) {
    // Function to check if all models are loadedtu archivo scene.gltf
    const checkLoading = () => {= new BABYLON.TransformNode("carRoot", scene);
        modelLoadCount++;modelo
        if (modelLoadCount >= totalModels) {sh("", "./", "scene.gltf", scene, function(meshes) {eshes
            hideLoadingScreen();
            isLoaded = true;sformNode("carRoot", scene);ne") {
            addInfoPoints();.parent = car;
        }
    };
    
    // Load car model - change "scene.gltf" to your preferred model file from external URL   mesh.parent = car;   scene.shadowGenerator.addShadowCaster(mesh);
    BABYLON.SceneLoader.ImportMesh("", "./", "scene.gltf", scene, function(meshes) {    }
        console.log("Modelo cargado correctamente. Número de mallas:", meshes.length);dow generator
        console.log("Nombres de las mallas:", meshes.map(m => m.name));nceof BABYLON.AbstractMesh) {
        ddShadowCaster(mesh);tractMesh) {
        if (meshes.length > 0) {   }   mesh.receiveShadows = true;
            car = new BABYLON.TransformNode("carRoot", scene);          }
                     // Enable shadows }
            // Adjust the imported meshes            if (mesh instanceof BABYLON.AbstractMesh) {});
            meshes.forEach(mesh => {
                if (mesh.name !== "Scene") {
                    mesh.parent = car;        }car.position = new BABYLON.Vector3(0, 0, 0);
                    
                    // Add to shadow generatorkLoading();
                    if (scene.shadowGenerator && mesh instanceof BABYLON.AbstractMesh) {.01);
                        scene.shadowGenerator.addShadowCaster(mesh);.Vector3(0, 0, 0);car model properly");
                    }l();
                           checkLoading();   checkLoading();
                    // Enable shadows
                    if (mesh instanceof BABYLON.AbstractMesh) {perly");
                        mesh.receiveShadows = true;Model();ar model:', message);
                    }ading();aultCarModel();
                }     } checkLoading();
            });    }, null, function(scene, message) {});
            ror('Error loading car model:', message);
            car.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
            car.position = new BABYLON.Vector3(0, 0, 0);, "./", "carretera_def.gltf", scene, function(meshes) {
            
            checkLoading();= new BABYLON.TransformNode("roadRoot", scene);
        } else {
            console.error("Failed to load car model properly");
            car = createDefaultCarModel(); "carretera_def.gltf", scene, function(meshes) {
            checkLoading();
        }ew BABYLON.TransformNode("roadRoot", scene);mesh.parent = road;
    }, function(event) {
        // Progreso de carga
        console.log("Progreso de carga:", event.loaded, "/", event.total);
    }, function(scene, message, exception) {esh.name !== "Scene") {   mesh.receiveShadows = true;
        console.error('Error cargando modelo:', message);   mesh.parent = road;   }
        if (exception) {      }
            console.error('Excepción:', exception);        // Enable shadows});
        }
        car = createDefaultCarModel();
        checkLoading();        }road.position = new BABYLON.Vector3(0, -0.5, 0);
    });
    Loading();
    // Load road model
    BABYLON.SceneLoader.ImportMesh("", "./", "carretera_def.gltf", scene, function(meshes) {(0.005, 0.005, 0.005); model properly");
        if (meshes.length > 0) { new BABYLON.Vector3(0, -0.5, 0);faultGroundModel();
            road = new BABYLON.TransformNode("roadRoot", scene);      checkLoading();
            
            // Adjust the imported meshes
            meshes.forEach(mesh => {road model properly");model:', message);
                if (mesh.name !== "Scene") {teDefaultGroundModel();faultGroundModel();
                    mesh.parent = road;     checkLoading(); checkLoading();
                           }   });
                    // Enable shadows    }, null, function(scene, message) {}
                    if (mesh instanceof BABYLON.AbstractMesh) {'Error loading road model:', message);
                        mesh.receiveShadows = true;oundModel();
                    }
                }
            });
            tyle.display = 'none';
            road.scaling = new BABYLON.Vector3(0.005, 0.005, 0.005);/ Hide loading screen   }, 500);
            road.position = new BABYLON.Vector3(0, -0.5, 0);function hideLoadingScreen() {}
            
            checkLoading();o the car
        } else {= 'none';
            console.error("Failed to load road model properly");
            road = createDefaultGroundModel();
            checkLoading();nt.body.removeChild(dot);
        }nfo points to the car
    }, null, function(scene, message) {function addInfoPoints() {    infoDots = [];
        console.error('Error loading road model:', message);
        road = createDefaultGroundModel();dot => {points if the car was loaded
        checkLoading();        document.body.removeChild(dot);    if (!car) return;
    });
}

// Hide loading screenr was loadedement('div');
function hideLoadingScreen() {
    loadingElement.style.opacity = 0;
    setTimeout(() => {reate HTML elements for each info pointdocument.body.appendChild(dot);
        loadingElement.style.display = 'none';
    }, 500);iv');
}nt';ck', () => {
.dataset.index = index; showInfoPanel(index);
// Add clickable info points to the cardocument.body.appendChild(dot);});
function addInfoPoints() {
    // Clear any existing info points // Add click event to each info point infoDots.push(dot);
    infoDots.forEach(dot => {        dot.addEventListener('click', () => {    });
        document.body.removeChild(dot);
    });
    infoDots = [];          updateInfoPointsPosition();
        infoDots.push(dot);}
    // Only add info points if the car was loaded
    if (!car) return;

    // Create HTML elements for each info point    updateInfoPointsPosition();    if (!car || !scene.activeCamera) return;
    infoPoints.forEach((point, index) => {
        const dot = document.createElement('div');
        dot.className = 'info-point';osition
        dot.dataset.index = index;ion() {new BABYLON.Vector3(
        document.body.appendChild(dot);amera) return;
        
        // Add click event to each info pointints.forEach((point, index) => {  point.position.z
        dot.addEventListener('click', () => {// Create a vector in world space);
            showInfoPanel(index);.Vector3(
        });
        
        infoDots.push(dot);    point.position.zconst transformedPosition = BABYLON.Vector3.TransformCoordinates(worldPosition, transformMatrix);
    });

    // Update info points positioncal spaceABYLON.Vector3.Project(
    updateInfoPointsPosition();tWorldMatrix();
}YLON.Vector3.TransformCoordinates(worldPosition, transformMatrix);

// Update position of info points based on car's position coordinatestoGlobal(
function updateInfoPointsPosition() {ector3.Project(
    if (!car || !scene.activeCamera) return;ransformedPosition,   engine.getRenderHeight()
  BABYLON.Matrix.Identity(),  )
    infoPoints.forEach((point, index) => {    scene.getTransformMatrix(),);
        // Create a vector in world space.viewport.toGlobal(
        const worldPosition = new BABYLON.Vector3(h(),
            point.position.x, 
            point.position.y, 
            point.position.z);dot.style.top = screenPosition.y + 'px';
        );
        camera)
        // Transform to car's local space
        const transformMatrix = car.getWorldMatrix();e.left = screenPosition.x + 'px';style.display = 'none';
        const transformedPosition = BABYLON.Vector3.TransformCoordinates(worldPosition, transformMatrix); + 'px';
          dot.style.display = 'block';
        // Project 3D position to screen coordinates // Check if point is visible (in front of camera) }
        const screenPosition = BABYLON.Vector3.Project(       if (transformedPosition.z < 0) {   });
            transformedPosition,            dot.style.display = 'none';}
            BABYLON.Matrix.Identity(),
            scene.getTransformMatrix(),k';
            scene.activeCamera.viewport.toGlobal(t) {
                engine.getRenderWidth(),});if (!car) return;
                engine.getRenderHeight()
            )
        );andle car clickconst clickPoint = pickResult.pickedPoint;
        
        // Update dot positionpoint to the click
        const dot = infoDots[index];
        dot.style.left = screenPosition.x + 'px';// Get the click position in 3D spacelet closestDistance = Infinity;
        dot.style.top = screenPosition.y + 'px';int;
        
        // Check if point is visible (in front of camera)
        if (transformedPosition.z < 0) {ABYLON.Vector3(
            dot.style.display = 'none';nity;
        } else {
            dot.style.display = 'block';ints.forEach((point, index) => {  point.position.z
        }// Create a vector in world space);
    });.Vector3(
}

// Handle car click    point.position.zconst infoPoint = BABYLON.Vector3.TransformCoordinates(worldPosition, transformMatrix);
function handleCarClick(pickResult) {
    if (!car) return;
    Distance(clickPoint, infoPoint);
    // Get the click position in 3D spaceWorldMatrix(); {
    const clickPoint = pickResult.pickedPoint;.Vector3.TransformCoordinates(worldPosition, transformMatrix);tance;
      closestIndex = index;
    // Find the closest info point to the click // Calculate distance }
    let closestIndex = 0;    const distance = BABYLON.Vector3.Distance(clickPoint, infoPoint);});
    let closestDistance = Infinity;
    distance;ed reasonably close to a point
    infoPoints.forEach((point, index) => {
        // Create a vector in world space   }   showInfoPanel(closestIndex);
        const worldPosition = new BABYLON.Vector3(   });   }
            point.position.x,     }
            point.position.y, nt
            point.position.zata for the selected point
        );
        
        // Transform to car's local space
        const transformMatrix = car.getWorldMatrix();
        const infoPoint = BABYLON.Vector3.TransformCoordinates(worldPosition, transformMatrix);/ Show information panel with data for the selected point   infoPanel.classList.remove('hidden');
        function showInfoPanel(index) {}
        // Calculate distancendex];
        const distance = BABYLON.Vector3.Distance(clickPoint, infoPoint); point.title;nel
        if (distance < closestDistance) {t.description;
            closestDistance = distance;   infoPanel.classList.remove('hidden');   infoPanel.classList.add('hidden');
            closestIndex = index;}}
        }
    });
    function closeInfoPanel() {window.addEventListener('DOMContentLoaded', initEngine);























window.addEventListener('DOMContentLoaded', initEngine);// Initialize the application}    infoPanel.classList.add('hidden');function closeInfoPanel() {// Close the information panel}    infoPanel.classList.remove('hidden');    infoDescription.textContent = point.description;    infoTitle.textContent = point.title;    const point = infoPoints[index];function showInfoPanel(index) {// Show information panel with data for the selected point}    }        showInfoPanel(closestIndex);    if (closestDistance < 2) {    // Only show info if clicked reasonably close to a point




window.addEventListener('DOMContentLoaded', initEngine);// Initialize the application}    infoPanel.classList.add('hidden');