import { createConnection, type Socket } from 'net';
import type { MinecraftServerStatus } from '../../../../shared/types/index.js';

function writeVarInt(value: number): Buffer {
  const bytes: number[] = [];
  while (true) {
    if ((value & ~0x7f) === 0) {
      bytes.push(value);
      break;
    }
    bytes.push((value & 0x7f) | 0x80);
    value >>>= 7;
  }
  return Buffer.from(bytes);
}

function readVarInt(buffer: Buffer, offset: number): { value: number; length: number } {
  let value = 0;
  let length = 0;
  let byte: number;
  do {
    byte = buffer[offset + length];
    value |= (byte & 0x7f) << (7 * length);
    length++;
  } while ((byte & 0x80) !== 0);
  return { value, length };
}

export async function queryMinecraftServer(
  host: string,
  port: number = 25565
): Promise<MinecraftServerStatus> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const socket: Socket = createConnection(port, host, () => {
      const hostBuf = Buffer.from(host, 'utf8');
      const portBuf = Buffer.alloc(2);
      portBuf.writeUInt16BE(port);

      const handshakeData = Buffer.concat([
        writeVarInt(-1),
        writeVarInt(hostBuf.length),
        hostBuf,
        portBuf,
        writeVarInt(1),
      ]);

      const handshakePacket = Buffer.concat([
        writeVarInt(handshakeData.length + 1),
        writeVarInt(0x00),
        handshakeData,
      ]);

      const statusRequest = Buffer.concat([writeVarInt(1), writeVarInt(0x00)]);

      socket.write(handshakePacket);
      socket.write(statusRequest);
    });

    let buffer = Buffer.alloc(0);
    socket.setTimeout(5000);

    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);

      try {
        const packetLength = readVarInt(buffer, 0);
        const totalLength = packetLength.value + packetLength.length;

        if (buffer.length >= totalLength) {
          let offset = packetLength.length;
          const packetId = readVarInt(buffer, offset);
          offset += packetId.length;
          const jsonLength = readVarInt(buffer, offset);
          offset += jsonLength.length;

          const json = buffer.subarray(offset, offset + jsonLength.value).toString('utf8');
          const status = JSON.parse(json);
          const latency = Date.now() - startTime;

          socket.destroy();
          resolve({
            online: true,
            host,
            port,
            motd: typeof status.description === 'string'
              ? status.description
              : status.description?.text || '',
            players: {
              online: status.players?.online ?? 0,
              max: status.players?.max ?? 0,
              list: (status.players?.sample || []).map((p: any) => p.name),
            },
            version: status.version?.name || 'Unknown',
            latency,
          });
        }
      } catch {
        // waiting for more data
      }
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        online: false,
        host,
        port,
        motd: '',
        players: { online: 0, max: 0, list: [] },
        version: '',
        latency: -1,
      });
    });

    socket.on('error', () => {
      socket.destroy();
      resolve({
        online: false,
        host,
        port,
        motd: '',
        players: { online: 0, max: 0, list: [] },
        version: '',
        latency: -1,
      });
    });
  });
}
