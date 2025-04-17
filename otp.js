function base32ToBytes(base32) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (let char of base32.replace(/=+$/, '').toUpperCase()) {
      const val = alphabet.indexOf(char);
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }
  
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }
    return new Uint8Array(bytes);
  }
  
  async function generateHOTP(secret, counter) {
    const key = await crypto.subtle.importKey(
      'raw',
      base32ToBytes(secret),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
  
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(4, counter, false);
  
    const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, buffer));
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = (
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    ) % 1000000;
  
    return code.toString().padStart(6, '0');
  }
  
  export async function generateTOTP(secret) {
    const time = Math.floor(Date.now() / 1000 / 30);
    return generateHOTP(secret, time);
  }
  