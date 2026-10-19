# Practical 2 hardware investigation

Reviewed against upstream `d5ea7e8833fcdf77a1e116446e2986764d6260ae` (latest update 6 October 2026).

## What the repository establishes

- The original `index.html` implements Practical 1, including the USB-disconnection fix. No open pull requests were present when checked.
- `firmware/` supplies only `EE3600_Practical_1_Encoder_GP26_GP27.uf2` and its README. There is no firmware source, build configuration, driver schematic or verified PID command specification in the repository. The UF2's internal behaviour has not been verified in this implementation.
- Documented encoder channels: A on GP26, B on GP27. The UI opens serial at 115200 baud and sends `STOP`, `HELLO`, `CPR,44`, `ENCSIGN,+1`, `STREAM,ON`, `STATUS`.
- The existing DATA2 parser reads device milliseconds from field 1, motor rpm from field 6 and signed count from field 14 (zero-based). The new monitor uses the same parser and configuration. Actual device interoperability still requires a bench check.
- The working page uses 44 counts per motor revolution and divides rpm by the selected gearbox ratio (21.3 or 4.4). The old README's “Default CPR: 937” was inconsistent and has been corrected. Do not apply both output-shaft CPR and the ratio correction.
- The existing materials describe 6 V motors, nominal output speeds 280/1360 rpm, and direct bench-supply drive for Practical 1. Those descriptions do not establish the installed driver, safe PWM pins or approved current limits.
- The Practical 1 page recognises a combined-firmware identification string, but no matching source/protocol or control firmware is supplied. That string is not evidence that hardware PID is ready.

## Implemented boundary

Practical 2 simulation has no serial actuator path. The encoder monitor permits only the fixed Practical 1 initialization sequence. There is no arbitrary command console, hardware-enable flag or speculative PWM pin assignment. The existing Practical 1 page, including its diagnostic console, remains available. Hardware PID cannot be enabled from the new UI.

`STOP` is an inherited command, not a verified emergency-stop mechanism. Keep motor power off during the optional hand-turn encoder check. No new UF2 is supplied and no claim is made that the existing binary can run PID safely.

## Required evidence before implementation

| Item | Evidence / test needed |
|---|---|
| Motor and driver | Exact driver board model/revision, datasheet, schematic or clear labelled wiring photographs, motor/gearbox identification, supply voltage and approved current limits. |
| Control connections | Verified PWM, direction, enable/standby and ground connections; voltage compatibility; encoder power and signal levels. GP26/27 remain encoder inputs unless a reviewed redesign establishes otherwise. |
| Power protection | Tutor-approved current limiting, protection appropriate to the driver, accessible physical motor-power isolation and safe mounting. Determine coast/brake behaviour and startup pin states. |
| Encoder scale | Bench confirmation of sign and counts per revolution at the motor and output shafts; behaviour at low speed, rollover and maximum speed. |
| Source and protocol | Recover the source/build instructions for the current UF2 or implement a reviewed replacement. Document commands, units, acknowledgements, firmware version/capabilities and telemetry fields. |
| Operating limits | Approved duty, speed, acceleration and current limits; stall/encoder-loss behaviour; maximum run time. Position control additionally needs reference/zero, travel limits and verified bidirectional drive. |

## Proposed architecture for a later release (not implemented)

Run the deterministic PID loop on the Pico, not in browser timers or USB round trips. The browser should send validated configuration and setpoints and receive timestamped telemetry. Firmware must default to output disabled at boot/reset, require an explicit arm sequence, enforce limits independently, and stop on expired host heartbeat, stale encoder data or a detected fault. Determine watchdog/heartbeat periods from the bench design; no timeout has yet been approved.

Handshake must positively identify the reviewed control firmware and its capabilities before arm is offered. Unknown/Practical 1 firmware must stay monitor-only. A STOP command must be acknowledged, and physical motor-power isolation remains necessary when host/firmware communication fails.

## Bench release checks

1. With motor power disconnected, verify pin states, protocol, encoder count/sign and initialization.
2. With tutor-approved limited power, test low-duty open-loop direction, scale and STOP/coast/brake behaviour.
3. Verify boot, reset, USB removal, browser close, stale telemetry, invalid commands, watchdog expiry and encoder failure all produce the approved safe state; preserve logs.
4. Establish limits and test conservative local closed-loop control, then load/step responses inside those limits.
5. Review physical wiring, firmware source/build and test evidence before implementing the browser arm/control path. Update student instructions only after sign-off.

Simulation bounds (100% duty, 2000 rpm reference entry) are UI/model bounds, **not approved hardware limits**. The simulation omits electrical current, friction, noise and backlash and cannot validate motor safety or real-world tuning.
