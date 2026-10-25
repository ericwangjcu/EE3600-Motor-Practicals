# Practical 2: Pico motor control

Use the [task sheet](EE3600_Practical_2.pdf) with the [motor control page](../practical2-control.html). Speed control is required. Position control is optional. Reuse your completed Practical 1 model, speed curve, encoder calibration and load arrangement.

## Load and connect

With motor power off, hold BOOTSEL while connecting the original RP2040 Pico by USB. Copy [EE3600_Practical_2_Pico.uf2](../firmware/EE3600_Practical_2_Pico.uf2) to RPI-RP2. This is the existing Practical 2 firmware 1.0.0, not a Pico 2/RP2350 image.

The application uses Kitronik 5331 Motor 1, GP3/GP2 motor drive and GP26/GP27 encoder inputs. Kitronik's [driver source](https://github.com/KitronikLtd/Kitronik-Pico-Motor-Driver-Board-MicroPython/blob/main/PicoMotorDriver.py) specifies these Motor 1 pins. Retain the established wiring and power limits for the teaching kit.

Open the motor control page in desktop Chrome or Edge and select **Connect Pico**. Close Thonny and any other application using the port. The page checks for the `EE3600_P2` firmware identity before enabling a trial. The Practical 1 encoder-only UF2 cannot run this control page.

## Apply the kit settings

In **Hardware setup**, enter the actual supply voltage, allowed duty limit, encoder counts per motor revolution and gearbox ratio. Select **Apply configuration** while disarmed. Settings reset when the Pico reboots.

The supplied defaults are 44 quadrature counts per motor revolution and a 21.3:1 gearbox; use 4.4:1 only for that confirmed motor variant. The displayed motor RPM and output RPM differ by this ratio. The supply entry is metadata used for a nominal voltage/duty ceiling; it is not a voltage or current measurement.

Use **Optional diagnostics** for a brief direction check if needed. Positive duty must correspond to positive measured motor speed before closed-loop operation.

## Bring forward the Practical 1 model

For a saved output-shaft model in rad/s per volt, `G_P1(s) = Kbar / (tau*s + 1)`, the motor-speed model used by this page has gain

`K_motor = Kbar * N * 60/(2*pi) * Vs` in motor RPM per fractional duty.

The measured `tau` stays the same. Enter the saved model and select **Convert P1 model**, then **Use converted model**. This copies model values only. It does not select, transmit or apply controller gains.

Choose an applicable tuning method from the lecture/task sheet. Enter parallel `Kp`, `Ki`, `Kd`; the integral coefficient is not `Ti`. For standard-form values, convert with `Ki = Kp/Ti` and `Kd = Kp*Td`. The controller output uses duty fraction, not percent. A PI controller uses `Kd = 0`.

## Run and compare

1. Choose an achievable motor-speed reference from the Practical 1 speed curve, leaving room for duty adjustment.
2. Enter the gains under **Speed control**. Retain the agreed filter and duty limits.
3. Select **Arm & run speed trial**. The Pico executes the 100 Hz loop.
4. Allow the trial to finish, or select **STOP**. Use **Analyse response**, then **Save CSV** before the next run.
5. Compare the same reference step with initial and refined gains. Record overshoot, 10-90% rise, settling, final error and duty clipping.

The final two seconds of armed data supply final error and settling dwell. A fault, missing telemetry or insufficient dwell cannot count as a successful measured trial. The device removes drive on trial expiry, lost host heartbeat or a latched fault. STOP permits mechanical coasting.

For optional position control, zero only while stopped and enter output-shaft degrees. This is encoder-derived relative position, not an absolute homing sensor. The lecture's position targets refer to the simulated model. The page's optional position comparison is provisional hardware guidance; report the measured response and encoder-aware band separately.

## Simulation units

The [separate simulation](../practical2.html) uses percent duty and gearbox-output RPM. For the same continuous controller, divide its gains by `100*N` to obtain duty-fraction/motor-RPM gains. Include the actual sampling, filter, actuator limits and measurement lag when validating a hardware design.

See [firmware/practical2](../firmware/practical2/) for source and protocol, and [validation status](validation.md) for the checks performed.
