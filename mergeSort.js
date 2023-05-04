const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const NUM_ELEMENTS = 1000000;
const numWorkers = 6;
// const numWorkers = require('os').cpus().length;

function merge(left, right) {
    let i = 0;
    let j = 0;
    const result = [];

    while (i < left.length && j < right.length) {
        if (left[i] < right[j]) {
            result.push(left[i++]);
        } else {
            result.push(right[j++]);
        }
    }
    return result.concat(left.slice(i)).concat(right.slice(j));
}

function mergeSort(array) {
    if (array.length === 1) {
        return array;
    }
    const middle = Math.floor(array.length / 2);
    const left = array.slice(0, middle);
    const right = array.slice(middle);
    return merge(mergeSort(left), mergeSort(right));
}

if (isMainThread) {
    const unsortedArray = Array.from({ length: NUM_ELEMENTS }, () => Math.floor(Math.random() * 100000));

    // Basic merge sort
    console.time('Basic merge sort');
    const sortedArray1 = mergeSort(unsortedArray);
    console.timeEnd('Basic merge sort');
    // console.log('Basic merge sort result:', sortedArray1);

    // Parallel merge sort
    console.time('Parallel merge sort');
    const segmentSize = Math.ceil(unsortedArray.length / numWorkers);
    const workers = [];

    for (let i = 0; i < numWorkers; i++) {
        const start = i * segmentSize;
        const end = Math.min((i + 1) * segmentSize, unsortedArray.length);
        const worker = new Worker(__filename, {
            workerData: {
                array: unsortedArray.slice(start, end),
            },
        });
        workers.push(worker);
    }

    let sortedArray2 = [];
    workers.forEach((worker) => {
        worker.on('message', (result) => {
            sortedArray2 = merge(sortedArray2, result);
            if (sortedArray2.length === unsortedArray.length) {
                console.timeEnd('Parallel merge sort');
                // console.log('Parallel merge sort result:', sortedArray2);
                console.log('Basic and parallel algorithms give the same result:', JSON.stringify(sortedArray1) === JSON.stringify(sortedArray2));
            }
        });
        worker.on('error', (err) => {
            throw err;
        });
        worker.on('exit', (code) => {
            if (code !== 0) {
                throw new Error(`Worker stopped with exit code ${code}`);
            }
        });
    });
} else {
    const { array } = workerData;
    const sortedArray = mergeSort(array);
    parentPort.postMessage(sortedArray);
}