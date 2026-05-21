/**
 * Math utilities for F1 Aerodynamics Dashboard.
 * Includes Cubic Spline Interpolation and Aerodynamic calculations.
 */

export class CubicSpline {
    constructor(x, y) {
        if (x.length !== y.length || x.length < 3) {
            throw new Error("Spline requires at least 3 points and matching arrays.");
        }
        
        // Sort points by x to ensure proper interpolation
        const points = x.map((val, idx) => ({ x: val, y: y[idx] }))
                        .sort((a, b) => a.x - b.x);
        
        this.x = points.map(p => p.x);
        this.a = points.map(p => p.y); // a_i = y_i
        this.n = this.x.length;
        
        this.b = new Array(this.n - 1).fill(0);
        this.c = new Array(this.n).fill(0);
        this.d = new Array(this.n - 1).fill(0);
        
        this.calcCoefficients();
    }

    calcCoefficients() {
        const n = this.n;
        const h = new Array(n - 1);
        for (let i = 0; i < n - 1; i++) {
            h[i] = this.x[i + 1] - this.x[i];
            if (h[i] <= 0) {
                throw new Error("X coordinates must be strictly increasing.");
            }
        }

        const alpha = new Array(n - 1).fill(0);
        for (let i = 1; i < n - 1; i++) {
            alpha[i] = (3 / h[i]) * (this.a[i + 1] - this.a[i]) - (3 / h[i - 1]) * (this.a[i] - this.a[i - 1]);
        }

        const l = new Array(n).fill(0);
        const mu = new Array(n).fill(0);
        const z = new Array(n).fill(0);

        l[0] = 1;
        mu[0] = 0;
        z[0] = 0;

        for (let i = 1; i < n - 1; i++) {
            l[i] = 2 * (this.x[i + 1] - this.x[i - 1]) - h[i - 1] * mu[i - 1];
            mu[i] = h[i] / l[i];
            z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
        }

        l[n - 1] = 1;
        z[n - 1] = 0;
        this.c[n - 1] = 0; // Natural boundary condition: second derivative at boundary is 0

        for (let j = n - 2; j >= 0; j--) {
            this.c[j] = z[j] - mu[j] * this.c[j + 1];
            this.b[j] = (this.a[j + 1] - this.a[j]) / h[j] - h[j] * (this.c[j + 1] + 2 * this.c[j]) / 3;
            this.d[j] = (this.c[j + 1] - this.c[j]) / (3 * h[j]);
        }
    }

    /**
     * Interpolates value at xVal
     */
    interpolate(xVal) {
        const n = this.n;
        
        // Handle out of bounds by clamping to boundaries
        if (xVal <= this.x[0]) return this.a[0];
        if (xVal >= this.x[n - 1]) return this.a[n - 1];

        // Find the interval containing xVal
        let i = 0;
        let j = n - 1;
        while (j - i > 1) {
            const mid = Math.floor((i + j) / 2);
            if (xVal < this.x[mid]) {
                j = mid;
            } else {
                i = mid;
            }
        }

        const dx = xVal - this.x[i];
        return this.a[i] + this.b[i] * dx + this.c[i] * dx * dx + this.d[i] * dx * dx * dx;
    }
}

/**
 * Calculates aerodynamic drag force.
 * Formula: F_d = 0.5 * rho * v^2 * C_d * A
 * @param {number} rho - Air density in kg/m^3
 * @param {number} vKmh - Wind velocity in km/h
 * @param {number} cd - Drag Coefficient
 * @param {number} area - Frontal area in m^2
 * @returns {number} Drag force in Newtons
 */
export function calculateDragForce(rho, vKmh, cd, area) {
    const vMs = vKmh / 3.6; // Convert km/h to m/s
    return 0.5 * rho * (vMs * vMs) * cd * area;
}

/**
 * Generates initial realistic preset data for drag coefficients.
 * At close distances, the trailing car benefits from slipstream, reducing drag coefficient.
 * Typical ambient Cd for an F1 car is around 1.0. At 0-2m, it can drop to ~0.6-0.7.
 */
export function getInitialPresets() {
    return {
        distances: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
        // Drag coefficient ratio relative to clean air (1.0)
        // Values model slipstream physics (lowest at 0m, recovery to clean air at 20m)
        dragCoefficients: [0.55, 0.60, 0.68, 0.76, 0.83, 0.89, 0.93, 0.96, 0.98, 0.99, 1.00]
    };
}
