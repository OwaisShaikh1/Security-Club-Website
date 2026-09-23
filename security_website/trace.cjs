const potrace = require('potrace');
const fs = require('fs');
const path = './src/assets/data/Security Club Logo.png';

potrace.trace(path, function(err, svg) {
  if (err) throw err;
  fs.writeFileSync('./trace.svg', svg);
  console.log('SVG written to trace.svg');
});
