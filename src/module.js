'use strict';

const createProxyServer = require('http-proxy').createProxyServer;
const http = require('http');
const spawn = require('child_process').spawn;
const spawnargs = require('spawn-args');

const executeAndReturn = (command) => {
    const tokens = command.split(/\s/);
    const shell = spawn(tokens.shift(), spawnargs(tokens.join(' '), { removequotes: true }));

    return new Promise((resolve, reject) => {
        shell.on('exit', (code) => {
            if (code === 0) {
                resolve(code);
            } else {
                reject(code);
            }
        });
    });
};

const executeAndCapture = (command, log) => {
    const chunks = [];
    const tokens = command.split(/\s/);
    const shell = spawn(tokens.shift(), tokens);

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
    let proxyServer;

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
            if (proxyServer) {
                proxyServer.close();
            }

            executeAndReturn(`VBoxManage guestcontrol {${ uuid }} --username IEUser --password Passw0rd! run --exe C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -- powershell.exe Stop-Process -processname MicrosoftEdge`)
                .catch(() => {
                    log.error('Failed to stop Microsoft Edge.');
                })
                .then(() => {
                    if (kill) {
                        return executeAndCapture(`VBoxManage controlvm {${ uuid }} acpipowerbutton`, log);
                    }
                })
                .then(() => done())
                .catch(() => {
                    log.error('Failed to turn of the vitual machine.');

                    done();
                });
        })
        .on('start', (url) => {
            executeAndCapture('VBoxManage list runningvms', log)
                .then((result) => {
                    if (!result.includes(`{${ uuid }}`)) {
                        let queue;

                        if (!!snapshot) {
                            queue = executeAndCapture(`VBoxManage snapshot {${ uuid }} restore "${ snapshot }"`, log);
                        } else {
                            queue = Promise.resolve();
                        }

                        return queue
                            .then(() => executeAndCapture(`VBoxManage startvm {${ uuid }}`, log))
                            // Wait for the LoggedInUsers to become 0.
                            .then(() => executeAndCapture(`VBoxManage guestproperty wait {${ uuid }} /VirtualBox/GuestInfo/OS/LoggedInUsers --timeout 1800000`, log))
                            // Wait for the LoggedInUsers to become 1.
                            .then(() => executeAndCapture(`VBoxManage guestproperty wait {${ uuid }} /VirtualBox/GuestInfo/OS/LoggedInUsers --timeout 1800000`, log))
                            .then(() => new Promise((resolve) => {
                                // Wait one more minute to be sure that Windows is up and running.
                                setTimeout(resolve, 60e3);
                            }));
                    } else {
                        log.info('The virtual machine is already running.');
                    }
                })
                .then(() => {
                    const proxy = createProxyServer({ target: { host: 'localhost', port: 9876 } });

                    proxy.on('proxyRes', (proxyRes, request, response) => {
                        if (proxyRes.headers &&
                                proxyRes.headers['content-type'] &&
                                proxyRes.headers['content-type'].match('application/javascript') &&
                                !request.url.includes('/karma.js') &&
                                !request.url.includes('/node_modules/') &&
                                !request.url.includes('/socket.io/')) {
                            const end = response.end;
                            const chunks = [];
                            const write = response.write;

                            response.end = () => {
                                write.call(response, chunks.join('').replace(/localhost/g, '10.0.2.2'));

                                end.call(response);
                            };

                            response.write = (chunk) => {
                                if (chunk !== null) {
                                    chunks.push(chunk.toString());
                                }
                            };
                        }
                    });

                    proxyServer = http
                        .createServer((req, res) => proxy.web(req, res))
                        .on('upgrade', (req, socket, head) => proxy.ws(req, socket, head))
                        .listen(8015);

                    return executeAndReturn(`VBoxManage guestcontrol {${ uuid }} --password Passw0rd! --username IEUser run --wait-stdout --exe C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -- powershell.exe Start-Process shell:AppsFolder\\Microsoft.MicrosoftEdge_8wekyb3d8bbwe!MicrosoftEdge ${ url.replace(/localhost:9876/, '10.0.2.2:8015') }`);
                })
                .catch((err) => log.error(err));
        });
}

VirtualBoxEdgeBrowser.prototype.name = 'VirtualBoxEdge';

VirtualBoxEdgeBrowser.$inject = [ 'args', 'baseBrowserDecorator', 'logger' ];

module.exports = {
    'launcher:VirtualBoxEdge': [ 'type', VirtualBoxEdgeBrowser ]
};
