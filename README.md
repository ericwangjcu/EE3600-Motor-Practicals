# EE3600 Motor Practicals

Hosted browser interface for EE3600 Practical 1 and Practical 2.

- Practical 1: DC motor measurement / encoder speed recording
- Practical 2: PID speed control
- Encoder A: GP26
- Encoder B: GP27
- Default CPR: 937

Students should use a current desktop version of Chrome or Edge. Connect the Raspberry Pi Pico by USB, open the GitHub Pages site over HTTPS, and click **Connect Pico**.

The browser communicates directly with the Pico using Web Serial. Serial data stays between the student's browser and Pico; GitHub only hosts the static webpage.

## Firmware expected by the interface

See `firmware/README.md`.

GitHub Pages deployment is configured through `.github/workflows/pages.yml`.
