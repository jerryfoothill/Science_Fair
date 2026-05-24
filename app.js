import { CubicSpline, calculateDragForce, getInitialPresets } from './math.js?v=3';
import { WindTunnel } from './windtunnel.js?v=3';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load initial physics data presets
    const cdPreset = getInitialPresets();
    const distances = [...cdPreset.distances];
    const dragCoefficients = [...cdPreset.dragCoefficients];

    const experimentRows = [
        { distanceCm: 0, averageForce: 0.02, q1: 0.019, q3: 0.022 },
        { distanceCm: 2, averageForce: 0.017, q1: 0.016, q3: 0.017 },
        { distanceCm: 4, averageForce: 0.012, q1: 0.011, q3: 0.016 },
        { distanceCm: 6, averageForce: 0.014, q1: 0.0128, q3: 0.015 },
        { distanceCm: 8, averageForce: 0.023, q1: 0.022, q3: 0.024 },
        { distanceCm: 10, averageForce: 0.026, q1: 0.025, q3: 0.027 },
        { distanceCm: 12, averageForce: 0.016, q1: 0.013, q3: 0.0183 },
        { distanceCm: 14, averageForce: 0.015, q1: 0.013, q3: 0.016 },
        { distanceCm: 16, averageForce: 0.025, q1: 0.0235, q3: 0.026 },
        { distanceCm: 18, averageForce: 0.03, q1: 0.028, q3: 0.031 },
        { distanceCm: 20, averageForce: 0.016, q1: 0.015, q3: 0.017 }
    ];

    const plotConfigs = {
        force: {
            label: 'F阻 / Faverage (N)',
            yTitle: 'Average drag force F阻 (N)',
            unit: ' N',
            color: '#00f2fe',
            background: 'rgba(0, 242, 254, 0.16)',
            value: row => row.averageForce
        },
        iqr: {
            label: 'IQR = Q3 - Q1 (N)',
            yTitle: 'Interquartile range IQR (N)',
            unit: ' N',
            color: '#ff007f',
            background: 'rgba(255, 0, 127, 0.16)',
            value: row => Math.max(0, row.q3 - row.q1)
        },
        rate: {
            label: 'R = IQR / Faverage (%)',
            yTitle: 'Relative fluctuation R (%)',
            unit: '%',
            color: '#ffdd00',
            background: 'rgba(255, 221, 0, 0.16)',
            value: row => {
                const iqr = Math.max(0, row.q3 - row.q1);
                return row.averageForce > 0 ? (iqr / row.averageForce) * 100 : 0;
            }
        }
    };

    let spline = new CubicSpline(distances, dragCoefficients);
    let chartInstance = null;
    let windTunnelInstance = null;
    let activePlot = 'force';

    // 2. DOM Elements cache
    const tableBody = document.querySelector('#data-table tbody');
    const plotTabs = document.querySelectorAll('.plot-tab');
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

    // 4. Build Editable Experimental Data Table
    function initTable() {
        tableBody.innerHTML = '';
        experimentRows.forEach((rowData, idx) => {
            const row = document.createElement('tr');

            ['distanceCm', 'averageForce', 'q1', 'q3'].forEach((field) => {
                const cell = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'table-input';
                input.min = '0';
                input.step = field === 'distanceCm' ? '1' : '0.001';
                input.value = field === 'distanceCm'
                    ? rowData[field].toFixed(0)
                    : rowData[field].toFixed(3);
                input.dataset.index = idx;
                input.dataset.field = field;

                input.addEventListener('change', (e) => {
                    const val = parseFloat(e.target.value);
                    const index = parseInt(e.target.dataset.index);
                    const targetField = e.target.dataset.field;

                    if (!isNaN(val) && val >= 0) {
                        experimentRows[index][targetField] = val;
                        updateChart();
                    } else {
                        const original = experimentRows[index][targetField];
                        e.target.value = targetField === 'distanceCm'
                            ? original.toFixed(0)
                            : original.toFixed(3);
                    }
                });

                cell.appendChild(input);
                row.appendChild(cell);
            });

            tableBody.appendChild(row);
        });
    }

    // 5. Initialize Canvas plot for final experimental parameters
    function initChart() {
        const canvas = document.getElementById('aerodynamics-chart');
        chartInstance = {
            canvas,
            ctx: canvas.getContext('2d')
        };
        window.addEventListener('resize', updateChart);
        updateChart();
    }

    // Update final experimental parameter plots after table changes
    function updateChart() {
        if (!chartInstance) return;

        const sortedRows = [...experimentRows].sort((a, b) => a.distanceCm - b.distanceCm);
        const config = plotConfigs[activePlot];
        const activePoints = sortedRows.map(row => ({ x: row.distanceCm, y: config.value(row) }));
        drawExperimentChart(config, activePoints);
    }

    function drawExperimentChart(config, points) {
        const { canvas, ctx } = chartInstance;
        const rect = canvas.parentElement.getBoundingClientRect();
        const pixelRatio = window.devicePixelRatio || 1;
        const width = Math.max(320, Math.floor(rect.width));
        const height = Math.max(260, Math.floor(rect.height));
        canvas.width = Math.floor(width * pixelRatio);
        canvas.height = Math.floor(height * pixelRatio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.clearRect(0, 0, width, height);

        const padding = { top: 46, right: 24, bottom: 48, left: 68 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const xMin = 0;
        const xMax = 20;
        const rawMax = Math.max(...points.map(point => point.y), 0.001);
        const yMax = rawMax * 1.18;
        const xScale = value => padding.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
        const yScale = value => padding.top + plotHeight - (value / yMax) * plotHeight;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.font = '700 14px Outfit, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(config.label, padding.left, 24);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#a0aec0';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let i = 0; i <= 5; i++) {
            const yValue = (yMax / 5) * i;
            const y = yScale(yValue);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            ctx.fillText(formatAxisValue(yValue, config.unit), padding.left - 10, y);
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let x = 0; x <= 20; x += 5) {
            const xPos = xScale(x);
            ctx.beginPath();
            ctx.moveTo(xPos, padding.top);
            ctx.lineTo(xPos, height - padding.bottom);
            ctx.stroke();
            ctx.fillText(`${x}`, xPos, height - padding.bottom + 10);
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();

        ctx.fillStyle = '#a0aec0';
        ctx.font = '12px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Rear car distance d (cm)', padding.left + plotWidth / 2, height - 20);

        ctx.save();
        ctx.translate(18, padding.top + plotHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(config.yTitle, 0, 0);
        ctx.restore();

        const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
        gradient.addColorStop(0, config.background);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        points.forEach((point, index) => {
            const x = xScale(point.x);
            const y = yScale(point.y);
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.lineTo(xScale(points[points.length - 1].x), height - padding.bottom);
        ctx.lineTo(xScale(points[0].x), height - padding.bottom);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        points.forEach((point, index) => {
            const x = xScale(point.x);
            const y = yScale(point.y);
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        points.forEach((point) => {
            const x = xScale(point.x);
            const y = yScale(point.y);
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#07080d';
            ctx.fill();
            ctx.strokeStyle = config.color;
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }

    function formatAxisValue(value, unit) {
        if (unit === '%') return value.toFixed(0);
        return value < 0.1 ? value.toFixed(3) : value.toFixed(2);
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

    // Final plot selector tabs
    plotTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            activePlot = tab.dataset.plot;
            plotTabs.forEach(btn => {
                btn.classList.toggle('active', btn === tab);
                btn.setAttribute('aria-pressed', btn === tab ? 'true' : 'false');
            });
            updateChart();
        });
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
