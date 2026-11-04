/**
 * Lightweight, zero-dependency multipart/form-data parser for Node.js
 */
function parseMultipart(buffer, boundary) {
  const boundaryBuffer = Buffer.from('--' + boundary);
  const parts = [];
  let start = 0;

  while (start < buffer.length) {
    const idx = buffer.indexOf(boundaryBuffer, start);
    if (idx === -1) break;

    if (start > 0) {
      let partBuf = buffer.subarray(start, idx);
      // Strip trailing CRLF before next boundary
      if (partBuf.length >= 2 && partBuf[partBuf.length - 2] === 13 && partBuf[partBuf.length - 1] === 10) {
        partBuf = partBuf.subarray(0, partBuf.length - 2);
      }
      parts.push(partBuf);
    }

    start = idx + boundaryBuffer.length;
    // Check for trailing -- (end of parts)
    if (buffer[start] === 45 && buffer[start + 1] === 45) {
      break;
    }
    // Skip CRLF
    if (buffer[start] === 13 && buffer[start + 1] === 10) {
      start += 2;
    }
  }

  const result = { fields: {}, files: {} };
  const headerDelimiter = Buffer.from('\r\n\r\n');

  for (const part of parts) {
    const headerEnd = part.indexOf(headerDelimiter);
    if (headerEnd === -1) continue;

    const headerStr = part.subarray(0, headerEnd).toString('utf8');
    const body = part.subarray(headerEnd + 4);

    const nameMatch = headerStr.match(/name="([^"]+)"/i);
    if (!nameMatch) continue;
    const name = nameMatch[1];

    const filenameMatch = headerStr.match(/filename="([^"]*)"/i);
    if (filenameMatch) {
      const typeMatch = headerStr.match(/content-type:\s*([^\r\n]+)/i);
      result.files[name] = {
        filename: filenameMatch[1],
        contentType: typeMatch ? typeMatch[1].trim() : 'application/octet-stream',
        data: body,
        size: body.length
      };
    } else {
      result.fields[name] = body.toString('utf8');
    }
  }

  return result;
}

module.exports = { parseMultipart };
