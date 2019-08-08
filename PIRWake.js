const Gpio = require('onoff').Gpio;
const exec = require('child_process').exec;

PIRWake = {
    config: {
        sensorPin: 17,
        sensorState: 1,
        alwaysOnPin: false,
        alwaysOnState: 1,
        alwaysOffPin: false,
        alwaysOffState: 1,
        powerSaving: true,
        powerSavingDelay: 0,
        powerSavingNotification: false,
        powerSavingMessage: "Monitor will be turn Off by PIR module",
    },

    start: function () {
        this.started = false;
        // Setup for sensor pin
        this.pir = new Gpio(this.config.sensorPin, 'in', 'both');

        // Setup value which represent on and off
        const valueOn = this.config.sensorState;
        const valueOff = (this.config.sensorState + 1) % 2;

        // Detected movement
        this.pir.watch(function (err, value) {
            if (value == valueOn) {
                if (self.config.powerSaving) {
                    clearTimeout(self.deactivateMonitorTimeout);
                    self.activateMonitor();
                }
            }
            else if (value == valueOff) {
                if (!self.config.powerSaving) {
                    return;
                }

                self.deactivateMonitorTimeout = setTimeout(function () {
                    self.deactivateMonitor();
                }, self.config.powerSavingDelay * 1000);
            }
        });

        this.started = true;
    },

    activateMonitor: function () {
        // If always-off is enabled, keep monitor deactivated
        let alwaysOffTrigger = this.alwaysOff && (this.alwaysOff.readSync() === this.config.alwaysOffState)
        if (alwaysOffTrigger) {
            return;
        }
        // If relays are being used in place of HDMI
        if (this.config.relayPin !== false) {
            this.relay.writeSync(this.config.relayState);
        }
        else if (this.config.relayPin === false) {
            // Check if hdmi output is already on
            exec("/usr/bin/vcgencmd display_power").stdout.on('data', function (data) {
                if (data.indexOf("display_power=0") === 0)
                    exec("/usr/bin/vcgencmd display_power 1", null);
            });
        }
    },

    deactivateMonitor: function () {
        // If always-on is enabled, keep monitor activated
        let alwaysOnTrigger = this.alwaysOn && (this.alwaysOn.readSync() === this.config.alwaysOnState)
        let alwaysOffTrigger = this.alwaysOff && (this.alwaysOff.readSync() === this.config.alwaysOffState)
        if (alwaysOnTrigger && !alwaysOffTrigger) {
            return;
        }
        // If relays are being used in place of HDMI
        if (this.config.relayPin !== false) {
            this.relay.writeSync((this.config.relayState + 1) % 2);
        }
        else if (this.config.relayPin === false) {
            exec("/usr/bin/vcgencmd display_power 0", null);
        }
    },


};