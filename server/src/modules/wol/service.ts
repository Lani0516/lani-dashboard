import { createSocket } from 'dgram';

export function sendWOL(mac: string, broadcastAddress: string = '255.255.255.255'): Promise<void> {
  return new Promise((resolve, reject) => {
    const macBytes = Buffer.from(mac.replace(/[:-]/g, ''), 'hex');
    const magicPacket = Buffer.alloc(102);

    for (let i = 0; i < 6; i++) magicPacket[i] = 0xff;
    for (let i = 0; i < 16; i++) macBytes.copy(magicPacket, 6 + i * 6);

    const socket = createSocket('udp4');
    socket.once('error', (err) => {
      socket.close();
      reject(err);
    });

    socket.bind(() => {
      socket.setBroadcast(true);
      socket.send(magicPacket, 0, magicPacket.length, 9, broadcastAddress, (err) => {
        socket.close();
        if (err) reject(err);
        else resolve();
      });
    });
  });
}
