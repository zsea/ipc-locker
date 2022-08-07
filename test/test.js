const lock=require("../lib/index")
    ,sleep=require("../lib/sleep")
;
process.on('uncaughtException', function (err) { 
    //打印出错误 
    console.log(err); 
    //打印出错误的调用栈方便调试 
    console.log(err.stack);
});
(async function () {
    //await fs.unlink("c:\\a.txt");
    let unlock = await lock("xx", { timeout: 15000 });
    console.log(unlock);
    await sleep(10 * 1000);
    console.log("开始释放");
    await unlock();
    console.log("释放成功");
})();
