cmake_minimum_required(VERSION 3.13)

if(NOT DEFINED PICO_SDK_PATH)
    if(DEFINED ENV{PICO_SDK_PATH})
        set(PICO_SDK_PATH $ENV{PICO_SDK_PATH})
    else()
        message(FATAL_ERROR "Set PICO_SDK_PATH to a checkout of Raspberry Pi Pico SDK 2.2.0 with its TinyUSB submodule.")
    endif()
endif()
set(PICO_BOARD pico CACHE STRING "Original RP2040 Raspberry Pi Pico")
include(${PICO_SDK_PATH}/external/pico_sdk_import.cmake)
project(EE3600_Practical_2_Pico VERSION 1.0.0 LANGUAGES C CXX ASM)
set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)
pico_sdk_init()

add_executable(EE3600_Practical_2_Pico main.c control.c)
target_compile_options(EE3600_Practical_2_Pico PRIVATE -Wall -Wextra -Wshadow -fstack-usage)
target_compile_definitions(EE3600_Practical_2_Pico PRIVATE
    PICO_STACK_SIZE=4096
    PICO_STDIO_USB_STDOUT_TIMEOUT_US=1000
    PICO_STDIO_USB_CONNECT_WAIT_TIMEOUT_MS=0
    PICO_STDIO_USB_ENABLE_RESET_VIA_BAUD_RATE=0
    PICO_STDIO_USB_ENABLE_RESET_VIA_VENDOR_INTERFACE=0
    PICO_STDIO_DEFAULT_CRLF=0)
target_link_libraries(EE3600_Practical_2_Pico pico_stdlib hardware_pwm hardware_pio
    hardware_watchdog hardware_clocks hardware_sync m)
pico_generate_pio_header(EE3600_Practical_2_Pico ${CMAKE_CURRENT_LIST_DIR}/quadrature_encoder.pio)
pico_enable_stdio_usb(EE3600_Practical_2_Pico 1)
pico_enable_stdio_uart(EE3600_Practical_2_Pico 0)
pico_set_program_name(EE3600_Practical_2_Pico "EE3600 Practical 2")
pico_set_program_version(EE3600_Practical_2_Pico "1.0.0")
pico_add_extra_outputs(EE3600_Practical_2_Pico)
