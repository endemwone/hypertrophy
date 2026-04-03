// Base64 encoding/decoding for data portability
// Uses a custom implementation since atob/btoa may not be available in RN

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

export function encodeBase64(input: string): string {
  let output = '';
  for (let i = 0; i < input.length; i += 3) {
    const a = input.charCodeAt(i);
    const b = i + 1 < input.length ? input.charCodeAt(i + 1) : NaN;
    const c = i + 2 < input.length ? input.charCodeAt(i + 2) : NaN;

    const enc1 = a >> 2;
    const enc2 = ((a & 3) << 4) | (isNaN(b) ? 0 : b >> 4);
    const enc3 = isNaN(b) ? 64 : ((b & 15) << 2) | (isNaN(c) ? 0 : c >> 6);
    const enc4 = isNaN(c) ? 64 : c & 63;

    output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
  }
  return output;
}

export function decodeBase64(input: string): string {
  let output = '';
  const str = input.replace(/[^A-Za-z0-9+/=]/g, '');

  for (let i = 0; i < str.length; i += 4) {
    const enc1 = chars.indexOf(str.charAt(i));
    const enc2 = chars.indexOf(str.charAt(i + 1));
    const enc3 = chars.indexOf(str.charAt(i + 2));
    const enc4 = chars.indexOf(str.charAt(i + 3));

    const a = (enc1 << 2) | (enc2 >> 4);
    const b = ((enc2 & 15) << 4) | (enc3 >> 2);
    const c = ((enc3 & 3) << 6) | enc4;

    output += String.fromCharCode(a);
    if (enc3 !== 64) output += String.fromCharCode(b);
    if (enc4 !== 64) output += String.fromCharCode(c);
  }
  return output;
}
