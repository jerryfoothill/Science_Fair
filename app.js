import { CubicSpline, calculateDragForce, getInitialPresets } from './math.js?v=3';
import { WindTunnel } from './windtunnel.js?v=3';

document.addEventListener('DOMContentLoaded', () => {
    const cdPreset = getInitialPresets();
    const distances = [...cdPreset.distances];
    const dragCoefficients = [...cdPreset.dragCoefficients];
    const baselineAirDensity = 1.225;
    const baselineFrontalArea = 1.40;

    const pilotRows = [
        { distanceCm: 0, n: null, medianForce: 0.020, q1: 0.019, q3: 0.022, iqr: 0.003 },
        { distanceCm: 2, n: null, medianForce: 0.017, q1: 0.016, q3: 0.017, iqr: 0.001 },
        { distanceCm: 4, n: null, medianForce: 0.012, q1: 0.011, q3: 0.016, iqr: 0.005 },
        { distanceCm: 6, n: null, medianForce: 0.014, q1: 0.013, q3: 0.015, iqr: 0.002 },
        { distanceCm: 8, n: null, medianForce: 0.023, q1: 0.022, q3: 0.024, iqr: 0.002 },
        { distanceCm: 10, n: null, medianForce: 0.026, q1: 0.025, q3: 0.027, iqr: 0.002 },
        { distanceCm: 12, n: null, medianForce: 0.016, q1: 0.013, q3: 0.018, iqr: 0.005 },
        { distanceCm: 14, n: null, medianForce: 0.015, q1: 0.013, q3: 0.016, iqr: 0.003 },
        { distanceCm: 16, n: null, medianForce: 0.025, q1: 0.024, q3: 0.026, iqr: 0.002 },
        { distanceCm: 18, n: null, medianForce: 0.030, q1: 0.028, q3: 0.031, iqr: 0.003 },
        { distanceCm: 20, n: null, medianForce: 0.016, q1: 0.015, q3: 0.017, iqr: 0.002 }
    ];

    const unmodifiedRows = [
        { distanceCm: 0, n: 9, medianForce: 0.012, q1: 0.010, q3: 0.013, iqr: 0.003 },
        { distanceCm: 1, n: 6, medianForce: 0.010, q1: 0.010, q3: 0.011, iqr: 0.001 },
        { distanceCm: 2, n: 13, medianForce: 0.015, q1: 0.013, q3: 0.016, iqr: 0.003 },
        { distanceCm: 3, n: 48, medianForce: 0.014, q1: 0.013, q3: 0.015, iqr: 0.002 },
        { distanceCm: 4, n: 35, medianForce: 0.015, q1: 0.013, q3: 0.016, iqr: 0.003 },
        { distanceCm: 5, n: 24, medianForce: 0.016, q1: 0.016, q3: 0.017, iqr: 0.001 },
        { distanceCm: 6, n: 31, medianForce: 0.013, q1: 0.012, q3: 0.016, iqr: 0.004 },
        { distanceCm: 7, n: 28, medianForce: 0.015, q1: 0.013, q3: 0.016, iqr: 0.003 },
        { distanceCm: 8, n: 30, medianForce: 0.018, q1: 0.017, q3: 0.018, iqr: 0.001 },
        { distanceCm: 9, n: 25, medianForce: 0.015, q1: 0.013, q3: 0.016, iqr: 0.003 },
        { distanceCm: 10, n: 21, medianForce: 0.016, q1: 0.015, q3: 0.0165, iqr: 0.0015 },
        { distanceCm: 11, n: 21, medianForce: 0.012, q1: 0.0115, q3: 0.013, iqr: 0.0015 },
        { distanceCm: 12, n: 20, medianForce: 0.012, q1: 0.011, q3: 0.013, iqr: 0.002 },
        { distanceCm: 13, n: 18, medianForce: 0.013, q1: 0.012, q3: 0.015, iqr: 0.003 },
        { distanceCm: 14, n: 21, medianForce: 0.018, q1: 0.017, q3: 0.0185, iqr: 0.0015 },
        { distanceCm: 15, n: 18, medianForce: 0.012, q1: 0.012, q3: 0.013, iqr: 0.001 },
        { distanceCm: 16, n: 19, medianForce: 0.018, q1: 0.016, q3: 0.019, iqr: 0.003 },
        { distanceCm: 17, n: 21, medianForce: 0.012, q1: 0.011, q3: 0.013, iqr: 0.002 },
        { distanceCm: 18, n: 26, medianForce: 0.012, q1: 0.011, q3: 0.013, iqr: 0.002 },
        { distanceCm: 19, n: 28, medianForce: 0.0125, q1: 0.0115, q3: 0.014, iqr: 0.0025 },
        { distanceCm: 20, n: 0, medianForce: null, q1: null, q3: null, iqr: null }
    ];

    const bottleRows = [
        { distanceCm: 0, n: 23, medianForce: 0.013, q1: 0.012, q3: 0.013, iqr: 0.001 },
        { distanceCm: 1, n: 35, medianForce: 0.023, q1: 0.022, q3: 0.023, iqr: 0.001 },
        { distanceCm: 2, n: 34, medianForce: 0.026, q1: 0.025, q3: 0.026, iqr: 0.001 },
        { distanceCm: 3, n: 33, medianForce: 0.023, q1: 0.023, q3: 0.024, iqr: 0.001 },
        { distanceCm: 4, n: 32, medianForce: 0.023, q1: 0.022, q3: 0.023, iqr: 0.001 },
        { distanceCm: 5, n: 23, medianForce: 0.015, q1: 0.015, q3: 0.016, iqr: 0.001 },
        { distanceCm: 6, n: 29, medianForce: 0.023, q1: 0.023, q3: 0.024, iqr: 0.001 },
        { distanceCm: 7, n: 31, medianForce: 0.017, q1: 0.016, q3: 0.018, iqr: 0.002 },
        { distanceCm: 8, n: 41, medianForce: 0.022, q1: 0.020, q3: 0.023, iqr: 0.003 },
        { distanceCm: 9, n: 43, medianForce: 0.030, q1: 0.028, q3: 0.030, iqr: 0.002 },
        { distanceCm: 10, n: 33, medianForce: 0.022, q1: 0.020, q3: 0.026, iqr: 0.006 },
        { distanceCm: 11, n: 40, medianForce: 0.017, q1: 0.017, q3: 0.018, iqr: 0.001 },
        { distanceCm: 12, n: 39, medianForce: 0.022, q1: 0.020, q3: 0.023, iqr: 0.003 },
        { distanceCm: 13, n: 29, medianForce: 0.024, q1: 0.023, q3: 0.024, iqr: 0.001 },
        { distanceCm: 14, n: 34, medianForce: 0.019, q1: 0.018, q3: 0.020, iqr: 0.002 },
        { distanceCm: 15, n: 33, medianForce: 0.019, q1: 0.018, q3: 0.020, iqr: 0.002 },
        { distanceCm: 16, n: 31, medianForce: 0.017, q1: 0.017, q3: 0.018, iqr: 0.001 },
        { distanceCm: 17, n: 26, medianForce: 0.0215, q1: 0.020, q3: 0.022, iqr: 0.002 },
        { distanceCm: 18, n: 26, medianForce: 0.022, q1: 0.020, q3: 0.022, iqr: 0.002 },
        { distanceCm: 19, n: 31, medianForce: 0.019, q1: 0.018, q3: 0.020, iqr: 0.002 },
        { distanceCm: 20, n: 26, medianForce: 0.024, q1: 0.024, q3: 0.025, iqr: 0.001 }
    ];

    const bottleStrawsRows = [
        { distanceCm: 0, n: 39, medianForce: 0.000, q1: 0.000, q3: 0.010, iqr: 0.010 },
        { distanceCm: 1, n: 19, medianForce: 0.013, q1: 0.012, q3: 0.013, iqr: 0.001 },
        { distanceCm: 2, n: 29, medianForce: 0.015, q1: 0.015, q3: 0.016, iqr: 0.001 },
        { distanceCm: 3, n: 43, medianForce: 0.013, q1: 0.012, q3: 0.013, iqr: 0.001 },
        { distanceCm: 4, n: 26, medianForce: 0.011, q1: 0.010, q3: 0.011, iqr: 0.001 },
        { distanceCm: 5, n: 29, medianForce: 0.017, q1: 0.017, q3: 0.018, iqr: 0.001 },
        { distanceCm: 6, n: 30, medianForce: 0.019, q1: 0.019, q3: 0.020, iqr: 0.001 },
        { distanceCm: 7, n: 46, medianForce: 0.017, q1: 0.016, q3: 0.017, iqr: 0.001 },
        { distanceCm: 8, n: 36, medianForce: 0.0125, q1: 0.012, q3: 0.013, iqr: 0.001 },
        { distanceCm: 9, n: 24, medianForce: 0.010, q1: 0.000, q3: 0.010, iqr: 0.010 },
        { distanceCm: 10, n: 32, medianForce: 0.015, q1: 0.015, q3: 0.016, iqr: 0.001 },
        { distanceCm: 11, n: 26, medianForce: 0.016, q1: 0.015, q3: 0.016, iqr: 0.001 },
        { distanceCm: 12, n: 30, medianForce: 0.013, q1: 0.012, q3: 0.013, iqr: 0.001 },
        { distanceCm: 13, n: 14, medianForce: 0.016, q1: 0.016, q3: 0.017, iqr: 0.001 },
        { distanceCm: 14, n: 21, medianForce: 0.000, q1: 0.000, q3: 0.010, iqr: 0.010 },
        { distanceCm: 15, n: 8, medianForce: 0.000, q1: 0.000, q3: 0.010, iqr: 0.010 },
        { distanceCm: 16, n: 27, medianForce: 0.012, q1: 0.011, q3: 0.012, iqr: 0.001 },
        { distanceCm: 17, n: 42, medianForce: 0.011, q1: 0.011, q3: 0.012, iqr: 0.001 },
        { distanceCm: 18, n: 25, medianForce: 0.011, q1: 0.010, q3: 0.0115, iqr: 0.0015 },
        { distanceCm: 19, n: 27, medianForce: 0.013, q1: 0.012, q3: 0.013, iqr: 0.001 },
        { distanceCm: 20, n: 0, medianForce: null, q1: null, q3: null, iqr: null }
    ];

    const datasets = {
        pilot: {
            label: 'Pilot Test',
            shortLabel: 'Pilot',
            color: '#8b95a5',
            background: 'rgba(139, 149, 165, 0.14)',
            rows: pilotRows
        },
        unmodified: {
            label: 'Unmodified Hair Dryer',
            shortLabel: 'Original',
            color: '#ff9f1c',
            background: 'rgba(255, 159, 28, 0.14)',
            rows: unmodifiedRows
        },
        bottle: {
            label: 'Bottle Nozzle',
            shortLabel: 'Bottle',
            color: '#00f2fe',
            background: 'rgba(0, 242, 254, 0.14)',
            rows: bottleRows
        },
        bottleStraws: {
            label: 'Bottle + Straws',
            shortLabel: 'Straightened',
            color: '#2efc9f',
            background: 'rgba(46, 252, 159, 0.14)',
            rows: bottleStrawsRows
        }
    };

    const plotConfigs = {
        force: {
            label: 'Selected dataset: median F阻 (N)',
            yTitle: 'Median drag force F阻 (N)',
            unit: ' N',
            value: row => row.medianForce
        },
        iqr: {
            label: 'Selected dataset: IQR = Q3 - Q1 (N)',
            yTitle: 'Interquartile range IQR (N)',
            unit: ' N',
            value: row => row.iqr
        },
        noise: {
            label: 'Selected dataset: adjacent-point fluctuation',
            yTitle: '|Median F(d) - Median F(d-1)| (N)',
            unit: ' N',
            value: (row, index, rows) => index === 0 ? 0 : Math.abs(row.medianForce - rows[index - 1].medianForce)
        }
    };

    let spline = new CubicSpline(distances, dragCoefficients);
    let chartInstance = null;
    let windTunnelInstance = null;
    let activePlot = 'compare';
    let activeDatasetKey = 'bottleStraws';

    const tableBody = document.querySelector('#data-table tbody');
    const plotTabs = document.querySelectorAll('.plot-tab');
    const datasetSelector = document.getElementById('dataset-selector');
    const distSlider = document.getElementById('distance-slider');
    const distSliderDisplay = document.getElementById('distance-slider-display');
    const windSpeedInput = document.getElementById('wind-speed');
    const windSpeedVal = document.getElementById('wind-speed-val');
    const airDensityInput = document.getElementById('air-density');
    const airDensityVal = document.getElementById('air-density-val');
    const airDensityImpact = document.getElementById('air-density-impact');
    const frontalAreaInput = document.getElementById('frontal-area');
    const frontalAreaVal = document.getElementById('frontal-area-val');
    const frontalAreaImpact = document.getElementById('frontal-area-impact');
    const toggleLeadInput = document.getElementById('toggle-lead-car');
    const hudDistance = document.getElementById('hud-distance');
    const hudCd = document.getElementById('hud-cd');
    const hudDragForce = document.getElementById('hud-drag-force');
    const hudTurbulence = document.getElementById('hud-turbulence');
    const efficiencyPercent = document.getElementById('efficiency-percent');
    const expCurrentCondition = document.getElementById('exp-current-condition');
    const expCurrentForce = document.getElementById('exp-current-force');
    const expCurrentIqr = document.getElementById('exp-current-iqr');
    const expCurrentRate = document.getElementById('exp-current-rate');
    const experimentTrendList = document.getElementById('experiment-trend-list');
    const conclusionSummary = document.getElementById('conclusion-summary');
    const conclusionDetail = document.getElementById('conclusion-detail');
    const viewportContainer = document.getElementById('viewport-container');
    const dropOverlay = document.getElementById('drop-overlay');
    const camButtons = {
        orbit: document.getElementById('btn-cam-orbit'),
        side: document.getElementById('btn-cam-side'),
        top: document.getElementById('btn-cam-top'),
        chase: document.getElementById('btn-cam-chase')
    };

    try {
        windTunnelInstance = new WindTunnel('canvas-container');
        windTunnelInstance.setDistance(parseFloat(distSlider.value));
        windTunnelInstance.setWindSpeed(parseFloat(windSpeedInput.value));
        windTunnelInstance.setLeadCarActive(toggleLeadInput.checked);
    } catch (e) {
        console.error('Three.js Wind Tunnel failed to initialize:', e);
    }

    function initTable() {
        tableBody.innerHTML = '';
        const dataset = datasets[activeDatasetKey];

        dataset.rows.forEach((rowData, idx) => {
            const row = document.createElement('tr');
            ['distanceCm', 'n', 'medianForce', 'q1', 'q3', 'iqr'].forEach((field) => {
                const cell = document.createElement('td');
                const input = document.createElement('input');
                input.type = rowData[field] === null ? 'text' : 'number';
                input.className = 'table-input';
                input.min = '0';
                input.step = field === 'distanceCm' || field === 'n' ? '1' : '0.0005';
                input.value = formatTableValue(rowData[field], field);
                input.dataset.index = idx;
                input.dataset.field = field;
                input.disabled = rowData[field] === null || field === 'n' || field === 'iqr';

                input.addEventListener('change', (e) => {
                    const val = parseFloat(e.target.value);
                    const index = parseInt(e.target.dataset.index);
                    const targetField = e.target.dataset.field;

                    if (!isNaN(val) && val >= 0) {
                        dataset.rows[index][targetField] = val;
                        if (targetField === 'q1' || targetField === 'q3') {
                            const targetRow = dataset.rows[index];
                            targetRow.iqr = Math.max(0, targetRow.q3 - targetRow.q1);
                            initTable();
                        }
                        updateChart();
                        updateExperimentReadout();
                        updateExperimentTrendList();
                        updateConclusion();
                    } else {
                        const original = dataset.rows[index][targetField];
                        e.target.value = targetField === 'distanceCm' ? original.toFixed(0) : original.toFixed(3);
                    }
                });

                cell.appendChild(input);
                row.appendChild(cell);
            });
            tableBody.appendChild(row);
        });
    }

    function formatTableValue(value, field) {
        if (value === null || value === undefined) return 'N/A';
        if (field === 'distanceCm' || field === 'n') return Number(value).toFixed(0);
        return Number(value).toFixed(3);
    }

    function initChart() {
        const canvas = document.getElementById('aerodynamics-chart');
        chartInstance = { canvas, ctx: canvas.getContext('2d') };
        window.addEventListener('resize', updateChart);
        updateChart();
    }

    function getSelectedRows() {
        return [...datasets[activeDatasetKey].rows].sort((a, b) => a.distanceCm - b.distanceCm);
    }

    function updateChart() {
        if (!chartInstance) return;

        if (activePlot === 'compare') {
            const series = ['unmodified', 'bottle', 'bottleStraws'].map(key => ({
                ...datasets[key],
                points: datasets[key].rows.map(row => ({ x: row.distanceCm, y: row.medianForce }))
            }));
            drawExperimentChart({
                label: 'Airflow-condition comparison: median F阻 vs distance',
                yTitle: 'Median drag force F阻 (N)',
                unit: ' N'
            }, series);
            return;
        }

        if (activePlot === 'normalized') {
            const series = ['unmodified', 'bottle', 'bottleStraws'].map(key => {
                const rows = datasets[key].rows;
                const measuredRows = rows.filter(row => Number.isFinite(row.medianForce) && row.n !== 0);
                const preferredBaseline = rows.find(row => row.distanceCm === 20 && Number.isFinite(row.medianForce));
                const baseline = preferredBaseline?.medianForce || measuredRows[measuredRows.length - 1]?.medianForce || 1;
                return {
                    ...datasets[key],
                    points: rows.map(row => ({ x: row.distanceCm, y: Number.isFinite(row.medianForce) && baseline > 0 ? row.medianForce / baseline : null }))
                };
            });
            drawExperimentChart({
                label: 'Normalized drag: F(d) / farthest measured distance',
                yTitle: 'Normalized force ratio',
                unit: 'x'
            }, series);
            return;
        }

        const rows = getSelectedRows();
        const config = plotConfigs[activePlot];
        const dataset = datasets[activeDatasetKey];
        const measuredRows = rows.filter(row => Number.isFinite(row.medianForce) && row.n !== 0);
        const points = measuredRows.map((row, index) => ({ x: row.distanceCm, y: config.value(row, index, measuredRows) }));
        drawExperimentChart(config, [{ ...dataset, points }]);
    }

    function drawExperimentChart(config, series) {
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

        const padding = { top: 54, right: 34, bottom: 54, left: width < 520 ? 108 : 142 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const allPoints = series.flatMap(item => item.points).filter(point => Number.isFinite(point.y));
        const xMin = 0;
        const xMax = 20;
        const rawMax = Math.max(...allPoints.map(point => point.y), 0.001);
        const yMax = activePlot === 'normalized' ? Math.max(1.2, rawMax * 1.1) : rawMax * 1.18;
        const xScale = value => padding.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
        const yScale = value => padding.top + plotHeight - (value / yMax) * plotHeight;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.font = '700 14px Outfit, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
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
            ctx.fillText(formatAxisValue(yValue, config.unit), padding.left - 18, y);
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
        ctx.fillText('Rear car distance d (cm)', padding.left + plotWidth / 2, height - 22);

        ctx.save();
        ctx.translate(24, padding.top + plotHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(config.yTitle, 0, 0);
        ctx.restore();

        series.forEach(item => drawSeries(ctx, item, xScale, yScale, height - padding.bottom));
        drawLegend(ctx, series, padding.left, 38);
    }

    function drawSeries(ctx, item, xScale, yScale, chartBottom) {
        const points = [...item.points].filter(point => Number.isFinite(point.y)).sort((a, b) => a.x - b.x);
        if (!points.length) return;

        const gradient = ctx.createLinearGradient(0, 54, 0, chartBottom);
        gradient.addColorStop(0, item.background);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        points.forEach((point, index) => {
            const x = xScale(point.x);
            const y = yScale(point.y);
            index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.lineTo(xScale(points[points.length - 1].x), chartBottom);
        ctx.lineTo(xScale(points[0].x), chartBottom);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        points.forEach((point, index) => {
            const x = xScale(point.x);
            const y = yScale(point.y);
            index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        points.forEach(point => {
            const x = xScale(point.x);
            const y = yScale(point.y);
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#07080d';
            ctx.fill();
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 1.8;
            ctx.stroke();
        });
    }

    function drawLegend(ctx, series, x, y) {
        ctx.font = '11px Outfit, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        let offset = 0;
        series.forEach(item => {
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + offset, y);
            ctx.lineTo(x + offset + 22, y);
            ctx.stroke();
            ctx.fillStyle = '#cbd5e1';
            const text = item.shortLabel;
            ctx.fillText(text, x + offset + 28, y);
            offset += ctx.measureText(text).width + 64;
        });
    }

    function formatAxisValue(value, unit) {
        if (unit === 'x') return value.toFixed(2);
        return value < 0.1 ? value.toFixed(3) : value.toFixed(2);
    }

    function updateTelemetry() {
        const dist = parseFloat(distSlider.value);
        const leadActive = toggleLeadInput.checked;
        let activeCd = spline.interpolate(dist);
        const cleanAirCd = dragCoefficients[dragCoefficients.length - 1];

        if (!leadActive) activeCd = cleanAirCd;

        const windSpeed = parseFloat(windSpeedInput.value);
        const airDensity = parseFloat(airDensityInput.value);
        const area = parseFloat(frontalAreaInput.value);
        const dragForce = calculateDragForce(airDensity, windSpeed, activeCd, area);
        const savings = leadActive ? Math.max(0, Math.round((1.0 - activeCd / cleanAirCd) * 100)) : 0;

        hudDistance.textContent = `${dist.toFixed(2)} cm`;
        hudCd.textContent = activeCd.toFixed(3);
        hudDragForce.textContent = `${dragForce.toFixed(1)} N`;
        updateParameterImpact(airDensityImpact, airDensity / baselineAirDensity);
        updateParameterImpact(frontalAreaImpact, area / baselineFrontalArea);

        if (!leadActive) {
            hudTurbulence.textContent = 'NONE (CLEAN AIR)';
            hudTurbulence.style.color = 'var(--neon-cyan)';
        } else if (dist <= 3.0) {
            hudTurbulence.textContent = 'CRITICAL (WAKE FLOW)';
            hudTurbulence.style.color = 'var(--neon-pink)';
        } else if (dist <= 7.0) {
            hudTurbulence.textContent = 'HIGH (TURBULENT)';
            hudTurbulence.style.color = '#ffaa00';
        } else if (dist <= 12.0) {
            hudTurbulence.textContent = 'MODERATE (SLIPSTREAM)';
            hudTurbulence.style.color = '#ffdd00';
        } else if (dist <= 17.0) {
            hudTurbulence.textContent = 'LOW (DISSIPATING)';
            hudTurbulence.style.color = '#a3ff00';
        } else {
            hudTurbulence.textContent = 'NEGLIGIBLE (CLEAN FLOW)';
            hudTurbulence.style.color = 'var(--neon-cyan)';
        }

        efficiencyPercent.textContent = `${savings}%`;
        if (windTunnelInstance) windTunnelInstance.setDistance(dist);
        updateExperimentReadout();
    }

    function getInterpolatedExperiment(distanceCm, key = activeDatasetKey) {
        const allRows = [...datasets[key].rows].sort((a, b) => a.distanceCm - b.distanceCm);
        const exactRow = allRows.find(row => row.distanceCm === distanceCm);
        if (exactRow && (exactRow.n === 0 || exactRow.medianForce === null)) return { ...exactRow };

        const sortedRows = allRows.filter(row => Number.isFinite(row.medianForce) && row.n !== 0);
        if (distanceCm <= sortedRows[0].distanceCm) return { ...sortedRows[0] };
        if (distanceCm >= sortedRows[sortedRows.length - 1].distanceCm) return { ...sortedRows[sortedRows.length - 1] };

        for (let i = 0; i < sortedRows.length - 1; i++) {
            const left = sortedRows[i];
            const right = sortedRows[i + 1];
            if (distanceCm >= left.distanceCm && distanceCm <= right.distanceCm) {
                const t = (distanceCm - left.distanceCm) / (right.distanceCm - left.distanceCm);
                return {
                    distanceCm,
                    n: null,
                    medianForce: lerp(left.medianForce, right.medianForce, t),
                    q1: lerp(left.q1, right.q1, t),
                    q3: lerp(left.q3, right.q3, t),
                    iqr: lerp(left.iqr, right.iqr, t)
                };
            }
        }

        return { ...sortedRows[0] };
    }

    function lerp(start, end, t) {
        return start + (end - start) * t;
    }

    function getExperimentMetrics(row) {
        if (!Number.isFinite(row.medianForce)) {
            return { force: null, iqr: null, rate: null };
        }

        const iqr = Number.isFinite(row.iqr) ? row.iqr : Math.max(0, row.q3 - row.q1);
        const rate = row.medianForce > 0 ? (iqr / row.medianForce) * 100 : 0;
        return { force: row.medianForce, iqr, rate };
    }

    function updateExperimentReadout() {
        if (!expCurrentForce || !expCurrentIqr || !expCurrentRate) return;

        const activeDistance = parseFloat(distSlider.value);
        const dataset = datasets[activeDatasetKey];
        const metrics = getExperimentMetrics(getInterpolatedExperiment(activeDistance));
        expCurrentCondition.textContent = dataset.shortLabel;
        expCurrentForce.textContent = metrics.force === null ? 'N/A' : `${metrics.force.toFixed(3)} N`;
        expCurrentIqr.textContent = metrics.iqr === null ? 'N/A' : `${metrics.iqr.toFixed(3)} N`;
        expCurrentRate.textContent = metrics.rate === null ? 'N/A' : `${metrics.rate.toFixed(1)}%`;

        if (experimentTrendList) {
            const nearestDistance = Math.round(activeDistance);
            experimentTrendList.querySelectorAll('.mini-table-row').forEach(row => {
                row.classList.toggle('active', parseFloat(row.dataset.distance) === nearestDistance);
            });
        }
    }

    function updateExperimentTrendList() {
        if (!experimentTrendList) return;

        experimentTrendList.innerHTML = '';
        const maxDistance = 20;
        for (let distance = 0; distance <= maxDistance; distance++) {
            const unmodified = getInterpolatedExperiment(distance, 'unmodified');
            const straightened = getInterpolatedExperiment(distance, 'bottleStraws');
            const item = document.createElement('div');
            item.className = 'mini-table-row';
            item.dataset.distance = distance;
            item.innerHTML = `
                <span>${distance}cm</span>
                <span>${formatMiniValue(unmodified.medianForce)}</span>
                <span>${formatMiniValue(straightened.medianForce)}</span>
            `;
            experimentTrendList.appendChild(item);
        }
        updateExperimentReadout();
    }

    function formatMiniValue(value) {
        return Number.isFinite(value) ? value.toFixed(3) : 'N/A';
    }

    function updateConclusion() {
        const smoothness = key => {
            const rows = [...datasets[key].rows]
                .filter(row => Number.isFinite(row.medianForce) && row.n !== 0)
                .sort((a, b) => a.distanceCm - b.distanceCm);
            const diffs = rows.slice(1).map((row, index) => Math.abs(row.medianForce - rows[index].medianForce));
            return diffs.reduce((sum, value) => sum + value, 0) / Math.max(1, diffs.length);
        };
        const originalNoise = smoothness('unmodified');
        const straightenedNoise = smoothness('bottleStraws');
        conclusionSummary.textContent = `Statistics loaded: original Δ=${originalNoise.toFixed(4)} N, straws Δ=${straightenedNoise.toFixed(4)} N.`;
        conclusionDetail.textContent = '20 cm has no reading for the unmodified hair dryer and bottle + straws datasets, so those curves stop at 19 cm.';
    }

    function updateParameterImpact(element, factor) {
        const percent = Math.round(factor * 100);
        const delta = percent - 100;
        const sign = delta > 0 ? '+' : '';
        element.textContent = `Drag factor: ${percent}% (${sign}${delta}%)`;
        element.classList.toggle('boost', delta >= 0);
    }

    function pulseDragForce() {
        hudDragForce.classList.remove('value-pulse');
        void hudDragForce.offsetWidth;
        hudDragForce.classList.add('value-pulse');
    }

    distSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        distSliderDisplay.textContent = `${val.toFixed(2)} cm`;
        updateTelemetry();
        updateChart();
    });

    windSpeedInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        windSpeedVal.textContent = `${val} km/h`;
        if (windTunnelInstance) windTunnelInstance.setWindSpeed(val);
        updateTelemetry();
    });

    airDensityInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        airDensityVal.textContent = `${val.toFixed(3)} kg/m³`;
        updateTelemetry();
        pulseDragForce();
    });

    frontalAreaInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        frontalAreaVal.textContent = `${val.toFixed(2)} m²`;
        updateTelemetry();
        pulseDragForce();
    });

    toggleLeadInput.addEventListener('change', (e) => {
        const active = e.target.checked;
        if (windTunnelInstance) windTunnelInstance.setLeadCarActive(active);
        updateTelemetry();
        updateChart();
    });

    datasetSelector.addEventListener('change', (e) => {
        activeDatasetKey = e.target.value;
        initTable();
        updateTelemetry();
        updateChart();
    });

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

    Object.keys(camButtons).forEach(preset => {
        camButtons[preset].addEventListener('click', () => {
            Object.values(camButtons).forEach(btn => btn.classList.remove('active'));
            camButtons[preset].classList.add('active');
            if (windTunnelInstance) windTunnelInstance.setCameraPreset(preset);
        });
    });

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
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const extension = file.name.split('.').pop().toLowerCase();
            if (extension === 'gltf' || extension === 'glb') {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (windTunnelInstance) {
                        windTunnelInstance.setCustomModel(event.target.result);
                        addResetModelButton();
                    }
                };
                reader.readAsArrayBuffer(file);
            } else {
                alert('Please drop a valid .gltf or .glb 3D file.');
            }
        }
    });

    function addResetModelButton() {
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
            if (windTunnelInstance) windTunnelInstance.clearCustomModel();
            resetBtn.remove();
        });
        hudContainer.appendChild(resetBtn);
    }

    initTable();
    initChart();
    updateExperimentTrendList();
    updateConclusion();
    updateTelemetry();
});
