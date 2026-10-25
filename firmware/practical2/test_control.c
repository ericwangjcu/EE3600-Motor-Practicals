#include "control.h"
#include <assert.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

static unsigned checks;
#define CHECK(x) do { ++checks; assert(x); } while(0)
static P2Reply cmd(P2Controller *c,const char *s,uint64_t now) {
    P2Reply r; p2_command(c,s,now,true,&r); return r;
}
static void open_arm(P2Controller *c,float pct,uint64_t now) {
    char b[64]; CHECK(cmd(c,"MODE,OPEN",now).ok);
    snprintf(b,sizeof(b),"PWM,%.7g",pct); CHECK(cmd(c,b,now).ok);
    CHECK(cmd(c,"PING",now).ok); CHECK(cmd(c,"ARM",now).ok);
}
int main(void) {
    P2Controller c; p2_init(&c);
    CHECK(c.state==P2_DISARMED && c.applied==0);
    CHECK(c.cfg.limit_pct==60 && c.cfg.supply_v==9);
    CHECK(fabsf(p2_hard_cap_pct(&c)-66.66667f)<1e-3);
    CHECK(!cmd(&c,"PWM,nan",1000).ok);
    CHECK(!cmd(&c,"PWM,inf",1000).ok);
    CHECK(!cmd(&c,"PWM,10junk",1000).ok);
    CHECK(!cmd(&c,"PWM,,10",1000).ok);
    CHECK(!cmd(&c,"PWM,61",1000).ok);
    CHECK(!cmd(&c,"LIMIT,100",1000).ok);
    CHECK(!cmd(&c,"CPR,0",1000).ok);
    CHECK(!cmd(&c,"GEAR,-1",1000).ok);
    CHECK(!cmd(&c,"MOTORSIGN,2",1000).ok);
    CHECK(!cmd(&c,"DURATION,61",1000).ok);
    CHECK(!cmd(&c,"PIDSPEED,1,2,3,0",1000).ok);
    CHECK(!cmd(&c,"PIDSPEED,1,,3,.02",1000).ok);
    CHECK(!cmd(&c,"ARM",1000).ok);
    CHECK(cmd(&c,"HELLO",1000).hello);
    CHECK(cmd(&c,"STREAM,ON",1000).ok && c.stream==2);
    CHECK(cmd(&c,"STREAM,P2",1000).ok && c.stream==1);
    open_arm(&c,30,10000);
    p2_tick(&c,0,10000,true); CHECK(fabsf(c.applied-.30f)<1e-6);
    CHECK(!cmd(&c,"GEAR,50",10000).ok && c.cfg.gear_ratio==21.3f);
    CHECK(!cmd(&c,"MODE,SPEED",10000).ok && c.mode==P2_OPEN);
    CHECK(cmd(&c,"PWM,-30",15000).ok);
    p2_tick(&c,1,20000,true); CHECK(c.applied==0);
    p2_tick(&c,2,30000,true); CHECK(fabsf(c.applied+.30f)<1e-6);
    CHECK(cmd(&c,"STOP",30000).ok && c.applied==0 && c.state==P2_DISARMED);
    CHECK(!cmd(&c,"ARM",30000).ok); /* no automatic resume */

    p2_init(&c); open_arm(&c,10,10000);
    for(uint64_t t=10000;t<=1030000;t+=10000) p2_tick(&c,0,t,true);
    CHECK(c.state==P2_FAULT && c.fault==P2_HEARTBEAT && c.applied==0);
    CHECK(!cmd(&c,"ARM",1040000).ok);
    CHECK(cmd(&c,"STOP",1040000).ok && c.fault==P2_OK);

    p2_init(&c); open_arm(&c,30,10000); p2_tick(&c,0,10000,false);
    CHECK(c.state==P2_FAULT && c.fault==P2_USB_LOST && c.applied==0);

    p2_init(&c); CHECK(cmd(&c,"DURATION,0.2",1).ok); open_arm(&c,10,10000);
    for(uint64_t t=10000;t<=220000;t+=10000) p2_tick(&c,0,t,true);
    CHECK(c.state==P2_DISARMED && c.duration_complete && c.applied==0);

    p2_init(&c); open_arm(&c,30,10000);
    for(uint64_t t=10000;t<=800000;t+=10000) { cmd(&c,"PING",t); p2_tick(&c,0,t,true); }
    CHECK(c.state==P2_FAULT && c.fault==P2_NO_MOTION);

    p2_init(&c); open_arm(&c,30,10000);
    p2_tick(&c,0,10000,true); p2_tick(&c,1000,20000,true);
    CHECK(c.state==P2_FAULT && c.fault==P2_OVERSPEED);

    p2_init(&c); open_arm(&c,10,10000);
    p2_tick(&c,0,10000,true); p2_tick(&c,0,60000,true);
    CHECK(c.state==P2_FAULT && c.fault==P2_TIMING);

    p2_init(&c);
    for(int i=0;i<10;i++) p2_tick(&c,i*5,10000ULL*(i+1),true);
    CHECK(fabsf(c.motor_rpm-681.81818f)<.01f);
    CHECK(fabsf(c.output_rpm-c.motor_rpm/21.3f)<.001f);
    CHECK(fabsf(c.theta_deg-360.0f*45/(44*21.3f))<.001f);
    CHECK(!cmd(&c,"ZERO",100000).ok); /* moving */
    for(int i=10;i<16;i++) p2_tick(&c,45,10000ULL*(i+1),true);
    CHECK(cmd(&c,"ZERO",160000).ok && c.theta_deg==0);
    CHECK(cmd(&c,"ENCSIGN,-1",160000).ok);
    p2_tick(&c,46,170000,true); CHECK(c.count==-1 && c.theta_deg<0);

    p2_init(&c); CHECK(cmd(&c,"MODE,SPEED",10000).ok);
    CHECK(cmd(&c,"SPEED,1000",10000).ok); CHECK(cmd(&c,"PING",10000).ok);
    CHECK(!cmd(&c,"ARM",10000).ok); /* all gains zero */
    CHECK(cmd(&c,"PIDSPEED,.0001,.001,0,.02",10000).ok);
    CHECK(cmd(&c,"ARM",10000).ok);
    p2_tick(&c,0,10000,true);
    CHECK(fabsf(c.p_term-.1f)<1e-6f && fabsf(c.i_term-.01f)<1e-6f);
    CHECK(fabsf(c.applied-.11f)<1e-6f); /* Ki integrated exactly once */
    CHECK(cmd(&c,"STOP",10000).ok);
    CHECK(cmd(&c,"PIDSPEED,1,10,0,.02",10000).ok);
    CHECK(cmd(&c,"SPEED,1000",10000).ok); CHECK(cmd(&c,"ARM",10000).ok);
    p2_tick(&c,0,20000,true);
    CHECK(fabsf(c.applied-.6f)<1e-6f && c.i_term==0); /* windup prevented */

    p2_init(&c); CHECK(cmd(&c,"MODE,SPEED",10000).ok);
    CHECK(cmd(&c,"PIDSPEED,.0001,0,.00001,.02",10000).ok);
    CHECK(cmd(&c,"SPEED,1000",10000).ok); CHECK(cmd(&c,"PING",10000).ok);
    CHECK(cmd(&c,"ARM",10000).ok); p2_tick(&c,0,10000,true);
    CHECK(c.d_term==0);
    CHECK(cmd(&c,"SPEED,2000",15000).ok); p2_tick(&c,0,20000,true);
    CHECK(c.d_term==0); /* no derivative kick on reference step */

    p2_init(&c); CHECK(cmd(&c,"MODE,POS",10000).ok);
    CHECK(cmd(&c,"PIDPOS,.01,0,.0001,.02",10000).ok);
    CHECK(!cmd(&c,"TARGET,300",10000).ok);
    CHECK(cmd(&c,"TARGET,90",10000).ok); CHECK(cmd(&c,"PING",10000).ok);
    CHECK(cmd(&c,"ARM",10000).ok); p2_tick(&c,800,10000,true);
    CHECK(c.fault==P2_TRAVEL && c.applied==0);

    p2_init(&c); CHECK(cmd(&c,"SUPPLY,6",1).ok);
    CHECK(cmd(&c,"LIMIT,100",1).ok);
    CHECK(cmd(&c,"SUPPLY,10",1).ok && c.cfg.limit_pct==60);
    char b[1200]; CHECK(p2_format_config(&c,b,sizeof(b))>0);
    CHECK(strstr(b,"\"cpr_motor\":44")!=NULL);
    c.raw_count=123; c.count=123; c.motor_rpm=456; c.stream=2;
    CHECK(p2_format_data(&c,123000,b,sizeof(b))>0);
    char *field=strtok(b,","); unsigned i=0;
    while(field) {
        if(i==1) CHECK(!strcmp(field,"123"));
        if(i==6) CHECK(!strcmp(field,"456"));
        if(i==14) CHECK(!strcmp(field,"123"));
        ++i; field=strtok(NULL,",");
    }
    CHECK(i==15);
    printf("PASS: %u controller/protocol checks. Hardware not exercised.\n",checks);
    return 0;
}
