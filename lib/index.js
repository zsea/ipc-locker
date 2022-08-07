const os = require('os')
    , net = require('net')
    , Path = require("path")
    , fs = require("fs").promises
    , portLock = require("./port")
    ;
/**
 * 创建一个IPC锁
 * @param {*} name - 锁的名称，必填
 * @param {*} options 
 * @param {*} options.path - 锁的路径，在Linux系统下使用，默认值为：当前模块所在目录下的./.ipcLocker
 * @param {*} options.lockPort - 在Linux下，清除进程异常退出时遗留的sock文件时，使用port进行加锁
 * @param {*} options.timeout - 获取锁的超时时间，默认：0，表示永不超时
 * @returns 
 */
async function lockMan(name, options) {
    if (!name) {
        throw new ReferenceError(`name must not null`);
    }
    options = options || {};
    if (!options.maxRetry) options.maxRetry = 0;
    if (!options.retryInterval) options.retryInterval = 10;
    if (!options.path) options.path = Path.join(__dirname, '..', ".ipcLocker");
    if (!options.lockPort) options.lockPort = 3721;
    if (!options.timeout) options.timeout = 0;
    //let path = null, isWin = false;
    //console.log(__dirname);
    if (os.platform() === 'win32') {
        let path = '\\\\?\\pipe\\ipcLocker\\' + name;
        //isWin = true;
        options.path = path;
        return Lock(options);
    }
    else {
        //创建目录
        await fs.mkdir(options.path, { recursive: true });
        let path = Path.join(options.path, name + '.lock');
        //isWin = false;
        options.path = path;
        return Lock(options);
    }
}

function canClearSock(path) {
    return new Promise(function (resolve) {
        const socket = new net.Socket();
        socket.on('error', (error) => {
            if (error.code === "ENOENT") {
                resolve(false);
            }
            else if (error.code === "ECONNREFUSED") {
                resolve(true);
            }
            else if(error.code==="ECONNRESET"){
                //console.log("发生错误 ECONNRESET on canClearSock");
                resolve(true);
            }
            else {
                reject(error);
            }

        });
        socket.on("end", function () {
            resolve(false);
        })
        socket.connect(path, function () {

        });
    })
}
async function clearSock(options) {
    let unlock = await portLock({ port: options.lockPort, timeout: options.timeout });
    if (!unlock) return;
    //判断文件是否可以清除
    let canClear = await canClearSock(options.path);
    if (canClear) {
        await fs.unlink(options.path);
    }
    unlock();
}
async function Lock(options) {
    while (true) {
        let unlock = await new Promise(function (resolve, reject) {
            let server = net.createServer(), nextSockId = 0, sockets = {};
            server.addListener("error", async function (e) {
                if (e.code === "EADDRINUSE") {
                    const socket = new net.Socket();
                    socket.on('error', (error) => {
                        if (error.code === "ENOENT") {
                            resolve();
                        }
                        else if (error.code === "ECONNREFUSED") {
                            //Linux下sock文件存在，但不能连接
                            clearSock(options).finally(function () {
                                resolve();
                            });

                        }
                        else if(error.code==="ECONNRESET"){
                            //console.log("发生错误 ECONNRESET on Lock");
                            resolve();
                        }
                        else {
                            reject(error);
                        }

                    });
                    socket.on("end", function () {
                        resolve();
                    })
                    socket.connect(options.path, function () {
                        if (options.timeout) {
                            setTimeout(function () {
                                reject(new Error("acquire lock timeout:" + options.timeout + "ms"));
                            }, options.timeout);
                        }
                    });
                } else {
                    reject(e);
                }
            });
            server.addListener("connection", function (socket) {
                socket.id = nextSockId;
                if (nextSockId === 9007199254740992) {
                    nextSockId = 0;
                }
                else {
                    nextSockId++;
                }
                sockets[socket.id] = socket;
                //console.log("连接成功，",socket.id);
                socket.addListener("end", function () {
                    delete sockets[socket.id];
                });
                socket.addListener("close", function () {
                    delete sockets[socket.id];
                })
            });
            server.listen(options.path, async function () {

                resolve(function () {
                    for (let id in sockets) {
                        let socket = sockets[id];
                        if (socket) {
                            socket.destroy();
                        }
                    }
                    return new Promise(function (_resolve, _reject) {
                        server.close(function (err) {
                            if (err) {
                                _reject(err);
                            }
                            else {
                                _resolve();
                            }
                        });
                    });
                });
            })
        });
        if (unlock) return unlock;
    }
}

module.exports = lockMan;