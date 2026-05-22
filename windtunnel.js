import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';

export class WindTunnel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with ID ${containerId} not found.`);
        }

        // Configuration
        this.tunnelLength = 35;
        this.tunnelWidth = 10;
        this.tunnelHeight = 6;
        this.particleCount = 1500;
        this.windSpeedKmh = 150;
        this.leadCarActive = true;
        this.trailDistance = 10; // active spacing in meters
        
        // Model storage
        this.customModelData = null; // Stored GLTF/GLB ArrayBuffer
        this.leadCar = null;
        this.trailCar = null;

        // Initialize Three.js components
        this.initScene();
        this.initTunnelEnvironment();
        this.initCars();
        this.initParticleFlow();
        
        // Start animation loop
        this.clock = new THREE.Clock();
        this.animate();

        // Handle window resizing
        window.addEventListener('resize', () => this.onWindowResize());
    }

    initScene() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x05060a);
        this.scene.fog = new THREE.FogExp2(0x05060a, 0.025);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        this.camera.position.set(12, 5, 12);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // don't go below floor
        this.controls.minDistance = 3;
        this.controls.maxDistance = 45;
        this.controls.target.set(0, 0.5, -2);

        // Lights
        const ambientLight = new THREE.AmbientLight(0x0f172a, 1.5);
        this.scene.add(ambientLight);

        // Top main light
        const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 25;
        const d = 10;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        this.scene.add(dirLight);

        // Colored point lights are omitted so the viewport does not show red/blue marker spots.
    }

    initTunnelEnvironment() {
        // Floor grid
        const gridHelper = new THREE.GridHelper(50, 50, 0x00f2fe, 0x1f2833);
        gridHelper.position.y = 0;
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);

        // Add wind tunnel enclosure outline (bounding wireframe)
        const tunnelGeom = new THREE.BoxGeometry(this.tunnelWidth, this.tunnelHeight, this.tunnelLength);
        const tunnelEdges = new THREE.EdgesGeometry(tunnelGeom);
        const tunnelLine = new THREE.LineSegments(
            tunnelEdges, 
            new THREE.LineBasicMaterial({ color: 0x1f2833, transparent: true, opacity: 0.4 })
        );
        tunnelLine.position.set(0, this.tunnelHeight / 2, 0);
        this.scene.add(tunnelLine);

        // Dark reflective floor plane
        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x0b0c10,
            roughness: 0.4,
            metalness: 0.8
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    initCars() {
        this.carContainer = new THREE.Group();
        this.scene.add(this.carContainer);

        this.rebuildCars();
    }

    rebuildCars() {
        // Clear previous meshes
        if (this.leadCar) this.carContainer.remove(this.leadCar);
        if (this.trailCar) this.carContainer.remove(this.trailCar);

        if (this.customModelData) {
            // Load custom models
            this.loadCustomGLTF();
        } else {
            // Load the default model base_basic_shaded.glb from local path
            this.loadDefaultModel('./base_basic_shaded.glb');
        }
    }

    loadDefaultModel(url) {
        const loader = new GLTFLoader();
        const indicator = document.getElementById('loader-indicator');
        if (indicator) {
            indicator.style.display = 'flex';
            indicator.querySelector('span').textContent = 'Loading F1 Model (base_basic_shaded.glb)...';
        }

        loader.load(
            url,
            (gltf) => {
                if (indicator) indicator.style.display = 'none';
                
                const loadedModel = gltf.scene;

                // Auto-center and normalize size
                const box = new THREE.Box3().setFromObject(loadedModel);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                // Scale model to be approx 4 units long (standard F1 size in our scene)
                const scaleFactor = 4.0 / size.z;
                loadedModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
                
                // Adjust position so origin is on floor and center is at (0, 0, 0)
                loadedModel.position.x = -center.x * scaleFactor;
                // Place bottom of model flat on floor
                loadedModel.position.y = -box.min.y * scaleFactor + 0.02; 
                loadedModel.position.z = -center.z * scaleFactor;

                // Create lead car group
                this.leadCar = new THREE.Group();
                const leadWrapper = loadedModel.clone();
                this.applyTechyMaterials(leadWrapper, true); // apply cyan theme
                this.leadCar.add(leadWrapper);
                this.leadCar.position.set(0, 0, 4);
                this.leadCar.visible = this.leadCarActive;
                this.carContainer.add(this.leadCar);

                // Create trailing car group
                this.trailCar = new THREE.Group();
                const trailWrapper = loadedModel.clone();
                this.applyTechyMaterials(trailWrapper, false); // apply pink theme
                this.trailCar.add(trailWrapper);
                this.carContainer.add(this.trailCar);

                this.updateTrailCarPosition();
                document.getElementById('hud-model-source').textContent = "MODEL: base_basic_shaded.glb";
            },
            (xhr) => {
                if (indicator && xhr.total) {
                    const pct = Math.round((xhr.loaded / xhr.total) * 100);
                    indicator.querySelector('span').textContent = `Loading F1 Model: ${pct}%`;
                }
            },
            (error) => {
                if (indicator) indicator.style.display = 'none';
                console.error("Default model loading failed:", error);
                // Fallback to procedural F1 if loading fails (e.g. offline/no server)
                this.createProceduralCars();
            }
        );
    }

    createProceduralCars() {
        if (this.leadCar) this.carContainer.remove(this.leadCar);
        if (this.trailCar) this.carContainer.remove(this.trailCar);

        this.leadCar = this.createProceduralF1(0x0e1726, 0x00f2fe);
        this.trailCar = this.createProceduralF1(0x1a0b16, 0xff007f);
        
        this.leadCar.position.set(0, 0, 4);
        this.leadCar.visible = this.leadCarActive;
        
        this.carContainer.add(this.leadCar);
        this.carContainer.add(this.trailCar);
        
        this.updateTrailCarPosition();
        document.getElementById('hud-model-source').textContent = "MODEL: PROCEDURAL F1 (FALLBACK)";
    }

    createProceduralF1(primaryColor, accentColor) {
        const car = new THREE.Group();

        // Materials
        const bodyMat = new THREE.MeshStandardMaterial({
            color: primaryColor,
            roughness: 0.15,
            metalness: 0.85
        });
        const blackMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.75
        });
        const neonMat = new THREE.MeshBasicMaterial({
            color: accentColor,
            toneMapped: false
        });

        // Main chassis
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 3.8), bodyMat);
        chassis.position.y = 0.225;
        chassis.castShadow = true;
        chassis.receiveShadow = true;
        car.add(chassis);

        // Nose cone
        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 1.4), bodyMat);
        nose.position.set(0, 0.18, 2.3);
        nose.castShadow = true;
        car.add(nose);

        // Cockpit scoop
        const scoop = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 4), bodyMat);
        scoop.rotation.x = Math.PI / 2;
        scoop.position.set(0, 0.45, 0.2);
        scoop.castShadow = true;
        car.add(scoop);
        
        const airIntake = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.4), blackMat);
        airIntake.position.set(0, 0.75, -0.1);
        car.add(airIntake);

        // Front Wing
        const frontWing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.5), bodyMat);
        frontWing.position.set(0, 0.1, 2.9);
        frontWing.castShadow = true;
        car.add(frontWing);
        
        const fEndplateL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.5), neonMat);
        fEndplateL.position.set(0.9, 0.18, 2.9);
        const fEndplateR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.5), neonMat);
        fEndplateR.position.set(-0.9, 0.18, 2.9);
        car.add(fEndplateL, fEndplateR);

        // Rear Wing supports
        const wingSupport = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), blackMat);
        wingSupport.position.set(0, 0.5, -1.6);
        wingSupport.castShadow = true;
        car.add(wingSupport);

        // Rear Wing
        const rearWing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.45), bodyMat);
        rearWing.position.set(0, 0.8, -1.7);
        rearWing.castShadow = true;
        car.add(rearWing);

        const rEndplateL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.55), neonMat);
        rEndplateL.position.set(0.8, 0.625, -1.7);
        const rEndplateR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.55), neonMat);
        rEndplateR.position.set(-0.8, 0.625, -1.7);
        car.add(rEndplateL, rEndplateR);

        // Side pods
        const podL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 1.6), bodyMat);
        podL.position.set(0.55, 0.225, 0);
        podL.castShadow = true;
        const podR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 1.6), bodyMat);
        podR.position.set(-0.55, 0.225, 0);
        podR.castShadow = true;
        car.add(podL, podR);

        // Wheels
        const wheelGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16);
        wheelGeom.rotateZ(Math.PI / 2);
        
        const wheelPositions = [
            [0.75, 0.22, 1.3],   // Front Right
            [-0.75, 0.22, 1.3],  // Front Left
            [0.8, 0.22, -1.1],   // Rear Right
            [-0.8, 0.22, -1.1]   // Rear Left
        ];

        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeom, blackMat);
            wheel.position.set(pos[0], pos[1], pos[2]);
            wheel.castShadow = true;
            car.add(wheel);
        });

        return car;
    }

    loadCustomGLTF() {
        const loader = new GLTFLoader();
        const indicator = document.getElementById('loader-indicator');
        if (indicator) indicator.style.display = 'flex';

        loader.parse(
            this.customModelData,
            '',
            (gltf) => {
                if (indicator) indicator.style.display = 'none';
                
                const loadedModel = gltf.scene;

                // Auto-center and normalize size
                const box = new THREE.Box3().setFromObject(loadedModel);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                // Scale model to be approx 4 units long (standard F1 size in our scene)
                const scaleFactor = 4.0 / size.z;
                loadedModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
                
                // Adjust position so origin is on floor and center is at (0, 0, 0)
                loadedModel.position.x = -center.x * scaleFactor;
                // Place bottom of model flat on floor
                loadedModel.position.y = -box.min.y * scaleFactor + 0.02; 
                loadedModel.position.z = -center.z * scaleFactor;

                // Create lead car group
                this.leadCar = new THREE.Group();
                const leadWrapper = loadedModel.clone();
                this.applyTechyMaterials(leadWrapper, true); // apply cyan theme
                this.leadCar.add(leadWrapper);
                this.leadCar.position.set(0, 0, 4);
                this.leadCar.visible = this.leadCarActive;
                this.carContainer.add(this.leadCar);

                // Create trailing car group
                this.trailCar = new THREE.Group();
                const trailWrapper = loadedModel.clone();
                this.applyTechyMaterials(trailWrapper, false); // apply pink theme
                this.trailCar.add(trailWrapper);
                this.carContainer.add(this.trailCar);

                this.updateTrailCarPosition();
                document.getElementById('hud-model-source').textContent = "MODEL: USER GLTF";
            },
            (error) => {
                if (indicator) indicator.style.display = 'none';
                console.error("GLTF Parsing error:", error);
                alert("Error parsing GLTF file. Falling back to default F1 car models.");
                this.customModelData = null;
                this.rebuildCars();
            }
        );
    }

    /**
     * Traverses custom GLTF models and overrides their materials with a highly visible slate-metal body
     * and a glowing holographic neon outline cage (cyan for lead, pink for trailing).
     */
    applyTechyMaterials(modelGroup, isLead) {
        const accentColor = isLead ? 0x00f2fe : 0xff007f;
        
        // Materials
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x3b4d61, // Sleek metallic slate blue (reflects wind tunnel lights and is highly visible)
            roughness: 0.15,
            metalness: 0.85
        });
        const rubberMat = new THREE.MeshStandardMaterial({
            color: 0x111111, // Matte dark rubber for tires
            roughness: 0.8,
            metalness: 0.05
        });
        const neonMat = new THREE.MeshBasicMaterial({
            color: accentColor,
            toneMapped: false
        });
        const wireframeMat = new THREE.MeshBasicMaterial({
            color: accentColor,
            wireframe: true,
            transparent: true,
            opacity: 0.15, // glowing holographic contours
            blending: THREE.AdditiveBlending
        });

        // Collect all meshes first to avoid mutating child structure while traversing
        const meshesToProcess = [];
        modelGroup.traverse((node) => {
            if (node.isMesh) {
                meshesToProcess.push(node);
            }
        });

        meshesToProcess.forEach((node) => {
            node.castShadow = true;
            node.receiveShadow = true;
            
            const nameLower = node.name.toLowerCase();
            
            if (nameLower.includes('wheel') || nameLower.includes('tire') || nameLower.includes('tyre')) {
                node.material = rubberMat;
            } else if (nameLower.includes('rim') || nameLower.includes('neon') || nameLower.includes('glow') || nameLower.includes('light')) {
                node.material = neonMat;
            } else {
                // Force the main body meshes to be slate-metallic instead of black
                node.material = bodyMat;
                
                // Add holographic outline cage to keep it visible and high-tech
                const outline = new THREE.Mesh(node.geometry.clone(), wireframeMat);
                outline.name = 'neon-outline';
                // Slightly scale up to avoid z-fighting
                outline.scale.set(1.001, 1.001, 1.001);
                node.add(outline);
            }
        });
    }

    setCustomModel(arrayBuffer) {
        this.customModelData = arrayBuffer;
        this.rebuildCars();
    }

    clearCustomModel() {
        this.customModelData = null;
        this.rebuildCars();
    }

    updateTrailCarPosition() {
        if (!this.trailCar) return;
        
        // Map distance slider (0m - 20m) to Three.js coordinates
        // At 0m, the nose of trailCar is at the tail of leadCar (Z = 2.0)
        // Since trailCar length is ~4.0 units, its nose is at Z = position.z + 2.0
        // Therefore: trailCar_nose = leadCar_tail - distance
        // leadCar_tail = 2.0 (since leadCar center is at Z=4.0 and tail is at Z=2.0)
        // Thus, trailCar_nose = 2.0 - distance
        // Since trailCar center is 2.0 units behind its nose, its center position.z is:
        // position.z = trailCar_nose - 2.0 = 2.0 - distance - 2.0 = -distance
        
        const zPos = -this.trailDistance;
        this.trailCar.position.set(0, 0, zPos);
    }

    setDistance(distance) {
        this.trailDistance = distance;
        this.updateTrailCarPosition();
    }

    setWindSpeed(speedKmh) {
        this.windSpeedKmh = speedKmh;
    }

    setLeadCarActive(active) {
        this.leadCarActive = active;
        if (this.leadCar) {
            this.leadCar.visible = active;
        }
    }

    initParticleFlow() {
        // Streamline Particle System
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        
        // Initial setup
        this.particlesData = [];
        const tunnelZStart = 17;
        const tunnelZEnd = -18;
        
        for (let i = 0; i < this.particleCount; i++) {
            // Uniformly space initial positions along the tunnel to prevent clustering at startup
            const z = THREE.MathUtils.randFloat(tunnelZEnd, tunnelZStart);
            const x = THREE.MathUtils.randFloat(-this.tunnelWidth / 2 + 0.5, this.tunnelWidth / 2 - 0.5);
            const y = THREE.MathUtils.randFloat(0.1, this.tunnelHeight - 0.5);
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Save state
            this.particlesData.push({
                xInit: x,
                yInit: y,
                speedMultiplier: THREE.MathUtils.randFloat(0.85, 1.15),
                phase: Math.random() * Math.PI * 2
            });

            // Initial color: Cyan
            colors[i * 3] = 0.0;
            colors[i * 3 + 1] = 0.95;
            colors[i * 3 + 2] = 1.0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Create a glow circular texture procedurally for particles
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.5, 'rgba(0,242,254,0.6)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 16, 16);
        const texture = new THREE.CanvasTexture(canvas);

        const material = new THREE.PointsMaterial({
            size: 0.18,
            map: texture,
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0.75
        });

        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
    }

    updateParticles(dt) {
        if (!this.particleSystem) return;

        const positions = this.particleSystem.geometry.attributes.position.array;
        const colors = this.particleSystem.geometry.attributes.color.array;
        
        // Base flow speed (Three.js units/second)
        // Map 150 km/h to approx 25 units/second
        const baseSpeed = (this.windSpeedKmh / 3.6) * 0.55; 
        
        const tunnelZStart = 17;
        const tunnelZEnd = -18;

        for (let i = 0; i < this.particleCount; i++) {
            let x = positions[i * 3];
            let y = positions[i * 3 + 1];
            let z = positions[i * 3 + 2];
            
            const pData = this.particlesData[i];
            
            // Calculate speed multiplier based on wake field
            let speedMultiplier = pData.speedMultiplier;
            let insideWake = false;
            let wakeIntensity = 0;
            
            // 1. Aerodynamic wake of Lead Car (if active)
            // Lead car center is at Z=4.0. Wake starts from tail (Z=2.0) downwards
            if (this.leadCarActive && z < 2.0 && z > -18) {
                // Wake boundaries: starts at width ~1.2, height ~0.8. Expands downstream.
                const distDownstream = 2.0 - z;
                
                // Wake width cone: width = W_0 + k_w * distance
                const wakeWidth = 1.1 + 0.08 * distDownstream;
                const wakeHeight = 0.7 + 0.06 * distDownstream;
                
                // Distance from centerline (x=0, y=0.45)
                const dx = x;
                const dy = y - 0.45;
                
                // Inside elliptical wake cylinder?
                const normalizedDist = (dx*dx) / (wakeWidth*wakeWidth) + (dy*dy) / (wakeHeight*wakeHeight);
                
                if (normalizedDist < 1.0) {
                    insideWake = true;
                    // Wake is strongest directly behind, decays downstream exponentially
                    wakeIntensity = (1.0 - Math.sqrt(normalizedDist)) * Math.exp(-0.06 * distDownstream);
                    
                    // Particle slows down in the low velocity wake zone
                    speedMultiplier *= (1.0 - 0.65 * wakeIntensity);
                    
                    // Particles bend inward slightly due to low pressure, and get turbulent
                    const angle = Math.atan2(dy, dx);
                    // Inward draw
                    const drawStrength = 0.08 * wakeIntensity;
                    x -= Math.cos(angle) * drawStrength * dt * baseSpeed;
                    
                    // Add turbulent jitter
                    const jitter = 0.12 * wakeIntensity;
                    x += THREE.MathUtils.randFloat(-jitter, jitter);
                    y += THREE.MathUtils.randFloat(-jitter, jitter);
                }
            }

            // 2. Obstacle Deflection (Physics collisions with F1 shape)
            // When approaching lead car (Z around 6.0 down to 2.0)
            if (this.leadCarActive && z > 1.8 && z < 6.2) {
                const dz = z - 4.0; // Distance to lead car center
                const dx = x;
                
                // Deflect air flow around the nose and body
                if (Math.abs(dx) < 1.1 && y < 1.0) {
                    const deflectX = Math.sign(dx) * 0.25 * (1.0 - Math.abs(dz)/2.2);
                    const deflectY = 0.18 * (1.0 - Math.abs(dz)/2.2);
                    
                    x += deflectX * dt * baseSpeed;
                    y += deflectY * dt * baseSpeed;
                }
            }
            
            // Approach trailing car (Z around zPos+2.2 down to zPos-2.2)
            const tz = -this.trailDistance; // Trailing car center
            if (z > tz - 2.2 && z < tz + 2.2) {
                const dz = z - tz;
                const dx = x;
                if (Math.abs(dx) < 1.1 && y < 1.0) {
                    const deflectX = Math.sign(dx) * 0.22 * (1.0 - Math.abs(dz)/2.2);
                    const deflectY = 0.15 * (1.0 - Math.abs(dz)/2.2);
                    
                    x += deflectX * dt * baseSpeed;
                    y += deflectY * dt * baseSpeed;
                }
            }

            // Move particle downstream (Z direction)
            z -= baseSpeed * speedMultiplier * dt;
            
            // Boundary constraints (bounce off tunnel walls/ceiling)
            if (y < 0.05) y = 0.05;
            if (y > this.tunnelHeight - 0.2) y = this.tunnelHeight - 0.2;
            if (x < -this.tunnelWidth / 2 + 0.2) x = -this.tunnelWidth / 2 + 0.2;
            if (x > this.tunnelWidth / 2 - 0.2) x = this.tunnelWidth / 2 - 0.2;

            // Recirculate particle once it leaves the tunnel
            if (z < tunnelZEnd) {
                z = tunnelZStart;
                x = pData.xInit; // reset to original grid
                y = pData.yInit;
                speedMultiplier = pData.speedMultiplier;
                insideWake = false;
                wakeIntensity = 0;
            }

            // Write positions back
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Dynamic color coding:
            // High velocity/Clean air = Cyan (#00f2fe)
            // Low velocity/Wake core = Magenta/Pink (#ff007f)
            // Medium/Transition = Indigo/Blue
            if (insideWake) {
                // Interpolate from Cyan (0.0, 0.95, 1.0) to Magenta (1.0, 0.0, 0.5)
                colors[i * 3] = wakeIntensity;
                colors[i * 3 + 1] = 0.95 * (1.0 - wakeIntensity);
                colors[i * 3 + 2] = 1.0 - 0.5 * wakeIntensity;
            } else {
                // Reset to default clean flow Cyan
                colors[i * 3] = 0.0;
                colors[i * 3 + 1] = 0.95;
                colors[i * 3 + 2] = 1.0;
            }
        }

        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        this.particleSystem.geometry.attributes.color.needsUpdate = true;
    }



    setCameraPreset(preset) {
        if (!this.controls) return;

        // Smoothly transition camera
        switch (preset) {
            case 'orbit':
                this.controls.autoRotate = false;
                this.camera.position.set(12, 5, 12);
                this.controls.target.set(0, 0.5, -2);
                break;
            case 'side':
                this.controls.autoRotate = false;
                this.camera.position.set(22, 1.2, -this.trailDistance / 2);
                this.controls.target.set(0, 0.5, -this.trailDistance / 2);
                break;
            case 'top':
                this.controls.autoRotate = false;
                this.camera.position.set(0, 24, -this.trailDistance / 2);
                this.controls.target.set(0, 0.5, -this.trailDistance / 2);
                break;
            case 'chase':
                this.controls.autoRotate = false;
                // Positioned slightly behind the trailing car, looking forward
                const chaseZ = -this.trailDistance - 7;
                this.camera.position.set(0, 1.8, chaseZ);
                this.controls.target.set(0, 0.5, 5);
                break;
        }
        this.controls.update();
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const dt = Math.min(this.clock.getDelta(), 0.1); // clamp delta time to avoid jumps
        
        // Update physics particles
        this.updateParticles(dt);

        // Required for OrbitControls damping
        this.controls.update();

        // Render
        this.renderer.render(this.scene, this.camera);
    }
}
