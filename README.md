# EE3600 / EE5610 Motor Practicals

Browser practicals for DC motor identification and feedback control.

- **[Practical 1](index.html):** existing DC motor measurement, encoder speed recording and CSV export.
- **[Practical 2](practical2.html):** PID speed-control **simulation**, adjustable Kp/Ki/Kd and reference, open-loop comparison, live plots, load disturbances, response metrics and complete-run CSV export.
- **[Student practical](docs/practical2-student.html):** two-hour activity with tuning, overshoot, settling, steady-state error and a position-control modelling extension. Open in a browser to print/save PDF.
- **[Hardware investigation](docs/hardware-readiness.md):** known encoder protocol, missing driver/firmware information and requirements before physical motor control.

Practical 2 does **not** actuate a real motor. Its optional Pico panel only monitors the encoder; simulation results and real encoder readings are kept separate. Position control is a modelling exercise, not an implemented browser mode.

## Running

Use the GitHub Pages site after this change is merged/deployed, or serve a local checkout:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/practical2.html`. The simulation has no external dependencies and works without hardware. For serial monitoring, use current desktop Chrome/Edge on HTTPS or localhost. Only one page/application may own the Pico serial port at a time.

Set parameters and click **Apply settings**, then **Start new run + record**. A run begins at rest and applies its input at simulation time 1 s. Apply changes during a run to mark a new analysis segment. Stop and download CSV before starting another run. A hidden tab stops the simulation and retains its samples. Simulation time uses fixed 20 ms steps and may progress more slowly than wall time under browser load.

The graph shows the latest 20 s; CSV stores the complete run (up to 120 s), run ID, segment, simulation source, reference, speed, error, duty, saturation and settings. Default plant values are illustrative; enter the Practical 1 measured gain and time constant using the conversion shown in the interface.

## Encoder and firmware

- Encoder A: GP26; encoder B: GP27.
- The current Practical 1 UI configures **44 counts per motor-shaft revolution**.
- Gearbox-output rpm = motor rpm / selected ratio (21.3 or 4.4).
- The previous README's CPR 937 did not match the working UI; do not use it in addition to the ratio correction.

See [firmware instructions](firmware/README.md). No new control UF2 is supplied. The Practical 1 firmware remains in place. Serial data stays between the browser and Pico; static hosting does not receive recordings.

## Development / verification

No build step or package installation is needed for the application. Run numerical/protocol tests with Node 18+ (Node 20+ recommended):

```sh
node --test tests/*.test.cjs
```

Browser smoke tests additionally require Playwright and its Chromium installation:

```sh
python3 -m http.server 8000
# In another terminal:
node tests/browser.cjs
```

See [validation notes](docs/validation.md) for coverage and unverified hardware behaviour.
