# Pico firmware for EE3600 Practical 1

The hosted HTML page is now focused on **Practical 1 — DC Motor Identification**.

## Firmware file

Upload the tested UF2 file to this folder using the clean filename:

`EE3600_Practical_1_2_Combined_GP26_GP27.uf2`

The current practical page uses only the Practical 1 encoder/speed-measurement functions of the combined firmware.

## Encoder wiring

- Encoder A → GP26
- Encoder B → GP27
- The current Practical 1 HTML uses an effective motor-shaft CPR of 22 based on bench testing with the supplied encoder and firmware. The gearbox ratio is entered separately in the webpage.

## Loading the UF2 onto the Pico

1. Switch off the bench motor supply.
2. Unplug the Pico USB cable.
3. Hold **BOOTSEL** while plugging the Pico back into USB.
4. A drive named **RPI-RP2** appears.
5. Copy the UF2 file onto the RPI-RP2 drive.
6. The Pico reboots automatically.
7. Open the Practical 1 webpage and click **Connect Pico**.

The motor itself is powered from the bench supply during Practical 1. Do not power the motor from a Pico GPIO pin.
