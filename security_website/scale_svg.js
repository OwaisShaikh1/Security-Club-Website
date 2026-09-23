const scale = 30;
const dx = 537 - 12 * scale;
const dy = 537 - 12 * scale;

console.log(`Scale: ${scale}, dx: ${dx}, dy: ${dy}`);

const path1 = `M12 2 L20 5 v6 c0 5 -3.2 8.8 -8 11 c-4.8 -2.2 -8 -6 -8 -11 V5 L12 2 Z`;
const path2 = `m8.5 12 l2.2 2.2 l4.8 -5`;

function transform(path) {
  const parts = path.split(/(?=[MmLlVvCcZz])/);
  let curX = 0, curY = 0;
  let out = parts.map(part => {
    let cmd = part[0];
    let args = part.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (cmd === 'Z' || cmd === 'z') return 'Z';
    if (cmd === 'M' || cmd === 'L') {
      curX = args[0]; curY = args[1];
      return `${cmd} ${args[0]*scale + dx} ${args[1]*scale + dy}`;
    }
    if (cmd === 'm' || cmd === 'l') {
      curX += args[0]; curY += args[1];
      return `${cmd.toUpperCase()} ${curX*scale + dx} ${curY*scale + dy}`;
    }
    if (cmd === 'V') {
      curY = args[0];
      return `L ${curX*scale + dx} ${curY*scale + dy}`;
    }
    if (cmd === 'v') {
      curY += args[0];
      return `L ${curX*scale + dx} ${curY*scale + dy}`;
    }
    if (cmd === 'C') {
      curX = args[4]; curY = args[5];
      return `C ${args[0]*scale + dx} ${args[1]*scale + dy} ${args[2]*scale + dx} ${args[3]*scale + dy} ${args[4]*scale + dx} ${args[5]*scale + dy}`;
    }
    if (cmd === 'c') {
      let r = `C ${(curX+args[0])*scale + dx} ${(curY+args[1])*scale + dy} ${(curX+args[2])*scale + dx} ${(curY+args[3])*scale + dy} ${(curX+args[4])*scale + dx} ${(curY+args[5])*scale + dy}`;
      curX += args[4]; curY += args[5];
      return r;
    }
    return part;
  });
  return out.join(' ');
}

console.log('Path 1: ', transform(path1));
console.log('Path 2: ', transform(path2));
