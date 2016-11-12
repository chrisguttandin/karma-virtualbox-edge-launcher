'use strict';

const spawn = require('child_process').spawn;
const spawnargs = require('spawn-args');

const execute = (command, log) => {
    const chunks = [];
    const tokens = command.split(/\s/);
    const shell = spawn(tokens.shift(), spawnargs(tokens.join(' '), { removequotes: true }));

    shell.stderr.on('readable', () => {
        const chunk = shell.stderr.read();

        if (chunk !== null) {
            log.warn(chunk.toString());
        }
    });

    shell.stdout.on('readable', () => {
        const chunk = shell.stdout.read();

        if (chunk !== null) {
            chunks.push(chunk.toString());
        }
    });

    return new Promise((resolve, reject) => {
        shell.on('exit', (code) => {
            if (code === 0) {
                resolve(chunks.join(''));
            } else {
                reject(code);
            }
        });
    });
};

function VirtualBoxEdgeBrowser (args, baseBrowserDecorator, logger) {
    baseBrowserDecorator(this);

    const kill = !args.keepAlive;
    const log = logger.create('launcher');
    const snapshot = args.snapshot;
    const uuid = args.uuid;

    // Just override this method to prevent the inherited one to be executed.
    this._start = () => {};

    if (!uuid) {
        log.error('Please specify the UUID of the virtual machine to use.');

        return;
    }

    this
        .on('kill', (done) => {
            execute(`VBoxManage guestcontrol {${ uuid }} --username IEUser --password Passw0rd! run --exe C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -- powershell.exe Stop-Process -processname MicrosoftEdge`, log)
                .catch(() => {
                    log.error('Failed to stop Microsoft Edge.');
                })
                .then(() => {
                    if (kill) {
                        return execute(`VBoxManage controlvm {${ uuid }} acpipowerbutton`, log);
                    }
                })
                .then(() => done())
                .catch(() => {
                    log.error('Failed to turn of the vitual machine.');

                    done();
                });
        })
        .on('start', (url) => {
            execute('VBoxManage list runningvms', log)
                .then((result) => {
                    if (!result.includes(`{${ uuid }}`)) {
                        let queue;

                        if (snapshot === undefined) {
                            queue = Promise.resolve();
                        } else {
                            queue = execute(`VBoxManage snapshot {${ uuid }} restore "${ snapshot }"`, log);
                        }

                        return queue
                            .then(() => execute(`VBoxManage startvm {${ uuid }}`, log))
                            // Wait for the LoggedInUsers to become 0.
                            .then(() => execute(`VBoxManage guestproperty wait {${ uuid }} /VirtualBox/GuestInfo/OS/LoggedInUsers --timeout 1800000`, log))
                            // Wait for the LoggedInUsers to become 1.
                            .then(() => execute(`VBoxManage guestproperty wait {${ uuid }} /VirtualBox/GuestInfo/OS/LoggedInUsers --timeout 1800000`, log))
                            .then(() => new Promise((resolve) => {
                                // Wait one more minute to be sure that Windows is up and running.
                                setTimeout(resolve, 60e3);
                            }));
                    } else {
                        log.info('The virtual machine is already running.');
                    }
                })
                .then(() => {
                    return execute(`VBoxManage guestcontrol {${ uuid }} --password Passw0rd! --username IEUser run --wait-stdout --exe C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -- powershell.exe Start-Process shell:AppsFolder\\Microsoft.MicrosoftEdge_8wekyb3d8bbwe!MicrosoftEdge ${ url.replace(/localhost:9876/, '10.0.2.2:9876') }`, log);
                })
                .catch((err) => {
                    if (err === 1) {
                        log.error('Failed to start Microsoft Edge.');
                    } else {
                        log.error(err);
                    }
                });
        });
}

VirtualBoxEdgeBrowser.prototype.name = 'VirtualBoxEdge';

VirtualBoxEdgeBrowser.$inject = [ 'args', 'baseBrowserDecorator', 'logger' ];

module.exports = {
    'launcher:VirtualBoxEdge': [ 'type', VirtualBoxEdgeBrowser ]
};
