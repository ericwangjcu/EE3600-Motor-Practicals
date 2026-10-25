# Practical 2 hardware status

The earlier repository investigation identified missing control firmware and a browser actuator path. The existing Practical 2 test pack now supplies both: [motor control page](../practical2-control.html), [RP2040 UF2](../firmware/EE3600_Practical_2_Pico.uf2), source, host tests and serial protocol. The original simulation remains separate.

## Implementation carried forward

- Kitronik 5331 Motor 1 uses GP3 positive PWM and GP2 negative PWM, matching the manufacturer's driver implementation.
- Encoder inputs are GP26/GP27, with x4 quadrature, configurable counts per motor revolution and a separate gearbox ratio.
- The Pico runs a fixed 100 Hz controller with filtered derivative on measurement and conditional anti-windup.
- It requires explicit arming and starts with zero drive. It enforces finite trials, STOP, a heartbeat timeout and fault handling.
- Speed gains use fractional duty and motor-shaft RPM. Position gains use output-shaft degrees.

The firmware remains version 1.0.0 from the existing test pack. Integrating it into the website does not constitute a new motor measurement or physical validation.

## Remaining bench test

Use the established teaching kit and supply limits. Confirm drive/encoder sign, encoder scale and the actual response before students run their designed gains. Exercise STOP, trial expiry and USB/heartbeat loss. Record response and applied duty for the chosen speed step, then assess the proposed targets using the measurement band in the task sheet.

The supply-voltage setting is declared metadata. The Pico does not measure current or temperature. Encoder-derived output position cannot independently reveal gearbox backlash or slipping.

See the [operating guide](practical2-hardware.md) for the student sequence and [validation notes](validation.md) for the checks actually performed.
