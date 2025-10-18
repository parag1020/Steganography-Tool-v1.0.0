const channelMap = { r: [0], g: [1], b: [2], rgb: [0, 1, 2], rgba: [0, 1, 2, 3] };

export function calcCapacityBytes(width, height, channel = "rgb", bits = 1) {
  const channels = channelMap[channel]?.length ?? 3;
  return Math.floor((width * height * channels * bits) / 8);
}

function bytesToBits(bytes) {
  const bits = [];
  for (const b of bytes) {
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  }
  return bits;
}

function bitsToBytes(bits) {
  const out = new Uint8Array(Math.ceil(bits.length / 8));
  for (let i = 0; i < out.length; i++) {
    let v = 0;
    for (let j = 0; j < 8; j++) {
      const k = i * 8 + j;
      v = (v << 1) | (k < bits.length ? bits[k] : 0);
    }
    out[i] = v;
  }
  return out;
}

export async function aesEncrypt(dataBytes, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 200000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, dataBytes));
  return { ciphertext, salt, nonce };
}

export async function aesDecrypt(ciphertext, password, salt, nonce) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 200000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, ciphertext));
  return plain;
}

const MAGIC = new TextEncoder().encode("STEGOLSB");
const VERSION = 1;
const channelCodes = { r: 0, g: 1, b: 2, rgb: 3, rgba: 4 };
const reverseCodes = { 0: "r", 1: "g", 2: "b", 3: "rgb", 4: "rgba" };

function buildHeader({ bits, channel, encrypted, payloadType, payloadLen, filename = "", salt, nonce }) {
  const chCode = channelCodes[channel] ?? 3;
  const filenameBytes = new TextEncoder().encode(filename);
  
  // Calculate header length (after the header_len field)
  let headerLen = 1 + 1 + 1 + 1 + 2 + 8 + filenameBytes.length; // bits + channels + encrypted + payloadType + filenameLen + payloadLen + filename
  if (encrypted) {
    headerLen += 1 + salt.length + 1 + nonce.length; // saltLen + salt + nonceLen + nonce
  }
  
  const header = [];
  header.push(...MAGIC); // 8 bytes
  header.push(VERSION); // 1 byte
  
  // Header length (4 bytes, big-endian)
  const headerLenBytes = new Uint8Array(4);
  new DataView(headerLenBytes.buffer).setUint32(0, headerLen, false);
  header.push(...headerLenBytes);
  
  // Core header fields
  header.push(bits); // 1 byte
  header.push(chCode); // 1 byte
  header.push(encrypted ? 1 : 0); // 1 byte
  header.push(payloadType); // 1 byte
  
  // Filename length (2 bytes, big-endian)
  const filenameLenBytes = new Uint8Array(2);
  new DataView(filenameLenBytes.buffer).setUint16(0, filenameBytes.length, false);
  header.push(...filenameLenBytes);
  
  // Payload length (8 bytes, big-endian)
  const payloadLenBytes = new Uint8Array(8);
  new DataView(payloadLenBytes.buffer).setBigUint64(0, BigInt(payloadLen), false);
  header.push(...payloadLenBytes);
  
  // Filename
  header.push(...filenameBytes);
  
  // Encryption fields
  if (encrypted) {
    header.push(salt.length); // 1 byte
    header.push(...salt);
    header.push(nonce.length); // 1 byte
    header.push(...nonce);
  }
  
  return new Uint8Array(header);
}

function parseHeader(bytes) {
  console.log("🔍 parseHeader: Starting header parsing...");
  console.log("📊 parseHeader: Incoming bytes length:", bytes.length);
  console.log("🔤 parseHeader: First 16 bytes:", Array.from(bytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
  
  if (bytes.length < 8 + 1 + 4) {
    console.error("❌ parseHeader: Header too small. Need at least 13 bytes, got:", bytes.length);
    throw new Error("Header too small");
  }
  
  // Check magic (8 bytes)
  console.log("🔍 parseHeader: Checking magic string...");
  console.log("📝 parseHeader: Expected MAGIC:", Array.from(MAGIC).map(b => b.toString(16).padStart(2, '0')).join(' '));
  console.log("📝 parseHeader: Actual first 8 bytes:", Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' '));
  
  for (let i = 0; i < MAGIC.length; i++) {
    if (bytes[i] !== MAGIC[i]) {
      console.error(`❌ parseHeader: Magic mismatch at index ${i}. Expected: ${MAGIC[i]} (0x${MAGIC[i].toString(16)}), Got: ${bytes[i]} (0x${bytes[i].toString(16)})`);
      throw new Error("Magic not found");
    }
  }
  console.log("✅ parseHeader: Magic string found!");
  
  // Check version (1 byte)
  const version = bytes[8];
  console.log("🔍 parseHeader: Checking version...");
  console.log("📝 parseHeader: Expected version:", VERSION, "Got:", version);
  if (version !== VERSION) {
    console.error("❌ parseHeader: Version mismatch. Expected:", VERSION, "Got:", version);
    throw new Error("Unsupported version");
  }
  console.log("✅ parseHeader: Version matches!");
  
  let idx = 9;
  
  // Header length (4 bytes, big-endian)
  const headerLen = new DataView(bytes.buffer, bytes.byteOffset + idx, 4).getUint32(0, false);
  idx += 4;
  console.log("📏 parseHeader: Header length:", headerLen);
  
  if (bytes.length < idx + headerLen) {
    console.error("❌ parseHeader: Header truncated. Need:", idx + headerLen, "bytes, got:", bytes.length);
    throw new Error("Header truncated");
  }
  
  // Core header fields
  const bits = bytes[idx++];
  const ch = bytes[idx++];
  const enc = bytes[idx++];
  const ptype = bytes[idx++];
  console.log("📋 parseHeader: Core fields - bits:", bits, "channel:", ch, "encrypted:", enc, "payloadType:", ptype);
  
  // Filename length (2 bytes, big-endian)
  const filenameLen = new DataView(bytes.buffer, bytes.byteOffset + idx, 2).getUint16(0, false);
  idx += 2;
  console.log("📁 parseHeader: Filename length:", filenameLen);
  
  // Payload length (8 bytes, big-endian)
  const payloadLen = Number(new DataView(bytes.buffer, bytes.byteOffset + idx, 8).getBigUint64(0, false));
  idx += 8;
  console.log("📦 parseHeader: Payload length:", payloadLen);
  
  // Filename
  const filename = new TextDecoder().decode(bytes.slice(idx, idx + filenameLen));
  idx += filenameLen;
  console.log("📁 parseHeader: Filename:", filename);
  
  let salt = null, nonce = null;
  if (enc === 1) {
    console.log("🔐 parseHeader: Processing encryption fields...");
    const sl = bytes[idx++];
    salt = bytes.slice(idx, idx + sl);
    idx += sl;
    const nl = bytes[idx++];
    nonce = bytes.slice(idx, idx + nl);
    idx += nl;
    console.log("🔐 parseHeader: Salt length:", sl, "Nonce length:", nl);
  }
  
  console.log("✅ parseHeader: Header parsing complete!");
  console.log("📊 parseHeader: Final header size:", idx);
  
  return { 
    headerSize: idx, 
    bits, 
    channel: reverseCodes[ch] ?? "rgb", 
    encrypted: enc === 1, 
    payloadType: ptype, 
    payloadLen, 
    filename,
    salt, 
    nonce 
  };
}

export async function embedIntoImage({ image, payloadBytes, bits = 1, channel = "rgb", encrypt = false, password = "", filename = "", isText = false }) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  let bytes = payloadBytes, salt = null, nonce = null, encrypted = false;
  if (encrypt && password) {
    const enc = await aesEncrypt(bytes, password);
    bytes = enc.ciphertext; salt = enc.salt; nonce = enc.nonce; encrypted = true;
  }

  const header = buildHeader({ bits, channel, encrypted, payloadType: isText ? 0 : 1, payloadLen: bytes.length, filename, salt: salt ?? new Uint8Array(), nonce: nonce ?? new Uint8Array() });
  const total = new Uint8Array(header.length + bytes.length);
  total.set(header, 0); total.set(bytes, header.length);
  const bitsArr = bytesToBits(total);

  const channels = channelMap[channel] ?? [0, 1, 2];
  const mask = 0xFF ^ ((1 << bits) - 1);

  let bi = 0;
  for (let i = 0; i < data.length && bi < bitsArr.length; i += 4) {
    for (const ci of channels) {
      let v = 0;
      for (let k = 0; k < bits; k++) v = (v << 1) | (bi < bitsArr.length ? bitsArr[bi++] : 0);
      data[i + ci] = (data[i + ci] & mask) | v;
      if (bi >= bitsArr.length) break;
    }
  }
  if (bi < bitsArr.length) throw new Error("Insufficient capacity for payload + header");
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

export async function extractFromImage({ image, forcedBits = null, forcedChannel = null, password = "" }) {
  console.log("🚀 extractFromImage: Starting extraction...");
  console.log("🖼️ extractFromImage: Image dimensions:", image.width, "x", image.height);
  
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  
  console.log("📊 extractFromImage: Image data length:", data.length);
  console.log("🔍 extractFromImage: Forced parameters - bits:", forcedBits, "channel:", forcedChannel);

  const tryRead = (bits, channel, maxBytes = 1024 * 1024) => {
    const channels = channelMap[channel];
    const outBits = [];
    const maxBits = maxBytes * 8;
    for (let i = 0; i < data.length && outBits.length < maxBits; i += 4) {
      for (const ci of channels) {
        if (outBits.length >= maxBits) break;
        const val = data[i + ci] & ((1 << bits) - 1);
        for (let b = bits - 1; b >= 0; b--) {
          if (outBits.length >= maxBits) break;
          outBits.push((val >> b) & 1);
        }
      }
    }
    return bitsToBytes(outBits);
  };

  let params = null;
  if (forcedBits && forcedChannel) {
    console.log("🔧 extractFromImage: Using forced parameters");
    const bytes = tryRead(forcedBits, forcedChannel);
    console.log("📦 extractFromImage: Read", bytes.length, "bytes with forced params");
    const hdr = parseHeader(bytes);
    params = { ...hdr, bits: forcedBits, channel: forcedChannel, raw: bytes };
  } else {
    console.log("🔍 extractFromImage: Auto-detecting parameters...");
    for (const ch of ["rgb", "rgba", "r", "g", "b"]) {
      console.log("🔍 extractFromImage: Trying channel:", ch);
      for (const b of [1, 2, 3, 4]) {
        console.log("🔍 extractFromImage: Trying bits:", b, "channel:", ch);
        try {
          const bytes = tryRead(b, ch);
          console.log("📦 extractFromImage: Read", bytes.length, "bytes");
          const hdr = parseHeader(bytes);
          console.log("✅ extractFromImage: Found valid header!");
          params = { ...hdr, bits: b, channel: ch, raw: bytes };
          break;
        } catch (error) {
          console.log("❌ extractFromImage: Failed with bits:", b, "channel:", ch, "Error:", error.message);
        }
      }
      if (params) break;
    }
  }
  if (!params) {
    console.error("❌ extractFromImage: No valid parameters found!");
    throw new Error("Unable to detect parameters or header not found");
  }
  const total = params.headerSize + params.payloadLen;
  const payloadFull = params.raw.slice(0, total);
  const payload = payloadFull.slice(params.headerSize, params.headerSize + params.payloadLen);
  if (params.encrypted) {
    if (!password) throw new Error("Password required for decryption");
    const plain = await aesDecrypt(payload, password, params.salt, params.nonce);
    return { payload: plain, header: params };
  }
  return { payload, header: params };
}



