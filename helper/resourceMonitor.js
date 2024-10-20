const os = require('os');
const { exec } = require('child_process');

const CPU_THRESHOLD = 80; // CPU usage percentage
const MEMORY_THRESHOLD = 80; // Memory usage percentage

function checkResourceUsage() {
    const cpuUsage = getCPUUsage();
    const memoryUsage = getMemoryUsage();

    console.log(`Current CPU Usage: ${cpuUsage}%`);
    console.log(`Current Memory Usage: ${memoryUsage}%`);

    if (cpuUsage > CPU_THRESHOLD) {
        console.warn('CPU usage is high! Restarting application...');
        restartApplication();
    }

    if (memoryUsage > MEMORY_THRESHOLD) {
        console.warn('Memory usage is high! Clearing memory cache...');
        clearMemoryCache();
    }
}

function getCPUUsage() {
    const cpus = os.cpus();
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTick = cpus.reduce((acc, cpu) => acc + Object.values(cpu.times).reduce((sum, val) => sum + val, 0), 0);
    
    return ((1 - totalIdle / totalTick) * 100).toFixed(2);
}

function getMemoryUsage() {
    const { freemem, totalmem } = os;
    return ((1 - freemem() / totalmem()) * 100).toFixed(2);
}

function restartApplication() {
    exec('pm2 restart logsense-backend', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error restarting app: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Error output: ${stderr}`);
            return;
        }
        console.log(`App restarted successfully: ${stdout}`);
    });
}

function clearMemoryCache() {
    if (global.gc) {
        console.log('Clearing memory...');
        global.gc();
    } else {
        console.warn('Garbage collection is not exposed. Run the app with --expose-gc');
    }
}

module.exports = {
    checkResourceUsage,
    restartApplication,
    clearMemoryCache
};