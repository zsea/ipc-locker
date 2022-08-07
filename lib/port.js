/**
 * 通过端口实现加锁
 * 
 */
const net = require("net")
    , sleep = require("./sleep")
    ;
function portLock(port, host) {
    return new Promise(function (resolve, reject) {
        let server = net.createServer(), nextSockId = 0, sockets = {};
        server.addListener("error", async function (e) {
            //resolve()
            resolve();
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
        server.listen(port, host || "127.0.0.1", async function () {

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
    })
}
/**
 * 
 * @param {*} options 端口锁选项
 * @param {*} options.port - 通过指定的端口进行加锁，默认为：3721
 * @param {*} options.host - 端口锁使用的IP地址，默认为：127.0.0.1
 * @param {*} options.interval - 端口锁轮询检查的时间，默认为：100ms
 * @param {*} options.timeout - 超时时间，默认为0，表示永不超时
 * @returns 
 */
async function lock(options) {
    options = options || {};
    if (!options.port) options.port = 3721;
    if (!options.host) options.host = '127.0.0.1';
    if (!options.interval) options.interval = 100;
    if (!options.timeout) options.timeout = 0;
    let next=true;
    if(options.timeout){
        setTimeout(function(){
            next=false;
        },options.timeout);
    }
    while (next) {
        let unlock = await portLock(options.port, options.host);
        if (unlock) return unlock;
        await sleep(options.interval);
    }
    throw new Error("acquire lock timeout:" + options.timeout + "ms");
}
module.exports=lock;
