const fs = require('fs');
const lines = fs.readFileSync('node_modules/@google/genai/dist/genai.d.ts','utf8').split('\n');
const start = lines.findIndex(l => l.includes('interface LiveSendRealtimeInputParameters'));
if (start !== -1) {
  let end = lines.findIndex((l, i) => i > start && l.trim() === '}');
  console.log(lines.slice(start, end + 1).join('\n'));
} else {
  console.log("NOT FOUND");
}
