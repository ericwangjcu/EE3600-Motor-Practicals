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
