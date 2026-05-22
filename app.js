import { CubicSpline, calculateDragForce, getInitialPresets } from './math.js?v=3';
import { WindTunnel } from './windtunnel.js?v=3';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load initial physics data presets
    const preset = getInitialPresets();
    const distances = [...preset.distances];
    const dragCoefficients = [...preset.dragCoefficients];

    let spline = new CubicSpline(distances, dragCoefficients);
    let chartInstance = null;
    let windTunnelInstance = null;

    // 2. DOM Elements cache
    const tableBody = document.querySelector('#data-table tbody');
    const distSlider = document.getElementById('distance-slider');
    const distSliderDisplay = document.getElementById('distance-slider-display');
    
    // Physics inputs
    const windSpeedInput = document.getElementById('wind-speed');
    const windSpeedVal = document.getElementById('wind-speed-val');
    const airDensityInput = document.getElementById('air-density');
    const airDensityVal = document.getElementById('air-density-val');
    const frontalAreaInput = document.getElementById('frontal-area');
    const frontalAreaVal = document.getElementById('frontal-area-val');
    const toggleLeadInput = document.getElementById('toggle-lead-car');
    
    // HUD elements
    const hudDistance = document.getElementById('hud-distance');
    const hudCd = document.getElementById('hud-cd');
    const hudDragForce = document.getElementById('hud-drag-force');
    const hudTurbulence = document.getElementById('hud-turbulence');
    const efficiencyGauge = document.getElementById('efficiency-gauge');
    const efficiencyPercent = document.getElementById('efficiency-percent');
    
    // Drag & Drop
    const viewportContainer = document.getElementById('viewport-container');
    const dropOverlay = document.getElementById('drop-overlay');
    
    // Camera controls
    const camButtons = {
        orbit: document.getElementById('btn-cam-orbit'),
        side: document.getElementById('btn-cam-side'),
        top: document.getElementById('btn-cam-top'),
        chase: document.getElementById('btn-cam-chase')
    };

    // 3. Initialize Wind Tunnel 3D Canvas
    try {
        windTunnelInstance = new WindTunnel('canvas-container');
        // Set initial state
        windTunnelInstance.setDistance(parseFloat(distSlider.value));
        windTunnelInstance.setWindSpeed(parseFloat(windSpeedInput.value));
        windTunnelInstance.setLeadCarActive(toggleLeadInput.checked);
    } catch (e) {
        console.error("Three.js Wind Tunnel failed to initialize:", e);
    }

    // 4. Build Editable Data Table
    function initTable() {
        tableBody.innerHTML = '';
        distances.forEach((dist, idx) => {
            const row = document.createElement('tr');
            
            const distCell = document.createElement('td');
            distCell.textContent = `${dist}m`;
            distCell.style.fontFamily = "'JetBrains Mono', monospace";
            row.appendChild(distCell);
            
            const cdCell = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'table-input';
            input.min = '0.1';
            input.max = '2.5';
            input.step = '0.01';
            input.value = dragCoefficients[idx].toFixed(2);
            input.dataset.index = idx;
            
            input.addEventListener('change', (e) => {
                const val = parseFloat(e.target.value);
                const index = parseInt(e.target.dataset.index);
                if (!isNaN(val) && val >= 0.1 && val <= 2.5) {
                    dragCoefficients[index] = val;
                    // Recalculate spline
                    spline = new CubicSpline(distances, dragCoefficients);
                    // Update chart and telemetry
                    updateChart();
                    updateTelemetry();
                } else {
                    // Revert invalid value
                    e.target.value = dragCoefficients[index].toFixed(2);
                }
            });
            
            cdCell.appendChild(input);
            row.appendChild(cdCell);
            tableBody.appendChild(row);
        });
    }

    // 5. Initialize Chart.js Line Plot
    function initChart() {
        const ctx = document.getElementById('aerodynamics-chart').getContext('2d');
        
        // Generate smooth curve points using spline
        const curvePoints = [];
        for (let d = 0; d <= 20; d += 0.2) {
            curvePoints.push({ x: d, y: spline.interpolate(d) });
        }

        // Clean air baseline (value at 20m)
        const cleanAirCd = dragCoefficients[dragCoefficients.length - 1];

        // Format raw points
        const rawPoints = distances.map((d, i) => ({ x: d, y: dragCoefficients[i] }));

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Spline Interpolation (Cd)',
                        data: curvePoints,
                        borderColor: '#00f2fe',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0,
                        tension: 0.1
                    },
                    {
                        label: 'Experimental Measurements',
                        data: rawPoints,
                        backgroundColor: '#a0aec0',
                        borderColor: '#1f2833',
                        borderWidth: 1,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        showLine: false
                    },
                    {
                        label: 'Active Tracking Point',
                        data: [{ x: parseFloat(distSlider.value), y: spline.interpolate(parseFloat(distSlider.value)) }],
                        backgroundColor: '#ff007f',
                        borderColor: '#ffffff',
                        borderWidth: 2,
                        pointRadius: 7,
                        pointHoverRadius: 9,
                        showLine: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        min: 0,
                        max: 20,
                        title: {
                            display: true,
                            text: 'Distance between Cars (meters)',
                            color: '#a0aec0',
                            font: { family: 'Outfit', size: 11 }
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#a0aec0', font: { family: 'JetBrains Mono' } }
                    },
                    y: {
                        min: 0.3,
                        max: 1.5,
                        title: {
                            display: true,
                            text: 'Drag Coefficient (Cd)',
                            color: '#a0aec0',
                            font: { family: 'Outfit', size: 11 }
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#a0aec0', font: { family: 'JetBrains Mono' } }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#c5c6c7',
                            font: { family: 'Outfit', size: 10 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw.y.toFixed(3)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Update chart data after table changes or active tracker moves
    function updateChart() {
        if (!chartInstance) return;

        // Generate smooth curve points
        const curvePoints = [];
        for (let d = 0; d <= 20; d += 0.2) {
            curvePoints.push({ x: d, y: spline.interpolate(d) });
        }
        chartInstance.data.datasets[0].data = curvePoints;

        // Update raw points
        chartInstance.data.datasets[1].data = distances.map((d, i) => ({ x: d, y: dragCoefficients[i] }));

        // Update tracker point
        const activeDist = parseFloat(distSlider.value);
        let activeCd = spline.interpolate(activeDist);
        
        // If lead car is disabled, Cd is constant clean air value
        if (!toggleLeadInput.checked) {
            activeCd = dragCoefficients[dragCoefficients.length - 1];
        }
        chartInstance.data.datasets[2].data = [{ x: activeDist, y: activeCd }];

        // Update chart smoothly ('none' stops redraw transition animation lags)
        chartInstance.update('none');
    }

    // 6. Update HUD readings and gauge details
    function updateTelemetry() {
        const dist = parseFloat(distSlider.value);
        const leadActive = toggleLeadInput.checked;
        
        // 1. Get Drag Coefficient (Cd)
        let activeCd = spline.interpolate(dist);
        // Clean air Cd baseline (the value at 20m)
        const cleanAirCd = dragCoefficients[dragCoefficients.length - 1];
        
        if (!leadActive) {
            activeCd = cleanAirCd; // Solo car experiences full ambient clean air drag
        }

        // 2. Get Physics environment parameters
        const windSpeed = parseFloat(windSpeedInput.value);
        const airDensity = parseFloat(airDensityInput.value);
        const area = parseFloat(frontalAreaInput.value);
        
        // 3. Calculate Drag Force (Fd)
        const dragForce = calculateDragForce(airDensity, windSpeed, activeCd, area);
        
        // 4. Calculate Slipstream Drag Savings (%)
        let savings = 0;
        if (leadActive) {
            savings = Math.max(0, Math.round((1.0 - activeCd / cleanAirCd) * 100));
        }

        // 5. Update HUD UI readouts
        hudDistance.textContent = `${dist.toFixed(2)} m`;
        hudCd.textContent = activeCd.toFixed(3);
        hudDragForce.textContent = `${dragForce.toFixed(1)} N`;

        // 6. Update Turbulence warning levels
        if (!leadActive) {
            hudTurbulence.textContent = "NONE (CLEAN AIR)";
            hudTurbulence.style.color = "var(--neon-cyan)";
        } else {
            if (dist <= 3.0) {
                hudTurbulence.textContent = "CRITICAL (WAKE FLOW)";
                hudTurbulence.style.color = "var(--neon-pink)";
            } else if (dist <= 7.0) {
                hudTurbulence.textContent = "HIGH (TURBULENT)";
                hudTurbulence.style.color = "#ffaa00";
            } else if (dist <= 12.0) {
                hudTurbulence.textContent = "MODERATE (SLIPSTREAM)";
                hudTurbulence.style.color = "#ffdd00";
            } else if (dist <= 17.0) {
                hudTurbulence.textContent = "LOW (DISSIPATING)";
                hudTurbulence.style.color = "#a3ff00";
            } else {
                hudTurbulence.textContent = "NEGLIGIBLE (CLEAN FLOW)";
                hudTurbulence.style.color = "var(--neon-cyan)";
            }
        }

        // 7. Update circular gauge
        efficiencyPercent.textContent = `${savings}%`;
        const circumference = 314.16; // 2 * PI * r (r=50)
        const offset = circumference - (savings / 100) * circumference;
        efficiencyGauge.style.strokeDashoffset = offset;
        
        // Gauge color matches savings intensity (cyan for high savings, pink/red for low)
        if (savings > 20) {
            efficiencyGauge.style.stroke = "var(--neon-cyan)";
            efficiencyGauge.style.filter = "drop-shadow(0 0 5px var(--neon-cyan))";
        } else {
            efficiencyGauge.style.stroke = "var(--neon-pink)";
            efficiencyGauge.style.filter = "drop-shadow(0 0 5px var(--neon-pink))";
        }

        // 8. Update Three.js positions
        if (windTunnelInstance) {
            windTunnelInstance.setDistance(dist);
        }
    }

    // 7. Bind Interactive Sliders & Inputs

    // Distance Slider
    distSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        distSliderDisplay.textContent = `${val.toFixed(2)} m`;
        updateTelemetry();
        updateChart();
    });

    // Wind Speed
    windSpeedInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        windSpeedVal.textContent = `${val} km/h`;
        if (windTunnelInstance) {
            windTunnelInstance.setWindSpeed(val);
        }
        updateTelemetry();
    });

    // Air Density
    airDensityInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        airDensityVal.textContent = `${val.toFixed(3)} kg/m³`;
        updateTelemetry();
    });

    // Frontal Area
    frontalAreaInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        frontalAreaVal.textContent = `${val.toFixed(2)} m²`;
        updateTelemetry();
    });

    // Toggle Lead Car
    toggleLeadInput.addEventListener('change', (e) => {
        const active = e.target.checked;
        if (windTunnelInstance) {
            windTunnelInstance.setLeadCarActive(active);
        }
        updateTelemetry();
        updateChart();
    });

    // Camera preset clicks
    Object.keys(camButtons).forEach(preset => {
        camButtons[preset].addEventListener('click', () => {
            // Toggle active classes
            Object.values(camButtons).forEach(btn => btn.classList.remove('active'));
            camButtons[preset].classList.add('active');
            
            if (windTunnelInstance) {
                windTunnelInstance.setCameraPreset(preset);
            }
        });
    });

    // 8. Drag and Drop 3D File Loading Handler
    
    // Stop default behaviors to allow file drops
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        viewportContainer.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        viewportContainer.addEventListener(eventName, () => {
            viewportContainer.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        viewportContainer.addEventListener(eventName, () => {
            viewportContainer.classList.remove('drag-over');
        }, false);
    });

    viewportContainer.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            const file = files[0];
            const extension = file.name.split('.').pop().toLowerCase();
            
            if (extension === 'gltf' || extension === 'glb') {
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    const arrayBuffer = event.target.result;
                    if (windTunnelInstance) {
                        windTunnelInstance.setCustomModel(arrayBuffer);
                        addResetModelButton(); // display reset options
                    }
                };
                
                reader.readAsArrayBuffer(file);
            } else {
                alert("Please drop a valid .gltf or .glb 3D file.");
            }
        }
    });

    // Adds a visual "Reset to default F1 model" button in HUD when a custom file is loaded
    function addResetModelButton() {
        // Prevent duplicate buttons
        if (document.getElementById('btn-reset-model')) return;

        const hudContainer = document.querySelector('.top-left-hud');
        const resetBtn = document.createElement('button');
        resetBtn.id = 'btn-reset-model';
        resetBtn.textContent = 'RESET TO DEFAULT CAR';
        resetBtn.style.marginTop = '8px';
        resetBtn.style.width = '100%';
        resetBtn.className = 'hud-btn';
        resetBtn.style.borderColor = 'var(--neon-pink)';
        resetBtn.style.color = 'var(--neon-pink)';
        
        resetBtn.addEventListener('click', () => {
            if (windTunnelInstance) {
                windTunnelInstance.clearCustomModel();
            }
            resetBtn.remove();
        });
        
        hudContainer.appendChild(resetBtn);
    }

    // 9. Initial setup execution
    initTable();
    initChart();
    updateTelemetry();
});
