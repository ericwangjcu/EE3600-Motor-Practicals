/* EE3600/EE5610 Practical 2, RP2040 Pico + Kitronik 5331.
 * Hardware trial status: compiled and host-tested, not bench-tested.
 * Copyright 2026. Released under the BSD-3-Clause licence in LICENSE.txt. */
#include "pico/stdlib.h"
#include "pico/stdio_usb.h"
#include "pico/binary_info.h"
#include "hardware/pwm.h"
#include "hardware/clocks.h"
#include "hardware/sync.h"
#include "hardware/watchdog.h"
#include "hardware/pio.h"
#include "quadrature_encoder.pio.h"
#include "control.h"
#include <stdio.h>
#include <string.h>
#include <math.h>
#include <inttypes.h>

#define MOTOR_FORWARD 3
#define MOTOR_REVERSE 2
#define ENCODER_A 26
#define ENCODER_B 27
#define PWM_HZ 10000
#define PWM_TOP 12499

bi_decl(bi_2pins_with_names(MOTOR_FORWARD,"M1 positive PWM",MOTOR_REVERSE,"M1 negative PWM"));
bi_decl(bi_2pins_with_names(ENCODER_A,"Encoder A (x4)",ENCODER_B,"Encoder B (x4)"));

static P2Controller controller;
static volatile bool usb_ready;
static volatile uint64_t control_alive_us;
static struct repeating_timer control_timer;
static const PIO encoder_pio=pio0;
static uint encoder_sm;
static uint32_t previous_raw32;
static int64_t raw_total;
/* These buffers are main-loop-only. Keep them off the interrupt/shared stack. */
static char tx_buffer[1200];
static char rx_line[192];

/* Always disable both inputs before enabling one direction. Both zero coast.
 * At reset the pins are inputs; DRV8833 input pulldowns also request coast. */
static void write_motor(float signed_fraction) {
    pwm_set_gpio_level(MOTOR_FORWARD,0);
    pwm_set_gpio_level(MOTOR_REVERSE,0);
    if(!isfinite(signed_fraction) || signed_fraction==0) return;
    unsigned level=(unsigned)lroundf(fminf(1.0f,fabsf(signed_fraction))*(PWM_TOP+1));
    pwm_set_gpio_level(signed_fraction>0?MOTOR_FORWARD:MOTOR_REVERSE,level);
}
static void init_motor(void) {
    gpio_init(MOTOR_FORWARD); gpio_put(MOTOR_FORWARD,0); gpio_set_dir(MOTOR_FORWARD,GPIO_OUT);
    gpio_init(MOTOR_REVERSE); gpio_put(MOTOR_REVERSE,0); gpio_set_dir(MOTOR_REVERSE,GPIO_OUT);
    uint slice=pwm_gpio_to_slice_num(MOTOR_FORWARD);
    pwm_config cfg=pwm_get_default_config();
    pwm_config_set_wrap(&cfg,PWM_TOP);
    pwm_config_set_clkdiv(&cfg,(float)clock_get_hz(clk_sys)/(PWM_HZ*(PWM_TOP+1.0f)));
    pwm_init(slice,&cfg,false);
    pwm_set_both_levels(slice,0,0);
    gpio_set_function(MOTOR_FORWARD,GPIO_FUNC_PWM);
    gpio_set_function(MOTOR_REVERSE,GPIO_FUNC_PWM);
    pwm_set_enabled(slice,true);
}
static bool control_callback(struct repeating_timer *timer) {
    (void)timer;
    uint64_t now=time_us_64();
    uint32_t raw32=(uint32_t)quadrature_encoder_get_count(encoder_pio,encoder_sm);
    /* Modular 32-bit hardware count, extended at 100 Hz into signed 64-bit.
     * This is valid when |delta| < 2^31 edges between control updates. */
    uint32_t wrapped=raw32-previous_raw32;
    int64_t delta=wrapped<=INT32_MAX ? (int64_t)wrapped : (int64_t)wrapped-4294967296LL;
    raw_total+=delta; previous_raw32=raw32;
    p2_tick(&controller,raw_total,now,usb_ready);
    write_motor(controller.applied*controller.cfg.motor_sign);
    control_alive_us=now;
    return true;
}
static P2Controller snapshot(void) {
    uint32_t irq=save_and_disable_interrupts();
    P2Controller s=controller;
    restore_interrupts(irq); return s;
}
static void emit_hello(void) {
    puts("INFO,EE3600_P2," P2_VERSION);
    puts("CAPS,SPEED_PID=1,POSITION_PID=1,STREAM_CONTROL=1,ARM_REQUIRED=1,GAINS_DUTY_FRACTION=1,CONTROL_HZ=100,TELEMETRY_HZ=50");
    puts("INFO,PINS,ENC=GP26/GP27,MOTOR=GP3/GP2,PWM_HZ=10000,ENCODER=PIO_X4");
}
static void process_line(const char *line) {
    P2Reply r;
    uint64_t now=time_us_64();
    uint32_t irq=save_and_disable_interrupts();
    p2_command(&controller,line,now,usb_ready,&r);
    if(controller.state!=P2_ARMED) write_motor(0);
    P2Controller s=controller;
    restore_interrupts(irq);
    if(!r.ok) { printf("ERR,%s,%s\n",r.command,r.reason); return; }
    if(r.hello) emit_hello();
    if(r.help) {
        puts("HELP,HELLO|HELP|STATUS|STOP|PING|ARM|MODE,OPEN/SPEED/POSITION|PWM,pct|SPEED,motor_rpm|TARGET,output_deg|PIDSPEED,kp,ki,kd,tf|PIDPOS,kp,ki,kd,tf|CPR,n|GEAR,r|ENCSIGN,+1/-1|MOTORSIGN,+1/-1|SUPPLY,v|LIMIT,pct|SPEEDLIMIT,rpm|TRAVEL,deg|DURATION,s|ZERO|STREAM,P2/ON/OFF");
    }
    if(r.config) {
        if(p2_format_config(&s,tx_buffer,sizeof(tx_buffer))) puts(tx_buffer);
    }
    printf("ACK,%s\n",r.command);
    if(!strcmp(r.command,"ARM")) printf("EVENT,ARMED,%" PRIu64 "\n",now/1000);
    if(!strcmp(r.command,"PWM") || !strcmp(r.command,"SPEED") || !strcmp(r.command,"TARGET"))
        printf("EVENT,REFERENCE,%" PRIu64 ",%.7g\n",now/1000,s.refs[s.mode]);
}

int main(void) {
    init_motor();
    p2_init(&controller);
    /* Two PIO pins are consecutive: GP26 and GP27. Official decoder is x4.
     * Dedicated PIO prevents USB/float calculations from losing GPIO edges. */
    encoder_sm=pio_claim_unused_sm(encoder_pio,true);
    uint offset=pio_add_program(encoder_pio,&quadrature_encoder_program);
    if(offset!=0) { for(;;) { write_motor(0); tight_loop_contents(); } }
    quadrature_encoder_program_init(encoder_pio,encoder_sm,ENCODER_A,0);
    previous_raw32=(uint32_t)quadrature_encoder_get_count(encoder_pio,encoder_sm);
    stdio_init_all();
    if(!add_repeating_timer_us(-10000,control_callback,NULL,&control_timer)) {
        write_motor(0); for(;;) tight_loop_contents();
    }
    /* Hardware watchdog is fed only if the main loop and control timer run.
     * A reset returns to DISARMED with both PWM inputs zero. */
    watchdog_enable(500,true);
    unsigned used=0; bool discard=false, was_connected=false;
    uint64_t next_telemetry=0;
    P2Fault announced_fault=P2_OK;
    for(;;) {
        uint64_t now=time_us_64();
        bool connected=stdio_usb_connected();
        usb_ready=connected;
        if(was_connected && !connected) {
            uint32_t irq=save_and_disable_interrupts();
            if(controller.state==P2_ARMED) p2_stop(&controller,P2_USB_LOST);
            else p2_stop(&controller,P2_OK);
            write_motor(0);
            restore_interrupts(irq);
            used=0; discard=false;
        }
        if(connected && !was_connected) { emit_hello(); next_telemetry=now; }
        was_connected=connected;
        /* Bound parsing per main-loop pass; no wait for a partial line. */
        for(unsigned n=0; connected && n<192; n++) {
            int ch=getchar_timeout_us(0);
            if(ch==PICO_ERROR_TIMEOUT) break;
            if(ch=='\r' || ch=='\n') {
                if(!discard && used) { rx_line[used]=0; process_line(rx_line); }
                used=0; discard=false;
            } else if(ch>=32 && ch<127 && !discard) {
                if(used+1<sizeof(rx_line)) rx_line[used++]=(char)ch;
                else {
                    uint32_t irq=save_and_disable_interrupts();
                    p2_stop(&controller,P2_RX_OVERFLOW); write_motor(0);
                    restore_interrupts(irq);
                    puts("ERR,INPUT,LINE_TOO_LONG"); discard=true; used=0;
                }
            }
        }
        P2Controller s=snapshot();
        if(connected && now>=next_telemetry) {
            next_telemetry=now+20000;
            if(s.stream) {
                if(p2_format_data(&s,s.last_tick_us,tx_buffer,sizeof(tx_buffer))) puts(tx_buffer);
            }
        }
        if(connected && s.fault!=announced_fault) {
            if(s.fault!=P2_OK) printf("EVENT,FAULT,%" PRIu64 ",%s\n",now/1000,p2_fault_name(s.fault));
            announced_fault=s.fault;
        }
        if(s.duration_complete) {
            uint32_t irq=save_and_disable_interrupts(); controller.duration_complete=false; restore_interrupts(irq);
            if(connected) printf("EVENT,DURATION_COMPLETE,%" PRIu64 "\n",now/1000);
        }
        uint32_t irq=save_and_disable_interrupts(); uint64_t alive=control_alive_us; restore_interrupts(irq);
        if(alive && now-alive<50000) watchdog_update();
        /* USB timers/control IRQs remain live during the short idle interval. */
        sleep_us(200);
    }
}
