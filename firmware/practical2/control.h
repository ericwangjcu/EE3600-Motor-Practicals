#ifndef EE3600_CONTROL_H
#define EE3600_CONTROL_H
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>

#define P2_VERSION "1.0.0"
#define P2_CONTROL_HZ 100
#define P2_HEARTBEAT_US 1000000ULL
#define P2_WINDOW_SAMPLES 5

typedef enum { P2_DISARMED, P2_ARMED, P2_FAULT } P2State;
typedef enum { P2_OPEN, P2_SPEED, P2_POSITION } P2Mode;
typedef enum {
    P2_OK, P2_HEARTBEAT, P2_USB_LOST, P2_OVERSPEED,
    P2_TRAVEL, P2_NO_MOTION, P2_NUMERIC, P2_TIMING, P2_RX_OVERFLOW
} P2Fault;
typedef struct { float kp, ki, kd, tf; } P2Gains;
typedef struct {
    float supply_v, limit_pct, cpr_motor, gear_ratio;
    float speed_limit_rpm, travel_limit_deg, duration_s;
    int encoder_sign, motor_sign;
    P2Gains speed, position;
} P2Config;
typedef struct {
    P2Config cfg;
    P2State state;
    P2Mode mode;
    P2Fault fault;
    float refs[3];
    bool reference_set;
    int stream; /* 0 off, 1 P2 DATA, 2 legacy DATA2 */
    uint64_t heartbeat_us, armed_at_us, last_tick_us, last_move_us;
    int64_t raw_count, zero_count, count, last_motion_count;
    float motor_rpm, output_rpm, theta_deg;
    float requested, applied, p_term, i_term, d_term, derivative;
    float previous_measurement;
    bool derivative_ready;
    int last_drive_sign;
    unsigned coast_ticks;
    int64_t history_count[P2_WINDOW_SAMPLES + 1];
    uint64_t history_time[P2_WINDOW_SAMPLES + 1];
    unsigned history_next, history_size;
    bool duration_complete;
} P2Controller;
typedef struct {
    bool ok, hello, config, help;
    char command[24], reason[48];
} P2Reply;

void p2_init(P2Controller *c);
void p2_stop(P2Controller *c, P2Fault fault);
void p2_tick(P2Controller *c, int64_t raw_count, uint64_t now_us, bool usb_connected);
void p2_command(P2Controller *c, const char *line, uint64_t now_us,
                bool usb_connected, P2Reply *reply);
float p2_hard_cap_pct(const P2Controller *c);
const char *p2_state_name(P2State s);
const char *p2_mode_name(P2Mode m);
const char *p2_fault_name(P2Fault f);
size_t p2_format_config(const P2Controller *c, char *buffer, size_t size);
size_t p2_format_data(const P2Controller *c, uint64_t now_us, char *buffer, size_t size);
#endif
