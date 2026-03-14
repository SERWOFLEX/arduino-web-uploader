const MESSAGE_START = 0x1B;
const TOKEN = 0x0E;

const CMD_SIGN_ON = 0x01;
const CMD_LOAD_ADDRESS = 0x06;
const CMD_PROGRAM_FLASH_ISP = 0x13;

function checksum(buf) {
    let cs = 0;
    for (let b of buf) cs ^= b;
    return cs;
}

function buildMessage(seq, data) {

    const size = data.length;

    let msg = [
        MESSAGE_START,
        seq,
        (size >> 8) & 0xFF,
        size & 0xFF,
        TOKEN,
        ...data
    ];

    msg.push(checksum(msg));

    return new Uint8Array(msg);
}

async function sendCommand(port, seq, data) {

    const writer = port.writable.getWriter();
    const reader = port.readable.getReader();

    const msg = buildMessage(seq, data);

    await writer.write(msg);

    const { value } = await reader.read();

    writer.releaseLock();
    reader.releaseLock();

    return value;
}

async function signOn(port) {

    const response = await sendCommand(port, 1, [CMD_SIGN_ON]);

    console.log("SIGN_ON response:", response);
}

async function loadAddress(port, address) {

    const a0 = address & 0xFF;
    const a1 = (address >> 8) & 0xFF;
    const a2 = (address >> 16) & 0xFF;
    const a3 = (address >> 24) & 0xFF;

    await sendCommand(port, 2, [
        CMD_LOAD_ADDRESS,
        a3, a2, a1, a0
    ]);
}

async function programPage(port, data) {

    const size = data.length;

    const payload = [
        CMD_PROGRAM_FLASH_ISP,
        (size >> 8) & 0xFF,
        size & 0xFF,
        0xC1,
        0x0A,
        0x40,
        0x4C,
        0x20,
        ...data
    ];

    await sendCommand(port, 3, payload);
}

async function uploadMega {

    const port = await navigator.serial.requestPort();

    await port.open({ baudRate: 115200 });

    await port.setSignals({ dataTerminalReady: false });
    await new Promise(r => setTimeout(r, 50));
    await port.setSignals({ dataTerminalReady: true });

    await signOn(port);

    let pageSize = 256;

    let address = 0;

    for (let i = 0; i < hexBytes.length; i += pageSize) {

        let page = hexBytes.slice(i, i + pageSize);

        await loadAddress(port, address);

        await programPage(port, page);

        address += pageSize / 2;
    }
window.uploadMega = uploadMega;
    console.log("UPLOAD COMPLETE");

    await port.close();
}
