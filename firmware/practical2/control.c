#include "control.h"
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <errno.h>
#include <inttypes.h>

static float clampf(float x, float lo, float hi) { return fmaxf(lo, fminf(hi,x)); }
static int signf(float x) { return (x > 0) - (x < 0); }
const char *p2_state_name(P2State s) {
    return s == P2_ARMED ? "ARMED" : s == P2_FAULT ? "FAULT" : "DISARMED";
}
const char *p2_mode_name(P2Mode m) {
    return m == P2_SPEED ? "SPEED" : m == P2_POSITION ? "POSITION" : "OPEN";
}
const char *p2_fault_name(P2Fault f) {
    static const char *names[] = { "NONE", "HEARTBEAT_TIMEOUT", "USB_DISCONNECTED",
        "OVERSPEED", "TRAVEL_LIMIT", "NO_ENCODER_MOTION", "NONFINITE",
        "CONTROL_TIMING", "RX_OVERFLOW" };
    return f <= P2_RX_OVERFLOW ? names[f] : "UNKNOWN";
}
float p2_hard_cap_pct(const P2Controller *c) {
    return fminf(100.0f, 600.0f / c->cfg.supply_v);
}
static void reset_pid(P2Controller *c) {
    c->requested = c->applied = c->p_term = c->i_term = c->d_term = 0;
    c->derivative = c->previous_measurement = 0;
    c->derivative_ready = false;
    c->last_drive_sign = 0; c->coast_ticks = 0;
}
void p2_init(P2Controller *c) {
    memset(c, 0, sizeof(*c));
    c->cfg = (P2Config) { .supply_v=9, .limit_pct=60, .cpr_motor=44,
        .gear_ratio=21.3f, .speed_limit_rpm=8000, .travel_limit_deg=270,
        .duration_s=10, .encoder_sign=1, .motor_sign=1,
        .speed={0,0,0,0.02f}, .position={0,0,0,0.02f} };
    c->state=P2_DISARMED; c->mode=P2_OPEN; c->stream=1;
}
void p2_stop(P2Controller *c, P2Fault fault) {
    c->state = fault == P2_OK ? P2_DISARMED : P2_FAULT;
    c->fault = fault;
    c->reference_set = false;
    reset_pid(c);
}

/* A 50 ms backward difference at the 100 Hz control rate. Its effective
 * measurement delay is about 25 ms for a smoothly changing speed. Raw counts
 * and device timestamps are exported so identification can use its own fit. */
static void estimate(P2Controller *c, int64_t raw_count, uint64_t now) {
    c->raw_count=raw_count;
    c->count=(raw_count-c->zero_count)*c->cfg.encoder_sign;
    unsigned slot=c->history_next;
    unsigned old = c->history_size >= P2_WINDOW_SAMPLES
        ? (slot+1) % (P2_WINDOW_SAMPLES+1) : 0;
    if (c->history_size > 0 && now > c->history_time[old]) {
        double dcount=(double)(raw_count-c->history_count[old])*c->cfg.encoder_sign;
        double dt=(double)(now-c->history_time[old])*1e-6;
        c->motor_rpm=(float)(60.0*dcount/(c->cfg.cpr_motor*dt));
    } else c->motor_rpm=0;
    c->history_count[slot]=raw_count;
    c->history_time[slot]=now;
    c->history_next=(slot+1) % (P2_WINDOW_SAMPLES+1);
    if(c->history_size<P2_WINDOW_SAMPLES+1) c->history_size++;
    c->output_rpm=c->motor_rpm/c->cfg.gear_ratio;
    c->theta_deg=(float)(360.0*(double)c->count/
                    ((double)c->cfg.cpr_motor*c->cfg.gear_ratio));
}

void p2_tick(P2Controller *c, int64_t raw_count, uint64_t now, bool usb_connected) {
    uint64_t elapsed = c->last_tick_us ? now-c->last_tick_us : 10000;
    c->last_tick_us=now;
    estimate(c,raw_count,now);
    if(c->state != P2_ARMED) { c->applied=0; return; }
    if(!usb_connected) { p2_stop(c,P2_USB_LOST); return; }
    if(now-c->heartbeat_us > P2_HEARTBEAT_US) { p2_stop(c,P2_HEARTBEAT); return; }
    if(elapsed<5000 || elapsed>30000) { p2_stop(c,P2_TIMING); return; }
    if(now-c->armed_at_us >= (uint64_t)(c->cfg.duration_s*1e6f)) {
        p2_stop(c,P2_OK); c->duration_complete=true; return;
    }
    if(!isfinite(c->motor_rpm) || !isfinite(c->theta_deg)) {
        p2_stop(c,P2_NUMERIC); return;
    }
    if(fabsf(c->motor_rpm)>c->cfg.speed_limit_rpm) { p2_stop(c,P2_OVERSPEED); return; }
    if(c->mode==P2_POSITION && fabsf(c->theta_deg)>c->cfg.travel_limit_deg) {
        p2_stop(c,P2_TRAVEL); return;
    }
    const float dt=(float)elapsed*1e-6f;
    const float lim=fminf(c->cfg.limit_pct,p2_hard_cap_pct(c))*0.01f;
    float err=0, tentative_i=c->i_term, increment=0;
    if(c->mode==P2_OPEN) {
        c->requested=c->refs[P2_OPEN]*0.01f;
        c->p_term=c->i_term=c->d_term=0;
    } else {
        P2Gains g=c->mode==P2_SPEED ? c->cfg.speed : c->cfg.position;
        float y=c->mode==P2_SPEED ? c->motor_rpm : c->theta_deg;
        err=c->refs[c->mode]-y;
        /* Backward-Euler first-order filter of the derivative. Derivative is
         * on measurement, avoiding a derivative kick on reference changes. */
        float dy=c->derivative_ready ? (y-c->previous_measurement)/dt : 0;
        c->derivative=(g.tf*c->derivative+dt*dy)/(g.tf+dt);
        c->previous_measurement=y; c->derivative_ready=true;
        c->p_term=g.kp*err;
        c->d_term=-g.kd*c->derivative;
        increment=g.ki*dt*err;
        tentative_i=clampf(c->i_term+increment,-lim,lim);
        c->requested=c->p_term+tentative_i+c->d_term;
    }
    if(!isfinite(c->requested) || !isfinite(tentative_i)) {
        p2_stop(c,P2_NUMERIC); return;
    }
    float proposed=clampf(c->requested,-lim,lim);
    int new_sign=signf(proposed);
    /* One complete 10 ms control interval of coast when commanded direction
     * reverses. The hardware writer also clears both PWM channels first. */
    bool reversing=(new_sign && c->last_drive_sign && new_sign!=c->last_drive_sign);
    if(reversing && c->coast_ticks==0) { c->coast_ticks=1; proposed=0; }
    else if(c->coast_ticks) { c->coast_ticks=0; c->last_drive_sign=new_sign; }
    else if(new_sign) c->last_drive_sign=new_sign;
    if(c->mode!=P2_OPEN) {
        /* Conditional anti-windup: integrate only if not clipped, or if the
         * integral increment would unwind the final actuator restriction. */
        if(fabsf(c->requested-proposed)<1e-6f ||
           (c->requested-proposed)*increment <= 0) c->i_term=tentative_i;
        c->requested=c->p_term+c->i_term+c->d_term;
        if(!reversing && !c->coast_ticks) proposed=clampf(c->requested,-lim,lim);
    }
    c->applied=proposed;
    if(raw_count != c->last_motion_count) c->last_move_us=now;
    c->last_motion_count=raw_count;
    bool motion_expected=fabsf(c->applied)>=0.20f;
    if(c->mode==P2_POSITION && fabsf(err)<=2.0f) motion_expected=false;
    if(!motion_expected) c->last_move_us=now;
    if(motion_expected && now-c->last_move_us>750000ULL) p2_stop(c,P2_NO_MOTION);
}

static void fail(P2Reply *r,const char *why) {
    r->ok=false; snprintf(r->reason,sizeof(r->reason),"%s",why);
}
static bool number(const char *s,float *out) {
    if(!s || !*s) return false;
    errno=0; char *end; float v=strtof(s,&end);
    while(isspace((unsigned char)*end)) end++;
    if(errno || end==s || *end || !isfinite(v)) return false;
    *out=v; return true;
}
static bool one_number(int argc,char **argv,float *v,P2Reply *r) {
    if(argc!=2 || !number(argv[1],v)) { fail(r,"FINITE_NUMBER_REQUIRED"); return false; }
    return true;
}
static bool disarmed(P2Controller *c,P2Reply *r) {
    if(c->state==P2_ARMED) { fail(r,"DISARM_FIRST"); return false; }
    if(c->state==P2_FAULT) { fail(r,"STOP_TO_CLEAR_FAULT"); return false; }
    return true;
}
static void reset_estimator(P2Controller *c) {
    c->history_size=c->history_next=0; c->motor_rpm=c->output_rpm=0;
}

void p2_command(P2Controller *c,const char *line,uint64_t now,bool usb,P2Reply *r) {
    memset(r,0,sizeof(*r)); r->ok=true;
    char buf[192];
    if(strlen(line)>=sizeof(buf)) { snprintf(r->command,sizeof(r->command),"INPUT"); fail(r,"LINE_TOO_LONG"); return; }
    snprintf(buf,sizeof(buf),"%s",line);
    /* Preserve empty fields so malformed comma lists cannot be accepted. */
    char *argv[8]; int argc=1; argv[0]=buf;
    for(char *p=buf;*p;p++) if(*p==',') {
        *p=0; if(argc==8) { fail(r,"TOO_MANY_FIELDS"); return; } argv[argc++]=p+1;
    }
    for(int i=0;i<argc;i++) {
        while(isspace((unsigned char)*argv[i])) argv[i]++;
        char *end=argv[i]+strlen(argv[i]);
        while(end>argv[i] && isspace((unsigned char)end[-1])) *--end=0;
    }
    for(char *p=argv[0];*p;p++) *p=(char)toupper((unsigned char)*p);
    snprintf(r->command,sizeof(r->command),"%s",argv[0]);
    const char *cmd=argv[0]; float v;
    if(!strcmp(cmd,"STOP")) {
        if(argc!=1) { fail(r,"NO_ARGUMENTS"); return; }
        p2_stop(c,P2_OK); c->duration_complete=false; return;
    }
    if(!strcmp(cmd,"PING")) {
        if(argc!=1) { fail(r,"NO_ARGUMENTS"); return; }
        c->heartbeat_us=now; return;
    }
    if(!strcmp(cmd,"HELLO") || !strcmp(cmd,"STATUS") || !strcmp(cmd,"HELP")) {
        if(argc!=1) { fail(r,"NO_ARGUMENTS"); return; }
        r->hello=!strcmp(cmd,"HELLO"); r->help=!strcmp(cmd,"HELP");
        r->config=!r->help; return;
    }
    if(!strcmp(cmd,"STREAM")) {
        if(argc!=2) { fail(r,"EXPECTED_P2_ON_OR_OFF"); return; }
        if(!strcmp(argv[1],"P2")) c->stream=1;
        else if(!strcmp(argv[1],"ON")) c->stream=2;
        else if(!strcmp(argv[1],"OFF")) c->stream=0;
        else fail(r,"EXPECTED_P2_ON_OR_OFF");
        return;
    }
    if(!strcmp(cmd,"ARM")) {
        if(argc!=1) { fail(r,"NO_ARGUMENTS"); return; }
        if(!disarmed(c,r)) return;
        if(!usb) { fail(r,"USB_NOT_CONNECTED"); return; }
        if(!c->heartbeat_us || now-c->heartbeat_us>P2_HEARTBEAT_US) { fail(r,"PING_REQUIRED"); return; }
        if(!c->reference_set) { fail(r,"REFERENCE_REQUIRED"); return; }
        if(c->mode!=P2_OPEN) {
            P2Gains g=c->mode==P2_SPEED?c->cfg.speed:c->cfg.position;
            if(g.kp==0 && g.ki==0 && g.kd==0) { fail(r,"SET_NONZERO_GAINS"); return; }
        }
        if(c->mode==P2_POSITION && fabsf(c->theta_deg)>c->cfg.travel_limit_deg) { fail(r,"OUTSIDE_TRAVEL"); return; }
        reset_pid(c); c->state=P2_ARMED; c->fault=P2_OK;
        c->armed_at_us=now; c->last_move_us=now; c->last_motion_count=c->raw_count;
        c->duration_complete=false; return;
    }
    if(!strcmp(cmd,"PWM") || !strcmp(cmd,"SPEED") || !strcmp(cmd,"TARGET")) {
        if(!one_number(argc,argv,&v,r)) return;
        P2Mode wanted=!strcmp(cmd,"PWM")?P2_OPEN:!strcmp(cmd,"SPEED")?P2_SPEED:P2_POSITION;
        if(c->state==P2_FAULT) { fail(r,"STOP_TO_CLEAR_FAULT"); return; }
        if(c->mode!=wanted) { fail(r,"WRONG_MODE"); return; }
        float lim=wanted==P2_OPEN?c->cfg.limit_pct:wanted==P2_SPEED?c->cfg.speed_limit_rpm:c->cfg.travel_limit_deg;
        if(fabsf(v)>lim) { fail(r,"REFERENCE_OUT_OF_RANGE"); return; }
        c->refs[wanted]=v; c->reference_set=true; return;
    }
    if(!disarmed(c,r)) return;
    if(!strcmp(cmd,"MODE")) {
        if(argc!=2) { fail(r,"EXPECTED_OPEN_SPEED_POSITION"); return; }
        if(!strcmp(argv[1],"OPEN")) c->mode=P2_OPEN;
        else if(!strcmp(argv[1],"SPEED")) c->mode=P2_SPEED;
        else if(!strcmp(argv[1],"POSITION")||!strcmp(argv[1],"POS")) c->mode=P2_POSITION;
        else { fail(r,"EXPECTED_OPEN_SPEED_POSITION"); return; }
        c->reference_set=false; reset_pid(c); r->config=true; return;
    }
    if(!strcmp(cmd,"ZERO")) {
        if(argc!=1) { fail(r,"NO_ARGUMENTS"); return; }
        if(fabsf(c->motor_rpm)>20) { fail(r,"WAIT_FOR_STOP"); return; }
        c->zero_count=c->raw_count; c->count=0; c->theta_deg=0;
        c->refs[P2_POSITION]=0; c->reference_set=false; r->config=true; return;
    }
    if(!strcmp(cmd,"PIDSPEED") || !strcmp(cmd,"PIDPOS")) {
        float kp,ki,kd,tf;
        if(argc!=5 || !number(argv[1],&kp) || !number(argv[2],&ki) ||
           !number(argv[3],&kd) || !number(argv[4],&tf)) { fail(r,"EXPECTED_KP_KI_KD_TF"); return; }
        if(kp<0 || ki<0 || kd<0 || kp>10 || ki>100 || kd>10 || tf<0.001f || tf>1) {
            fail(r,"GAINS_OUT_OF_RANGE"); return;
        }
        P2Gains g={kp,ki,kd,tf};
        if(!strcmp(cmd,"PIDSPEED")) c->cfg.speed=g; else c->cfg.position=g;
        reset_pid(c); r->config=true; return;
    }
    if(!strcmp(cmd,"CPR") || !strcmp(cmd,"GEAR") || !strcmp(cmd,"ENCSIGN") ||
       !strcmp(cmd,"MOTORSIGN") || !strcmp(cmd,"SUPPLY") || !strcmp(cmd,"LIMIT") ||
       !strcmp(cmd,"SPEEDLIMIT") || !strcmp(cmd,"TRAVEL") || !strcmp(cmd,"DURATION")) {
        if(!one_number(argc,argv,&v,r)) return;
        if(!strcmp(cmd,"CPR")) {
            if(v<1 || v>100000) { fail(r,"CPR_RANGE_1_TO_100000"); return; }
            c->cfg.cpr_motor=v; reset_estimator(c);
        } else if(!strcmp(cmd,"GEAR")) {
            if(v<1 || v>1000) { fail(r,"GEAR_RANGE_1_TO_1000"); return; }
            c->cfg.gear_ratio=v;
        } else if(!strcmp(cmd,"ENCSIGN") || !strcmp(cmd,"MOTORSIGN")) {
            if(v!=1 && v!=-1) { fail(r,"SIGN_MUST_BE_1_OR_MINUS1"); return; }
            if(!strcmp(cmd,"ENCSIGN")) { c->cfg.encoder_sign=(int)v; reset_estimator(c); }
            else c->cfg.motor_sign=(int)v;
        } else if(!strcmp(cmd,"SUPPLY")) {
            if(v<3 || v>10) { fail(r,"SUPPLY_RANGE_3_TO_10"); return; }
            c->cfg.supply_v=v; c->cfg.limit_pct=fminf(c->cfg.limit_pct,p2_hard_cap_pct(c));
        } else if(!strcmp(cmd,"LIMIT")) {
            if(v<1 || v>p2_hard_cap_pct(c)+1e-4f) { fail(r,"LIMIT_EXCEEDS_NOMINAL_CAP"); return; }
            c->cfg.limit_pct=fminf(v,p2_hard_cap_pct(c));
        } else if(!strcmp(cmd,"SPEEDLIMIT")) {
            if(v<100 || v>20000) { fail(r,"SPEEDLIMIT_RANGE_100_TO_20000"); return; }
            c->cfg.speed_limit_rpm=v;
        } else if(!strcmp(cmd,"TRAVEL")) {
            if(v<10 || v>720) { fail(r,"TRAVEL_RANGE_10_TO_720"); return; }
            c->cfg.travel_limit_deg=v;
        } else if(!strcmp(cmd,"DURATION")) {
            if(v<0.2f || v>60) { fail(r,"DURATION_RANGE_0P2_TO_60"); return; }
            c->cfg.duration_s=v;
        }
        c->reference_set=false; r->config=true; return;
    }
    fail(r,"UNKNOWN_COMMAND");
}

size_t p2_format_config(const P2Controller *c,char *b,size_t n) {
    int z=snprintf(b,n,
        "CONFIG,{\"firmware\":\"%s\",\"state\":\"%s\",\"mode\":\"%s\",\"target\":%.7g,"
        "\"supply_v\":%.7g,\"duty_limit_pct\":%.7g,\"duty_hard_cap_pct\":%.7g,"
        "\"cpr_motor\":%.7g,\"gear_ratio\":%.7g,\"encoder_sign\":%d,\"motor_sign\":%d,"
        "\"speed_limit_rpm\":%.7g,\"travel_limit_deg\":%.7g,\"duration_s\":%.7g,"
        "\"pidspeed\":{\"kp\":%.7g,\"ki\":%.7g,\"kd\":%.7g,\"tf\":%.7g},"
        "\"pidpos\":{\"kp\":%.7g,\"ki\":%.7g,\"kd\":%.7g,\"tf\":%.7g},"
        "\"control_hz\":100,\"telemetry_hz\":50,\"speed_window_ms\":50,"
        "\"heartbeat_timeout_ms\":1000,\"calibration\":\"assumed\","
        "\"fault\":\"%s\",\"pwm_hz\":10000}",
        P2_VERSION,p2_state_name(c->state),p2_mode_name(c->mode),c->refs[c->mode],
        c->cfg.supply_v,c->cfg.limit_pct,p2_hard_cap_pct(c),c->cfg.cpr_motor,c->cfg.gear_ratio,
        c->cfg.encoder_sign,c->cfg.motor_sign,c->cfg.speed_limit_rpm,c->cfg.travel_limit_deg,c->cfg.duration_s,
        c->cfg.speed.kp,c->cfg.speed.ki,c->cfg.speed.kd,c->cfg.speed.tf,
        c->cfg.position.kp,c->cfg.position.ki,c->cfg.position.kd,c->cfg.position.tf,p2_fault_name(c->fault));
    return z>0 && (size_t)z<n ? (size_t)z : 0;
}
size_t p2_format_data(const P2Controller *c,uint64_t now,char *b,size_t n) {
    int z;
    if(c->stream==2) z=snprintf(b,n,
        "DATA2,%" PRIu64 ",%s,%s,%.6g,%.6g,%.6g,%.6g,%.6g,%.6g,%.6g,%.6g,%.6g,%s,%" PRId64,
        now/1000,p2_state_name(c->state),p2_mode_name(c->mode),c->refs[c->mode],c->theta_deg,
        c->motor_rpm,c->output_rpm,100*c->requested,100*c->applied,100*c->p_term,
        100*c->i_term,100*c->d_term,p2_fault_name(c->fault),c->count);
    else z=snprintf(b,n,
        "DATA,%" PRIu64 ",%s,%s,%.6g,%.6g,%.6g,%.6g,%" PRId64 ",%.6g,%.6g,%.6g,%.6g,%.6g,%s",
        now/1000,p2_state_name(c->state),p2_mode_name(c->mode),c->refs[c->mode],
        c->motor_rpm,c->output_rpm,c->theta_deg,c->count,100*c->requested,
        100*c->applied,100*c->p_term,100*c->i_term,100*c->d_term,p2_fault_name(c->fault));
    return z>0 && (size_t)z<n ? (size_t)z : 0;
}
