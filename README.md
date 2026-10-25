# EE3600 / EE5610 Motor Practicals

Browser practicals for DC motor identification and feedback control.

- **[Practical 1](index.html):** existing DC motor measurement, encoder speed recording and CSV export.
- **[Practical 2: Pico motor control](practical2-control.html):** enter PI/PID gains, run finite speed trials, plot measured speed and duty, and export results. Position control is optional.
- **[Practical 2 task sheet](docs/EE3600_Practical_2.pdf):** continue from the Practical 1 model, choose an applicable tuning method, and compare initial and refined responses.
- **[Simulation](practical2.html):** the existing browser simulation remains available for exploring gains without a motor, including open-loop comparison and load disturbances.
- **[Setup and operating guide](docs/practical2-hardware.md)** and **[firmware instructions](firmware/README.md)**.

The motor control page reuses the existing Practical 2 test-pack interface and firmware 1.0.0. The Pico runs the controller at 100 Hz. The browser sends settings and references and records timestamped measurements. The uploaded PID lecture slides are unchanged.

Load [EE3600_Practical_2_Pico.uf2](firmware/EE3600_Practical_2_Pico.uf2) onto the original RP2040 Pico using BOOTSEL with motor power off. Open the motor control page, connect the Pico, apply the established calibration and actual supply settings, and enter the chosen gains. Select **Arm & run speed trial**, then **Analyse response** and **Save CSV**. Applying settings does not start the motor. Physical motor validation remains to be completed on the teaching kit.

### Gain units

| Page | Speed reference/feedback | Controller output |
|---|---|---|
| Pico motor control | Motor-shaft RPM | Signed fractional duty, e.g. 0.40 |
| Browser simulation | Gearbox-output RPM | Percent duty, e.g. 40 |

For the same continuous controller and gearbox ratio `N`, hardware-speed `Kp`, `Ki` and `Kd` equal the simulation gains divided by `100*N`. The simulation also has its own actuator lag and sample settings, so converting units alone does not validate the hardware design. No gains transfer automatically between pages. Optional hardware position uses output-shaft degrees and fractional duty.

## Running locally

Use the GitHub Pages site after this change is merged/deployed, or serve a local checkout:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/practical2-control.html` for motor control, or `http://localhost:8000/practical2.html` for simulation. Both pages have no external JavaScript dependencies. For Web Serial, use desktop Chrome/Edge on HTTPS or localhost. Only one page/application may own the Pico serial port at a time.

### Existing simulation

Set parameters and click **Apply settings**, then **Start new run + record**. A run begins at rest and applies its input at simulation time 1 s. Apply changes during a run to mark a new analysis segment. Stop and download CSV before starting another run. A hidden tab stops the simulation and retains its samples. Simulation time uses fixed 20 ms steps and may progress more slowly than wall time under browser load.

The graph shows the latest 20 s; CSV stores the complete run (up to 120 s), run ID, segment, simulation source, reference, speed, error, duty, saturation and settings. Default plant values are illustrative; enter the Practical 1 measured gain and time constant using the conversion shown in the interface.

## Encoder and firmware

- Encoder A: GP26; encoder B: GP27.
- The current Practical 1 UI configures **44 counts per motor-shaft revolution**.
- Gearbox-output rpm = motor rpm / selected ratio (21.3 or 4.4).
- The previous README's CPR 937 did not match the working UI; do not use it in addition to the ratio correction.

See [firmware instructions](firmware/README.md). The Practical 1 recovery binary remains unchanged. The supplied Practical 2 UF2 is the existing compiled version 1.0.0; this integration changes no firmware behaviour. Serial data stays between the browser and Pico; static hosting does not receive recordings.

## Development / verification

No build step or package installation is needed for the application. Run numerical/protocol tests with Node 18+ (Node 20+ recommended):

```sh
node --test tests/*.test.cjs
gcc -std=c11 -Wall -Wextra -Werror -pedantic firmware/practical2/control.c firmware/practical2/test_control.c -lm -o /tmp/ee3600-test-control
/tmp/ee3600-test-control
python3 firmware/practical2/verify_uf2.py firmware/EE3600_Practical_2_Pico.uf2
```

Browser smoke tests additionally require Playwright and its Chromium installation:

```sh
python3 -m http.server 8000
# In another terminal:
node tests/browser.cjs
```

See [validation notes](docs/validation.md) for coverage and unverified hardware behaviour.
