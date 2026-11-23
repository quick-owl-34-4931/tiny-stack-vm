import { mkdirSync as mk, readdirSync as rd, readFileSync as rf, writeFileSync as wf } from 'node:fs';
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input', O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
// op table: hex opcode, imm bytes, pops, pushes
const K = new Int8Array(256).fill(-1), P = new Int8Array(256), U = new Int8Array(256);
for (const e of '00000 01101 02401 03010 04012 05022 06023 07033 10021 11021 12021 13021 14021 15021 16021 17011 18021 19021 1a021 1b011 1c021 1d021 1e021 20021 21021 22021 30200 31210 32210 33200 34000 40011 41020 50010 51010 52001 53010'.split(' ')) {
  const o = parseInt(e.slice(0, 2), 16);
  K[o] = +e[2]; P[o] = +e[3]; U[o] = +e[4];
}
const run = (p: Uint8Array, inp: Uint8Array): [Uint8Array, number] => {
  const n = p.length, D = new Int32Array(257), C = new Int32Array(64), M = new Int32Array(256), out = new Uint8Array(65536);
  let sp = 0, cs = 0, ol = 0, ip = 0, pc = 0, st = 0;
  const R = (c: number): [Uint8Array, number] => [out.subarray(0, ol), c];
  for (;;) {
    if (st == 1e6) return R(10);
    if (pc < 0 || pc >= n) return R(9);
    const o = p[pc], k = K[o];
    if (k < 0) return R(5);
    if (pc + k >= n) return R(9);
    st++;
    const nx = pc + 1 + k;
    if (sp < P[o]) return R(2);
    if (sp - P[o] + U[o] > 256) return R(3);
    pc = nx;
    const b = D[sp - 1], a = D[sp - 2];
    let r = 0;
    switch (o) {
      case 0: return R(0);
      case 1: D[sp++] = p[pc - 1] << 24 >> 24; continue;
      case 2: D[sp++] = p[pc - 4] | p[pc - 3] << 8 | p[pc - 2] << 16 | p[pc - 1] << 24; continue;
      case 3: sp--; continue;
      case 4: D[sp++] = b; continue;
      case 5: D[sp - 1] = a; D[sp - 2] = b; continue;
      case 6: D[sp++] = a; continue;
      case 7: r = D[sp - 3]; D[sp - 3] = a; D[sp - 2] = b; D[sp - 1] = r; continue;
      case 0x17: D[sp - 1] = -b | 0; continue;
      case 0x1b: D[sp - 1] = ~b; continue;
      case 0x10: r = a + b | 0; break;
      case 0x11: r = a - b | 0; break;
      case 0x12: r = Math.imul(a, b); break;
      case 0x13: if (!b) return R(4); r = b == -1 ? -a | 0 : a / b | 0; break;
      case 0x14: if (!b) return R(4); r = b == -1 ? 0 : a % b | 0; break;
      case 0x15: if (!b) return R(4); r = (a >>> 0) / (b >>> 0) | 0; break;
      case 0x16: if (!b) return R(4); r = (a >>> 0) % (b >>> 0) | 0; break;
      case 0x18: r = a & b; break;
      case 0x19: r = a | b; break;
      case 0x1a: r = a ^ b; break;
      case 0x1c: r = a << b; break;
      case 0x1d: r = a >> b; break;
      case 0x1e: r = a >>> b | 0; break;
      case 0x20: r = +(a == b); break;
      case 0x21: r = +(a < b); break;
      case 0x22: r = +(a >>> 0 < b >>> 0); break;
      case 0x30: case 0x31: case 0x32:
        if (o == 0x30 || (o == 0x31) == !D[--sp]) pc += (p[pc - 2] | p[pc - 1] << 8) << 16 >> 16;
        continue;
      case 0x33: if (cs == 64) return R(7); C[cs++] = pc; pc = p[pc - 2] | p[pc - 1] << 8; continue;
      case 0x34: if (!cs) return R(8); pc = C[--cs]; continue;
      case 0x40: if (b < 0 || b > 255) return R(6); D[sp - 1] = M[b]; continue;
      case 0x41: if (b < 0 || b > 255) return R(6); M[b] = a; sp -= 2; continue;
      case 0x50: {
        const s = '' + b;
        if (ol + s.length > 65536) return R(11);
        for (let i = 0; i < s.length; i++) out[ol++] = s.charCodeAt(i);
        sp--; continue;
      }
      case 0x51: if (ol >= 65536) return R(11); out[ol++] = b; sp--; continue;
      case 0x52: D[sp++] = ip < inp.length ? inp[ip++] : -1; continue;
      case 0x53: return R(b & 255);
    }
    D[--sp - 1] = r;
  }
};
for (const id of rd(I).sort()) {
  const [s, c] = run(rf(`${I}/${id}/program.bin`), rf(`${I}/${id}/input.bin`));
  mk(`${O}/${id}`, { recursive: true });
  wf(`${O}/${id}/stdout.bin`, s);
  wf(`${O}/${id}/exit.txt`, c + '\n');
}
