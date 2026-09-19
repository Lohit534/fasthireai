function parseSSE(chunks) {
  let buffer = '';
  for (const chunk of chunks) {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        console.log("Parsing:", line.slice(6));
        const data = JSON.parse(line.slice(6));
        console.log("Parsed data:", data);
      } catch (e) {
        console.error("Error:", e.message);
      }
    }
  }
}

parseSSE([
  'data: {"st',
  'ep": 1}\n\n'
]);
