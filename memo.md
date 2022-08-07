ENOENT:socket文件不存在，Windows下管道不存在
ECONNREFUSED:socket文件存在，但连接被拒绝，该情况下需要清除文件，要启用单进程锁
ECONNRESET:连接被重置，是由于服务端终止连接所引起（sock文件会被清除），需在客户端进行处理，