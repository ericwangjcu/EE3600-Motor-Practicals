# Pico firmware for EE3600 Practical 1

Use this file for Practical 1:

`EE3600_Practical_1_Encoder_GP26_GP27.uf2`

The same recovery UF2 is used with both supplied 6 V motor/gearbox versions:

- 21.3:1 gearbox, nominal 280 rpm output
- 4.4:1 gearbox, nominal 1360 rpm output

The HTML page configures the encoder measurement automatically and applies the selected gearbox ratio separately.

## Encoder wiring

- Encoder A → GP26
- Encoder B → GP27

## Loading the UF2 onto the Pico

1. Switch off the bench motor supply.
2. Unplug the Pico USB cable.
3. Hold **BOOTSEL** while plugging the Pico back into USB.
4. A drive named **RPI-RP2** appears.
5. Copy `EE3600_Practical_1_Encoder_GP26_GP27.uf2` onto the RPI-RP2 drive.
6. The Pico reboots automatically.
7. Open the Practical 1 webpage and click **Connect Pico**.

The motor itself is powered from the bench supply during Practical 1. The webpage sends STOP when it connects so the Pico motor-drive output remains off.


## Practical 2 speed and optional position control

Load [EE3600_Practical_2_Pico.uf2](EE3600_Practical_2_Pico.uf2) for the [Pico motor control page](../practical2-control.html), using the same BOOTSEL sequence with motor power off. This is the existing `EE3600_P2` version 1.0.0 binary for the original RP2040 Pico. Its controller already supports speed and position PID, so this website integration does not change the firmware behaviour.

Kitronik 5331 Motor 1 uses GP3 positive/GP2 negative drive. The encoder remains on GP26/GP27. Use counts per motor revolution (default 44) and the separate confirmed gearbox ratio. Control runs at 100 Hz. It starts disarmed with zero gains and needs explicit configuration, reference and arm commands. STOP, finite trial duration and heartbeat expiry remove the drive.

Speed references use motor-shaft RPM, position uses gearbox-output degrees, and entered PID gains produce fractional duty. They differ from the percent-duty/output-RPM gains used by the browser simulation.

The source, build provenance, host tests, licences and protocol are in [practical2/](practical2/). Bench validation remains outstanding; see [hardware status](../docs/hardware-readiness.md).

SHA-256 of the supplied Practical 2 UF2:

`74c915c9541da3c637880ccb31a300a86ecdf59092494fd6d81171e5844b562b`

Keep the Practical 1 UF2 above as a recovery image. Both files retain the GP26/GP27 encoder wiring.
