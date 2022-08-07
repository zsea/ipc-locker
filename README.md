基于ipc实现的本地锁，在windows下使用匿名管理实现，Linux下使用unix domain socket实现。

# 安装

```
npm install --save @zsea\ipc-locker
```

# 使用

```
const lock=require("@zsea\ipc-locker");
let unlock=await lock("xxx");//申请锁
//其它操作
unlock();//释放锁
```

# 参数说明

lock有两个参数，描述如下：

|名称|类型|默认值|描述|
|---|---|---|---|
|name|string| | 锁的名称，必填|
|options|object| |选项|
|options.path|string|./.ipcLocker|锁的路径，在Linux系统下使用|
|options.timeout|int|0| 获取锁的超时时间，0表示永不超时|
|options.lockPort|int|3721|在Linux下，清除进程异常退出时遗留的sock文件时，使用port进行加锁|