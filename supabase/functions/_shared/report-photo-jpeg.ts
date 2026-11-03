/**
 * A strict JPEG container filter, not an image decoder.
 * Keep only baseline/progressive image coding segments and scan bytes. Drop ALL
 * APP segments, comments, thumbnails and trailing bytes, including EXIF/XMP/ICC.
 * The normal client first decodes/orients/resizes to fresh JPEG pixels; this
 * server boundary also protects against clients skipping that preparation.
 */
export function sanitizeReportJpeg(input: Uint8Array): Uint8Array {
  const invalid = () => new Error("Unsupported or invalid JPEG");
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) throw invalid();
  const parts: Uint8Array[] = [input.subarray(0, 2)];
  let offset = 2;
  let frame = false;
  let scan = false;
  while (offset < input.length) {
    const markerStart = offset;
    if (input[offset++] !== 0xff) throw invalid();
    while (input[offset] === 0xff) offset++;
    const marker = input[offset++];
    if (marker === undefined) throw invalid();
    if (marker === 0xd9) {
      if (!frame || !scan) throw invalid();
      parts.push(new Uint8Array([0xff, 0xd9]));
      const result = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
      let cursor = 0;
      for (const part of parts) {
        result.set(part, cursor);
        cursor += part.length;
      }
      return result;
    }
    if (offset + 2 > input.length) throw invalid();
    const length = (input[offset]! << 8) | input[offset + 1]!;
    const end = offset + length;
    if (length < 2 || end > input.length) throw invalid();
    if (marker === 0xc0 || marker === 0xc2) {
      if (frame || length < 8 || input[offset + 2] !== 8) throw invalid();
      const height = (input[offset + 3]! << 8) | input[offset + 4]!;
      const width = (input[offset + 5]! << 8) | input[offset + 6]!;
      const components = input[offset + 7];
      if (
        !width ||
        !height ||
        width > 4096 ||
        height > 4096 ||
        width * height > 16_000_000 ||
        (components !== 1 && components !== 3) ||
        length !== 8 + 3 * components
      )
        throw invalid();
      frame = true;
    } else if (marker === 0xda) {
      if (!frame || length < 6) throw invalid();
      const components = input[offset + 2]!;
      if (components < 1 || components > 3 || length !== 6 + 2 * components) throw invalid();
      scan = true;
    } else if (marker === 0xdd) {
      if (length !== 4) throw invalid();
    } else if (
      marker !== 0xdb &&
      marker !== 0xc4 &&
      marker !== 0xfe &&
      !(marker >= 0xe0 && marker <= 0xef)
    ) {
      // Fail closed for arithmetic/lossless/extension markers and unknown data.
      throw invalid();
    }
    if (marker !== 0xfe && !(marker >= 0xe0 && marker <= 0xef)) {
      parts.push(input.subarray(markerStart, end));
    }
    offset = end;
    if (marker === 0xda) {
      const entropyStart = offset;
      let boundary = false;
      while (offset < input.length) {
        if (input[offset] !== 0xff) {
          offset++;
          continue;
        }
        const candidate = offset;
        while (input[offset] === 0xff) offset++;
        const next = input[offset];
        if (next === undefined) throw invalid();
        if (next === 0 || (next >= 0xd0 && next <= 0xd7)) {
          offset++;
          continue;
        }
        parts.push(input.subarray(entropyStart, candidate));
        offset = candidate;
        boundary = true;
        break;
      }
      if (!boundary) throw invalid();
    }
  }
  throw invalid();
}
