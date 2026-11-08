// Copyright (c) 2026 Jonathan Taylor (visionik)
//
// This file is part of SABAL (Scott Adams Brass-lamp Adventure Library).
// SPDX-License-Identifier: MIT
// Licensed under the MIT License. See LICENSE in the project root.

// Pictures from Return to Pirate's Isle, a TI-99/4A cartridge.
//
// The cartridge draws its pictures with its own machine code: tiles from a set
// of 52, rotated and combined, written cell by cell into the video chip's
// bitmap mode, then coloured. Rather than re-implement that, SABAL runs the
// cartridge's drawing routine on a small TMS9900 emulator (written here) and
// reads the picture out of video memory. The cartridge's code and pictures come
// from the player's own ROM files; none are included.
//
// The ROM holds a table of each room's picture address in the GROM, at >6012;
// the drawing routine is at >79BE.

import type { Bitmap } from './bdp.js';

/** The TMS9918 video chip's colours; 0 (transparent) shows as black. */
export const TI_PALETTE: readonly (readonly [number, number, number])[] = [
  [0, 0, 0], [0, 0, 0], [33, 200, 66], [94, 220, 120], [84, 85, 237], [125, 118, 252], [212, 82, 77], [66, 235, 245],
  [252, 85, 84], [255, 121, 120], [212, 193, 84], [230, 206, 128], [33, 176, 59], [201, 91, 186], [204, 204, 204], [255, 255, 255],
];

const DRAW = 0x79be;
const TABLE = 0x6012;
const MAX_STEPS = 3_000_000;

class Stop extends Error {}

/** Just enough of a TI-99/4A to run the cartridge's picture routine. */
class Machine {
  readonly vdp = new Uint8Array(0x4000);
  private readonly ram = new Uint8Array(256);
  private vaddr = 0;
  private vlatch: number | undefined;
  private gaddr = 0;
  private glatch: number | undefined;
  wp = 0x83e0;
  pc = 0;
  private st = 0;
  private steps = 0;

  constructor(
    private readonly rom: Uint8Array,
    private readonly grom: Uint8Array,
  ) {}

  rb(a: number): number {
    a &= 0xffff;
    if (a >= 0x6000 && a < 0x8000) return this.rom[a - 0x6000] ?? 0;
    if (a >= 0x8000 && a < 0x8400) return this.ram[a & 0xff]!;
    if (a === 0x8800) {
      const v = this.vdp[this.vaddr]!;
      this.vaddr = (this.vaddr + 1) & 0x3fff;
      return v;
    }
    if (a === 0x9800) {
      const v = this.grom[this.gaddr - 0x6000] ?? 0;
      this.gaddr = (this.gaddr + 1) & 0xffff;
      return v;
    }
    if (a === 0x9802) return (this.gaddr >> 8) & 0xff;
    return 0;
  }

  wb(a: number, v: number): void {
    a &= 0xffff;
    v &= 0xff;
    if (a >= 0x8000 && a < 0x8400) this.ram[a & 0xff] = v;
    else if (a === 0x8c00) {
      this.vdp[this.vaddr] = v;
      this.vaddr = (this.vaddr + 1) & 0x3fff;
    } else if (a === 0x8c02) {
      if (this.vlatch === undefined) this.vlatch = v;
      else {
        if (!(v & 0x80)) this.vaddr = ((v & 0x3f) << 8) | this.vlatch; // register writes are ignored
        this.vlatch = undefined;
      }
    } else if (a === 0x9c02) {
      if (this.glatch === undefined) this.glatch = v;
      else {
        this.gaddr = (this.glatch << 8) | v;
        this.glatch = undefined;
      }
    }
  }

  rw(a: number): number {
    a &= 0xfffe;
    // The ports are byte-wide: a word read takes one byte.
    if (a === 0x8800 || a === 0x9800) return this.rb(a) << 8;
    return (this.rb(a) << 8) | this.rb(a + 1);
  }
  ww(a: number, v: number): void {
    a &= 0xfffe;
    this.wb(a, v >> 8);
    this.wb(a + 1, v & 0xff);
  }
  reg(n: number): number {
    return this.rw(this.wp + 2 * n);
  }
  setReg(n: number, v: number): void {
    this.ww(this.wp + 2 * n, v & 0xffff);
  }

  private ea(t: number, r: number, byte: boolean): number {
    if (t === 0) return this.wp + 2 * r;
    if (t === 1) return this.reg(r);
    if (t === 2) {
      const d = this.rw(this.pc);
      this.pc += 2;
      return (d + (r ? this.reg(r) : 0)) & 0xffff;
    }
    const a = this.reg(r);
    this.setReg(r, a + (byte ? 1 : 2));
    return a;
  }

  // Status: L> 0x8000... TMS9900 bits: L> A> EQ C OV OP
  private static readonly L = 0x8000;
  private static readonly A = 0x4000;
  private static readonly EQ = 0x2000;
  private static readonly C = 0x1000;
  private static readonly OV = 0x0800;
  private static readonly OP = 0x0400;

  private status(v: number, byte = false): void {
    const sign = byte ? 0x80 : 0x8000;
    let st = this.st & (Machine.C | Machine.OV);
    if (v) st |= Machine.L;
    if (v && !(v & sign)) st |= Machine.A;
    if (!v) st |= Machine.EQ;
    if (byte) {
      let bits = 0;
      for (let b = v; b; b >>= 1) bits += b & 1;
      if (bits & 1) st |= Machine.OP;
    }
    this.st = st;
  }
  private compare(a: number, b: number, byte = false): void {
    const sign = byte ? 0x80 : 0x8000;
    const size = byte ? 0x100 : 0x10000;
    let st = this.st & (Machine.C | Machine.OV);
    if (a > b) st |= Machine.L;
    const sa = a & sign ? a - size : a;
    const sb = b & sign ? b - size : b;
    if (sa > sb) st |= Machine.A;
    if (a === b) st |= Machine.EQ;
    this.st = st;
  }
  private carry(c: boolean): void {
    this.st = (this.st & ~Machine.C) | (c ? Machine.C : 0);
  }

  step(): void {
    if (++this.steps > MAX_STEPS) throw new Stop('too long');
    const at = this.pc;
    const op = this.rw(at);
    this.pc += 2;
    if (op >= 0x4000) return this.twoOperand(op);
    if (op >= 0x2000) return this.format3(op);
    if (op >= 0x1000) return this.jump(op);
    if (op >= 0x0c00) throw new Stop(`bad opcode ${op.toString(16)} at ${at.toString(16)}`);
    if (op >= 0x0800) return this.shift(op);
    if (op >= 0x0400) return this.single(op);
    if (op >= 0x0200) return this.immediate(op);
    throw new Stop(`bad opcode ${op.toString(16)} at ${at.toString(16)}`);
  }

  private twoOperand(op: number): void {
    const k = op >> 12;
    const byte = (k & 1) === 1;
    const sa = this.ea((op >> 4) & 3, op & 15, byte);
    const da = this.ea((op >> 10) & 3, (op >> 6) & 15, byte);
    const sv = byte ? this.rb(sa) : this.rw(sa);
    const dv = byte ? this.rb(da) : this.rw(da);
    const mask = byte ? 0xff : 0xffff;
    const put = (v: number) => (byte ? this.wb(da, v) : this.ww(da, v));
    switch (k & 0xe) {
      case 0xc: // MOV
        this.status(sv, byte);
        return put(sv);
      case 0x8: // C
        return this.compare(sv, dv, byte);
      case 0xa: {
        // A
        const r = sv + dv;
        this.carry(r > mask);
        this.status(r & mask, byte);
        return put(r & mask);
      }
      case 0x6: {
        // S
        const r = dv - sv;
        this.carry(r >= 0);
        this.status(r & mask, byte);
        return put(r & mask);
      }
      case 0xe: // SOC
        this.status(dv | sv, byte);
        return put(dv | sv);
      case 0x4: {
        // SZC
        const r = dv & ~sv & mask;
        this.status(r, byte);
        return put(r);
      }
    }
    throw new Stop('bad two-operand opcode');
  }

  private format3(op: number): void {
    const k = (op >> 10) & 15;
    const d = (op >> 6) & 15;
    if (k === 12 || k === 13) {
      this.ea((op >> 4) & 3, op & 15, d > 0 && d <= 8); // LDCR/STCR: no CRU devices here
      return;
    }
    if (k === 11) throw new Stop('XOP');
    const sv = this.rw(this.ea((op >> 4) & 3, op & 15, false));
    const dv = this.reg(d);
    if (k === 8) this.st = (this.st & ~Machine.EQ) | ((dv & sv) === sv ? Machine.EQ : 0);
    else if (k === 9) this.st = (this.st & ~Machine.EQ) | ((dv & sv) === 0 ? Machine.EQ : 0);
    else if (k === 10) {
      this.status(dv ^ sv);
      this.setReg(d, dv ^ sv);
    } else if (k === 14) {
      const r = sv * dv;
      this.setReg(d, Math.floor(r / 0x10000));
      this.setReg(d + 1, r & 0xffff);
    } else if (k === 15) {
      if (sv <= dv) {
        this.st |= Machine.OV;
        return;
      }
      const n = dv * 0x10000 + this.reg(d + 1);
      this.setReg(d, Math.floor(n / sv));
      this.setReg(d + 1, n % sv);
      this.st &= ~Machine.OV;
    }
  }

  private jump(op: number): void {
    const k = op >> 8;
    let disp = op & 0xff;
    if (disp > 127) disp -= 256;
    const st = this.st;
    const [L, A, EQ, C, OV, OP] = [Machine.L, Machine.A, Machine.EQ, Machine.C, Machine.OV, Machine.OP].map((b) => (st & b) !== 0);
    const take: Record<number, boolean> = {
      0x10: true,
      0x11: !A && !EQ,
      0x12: !L || EQ!,
      0x13: EQ!,
      0x14: L! || EQ!,
      0x15: A!,
      0x16: !EQ,
      0x17: !C,
      0x18: C!,
      0x19: !OV,
      0x1a: !L && !EQ,
      0x1b: L! && !EQ,
      0x1c: OP!,
    };
    if (take[k]) this.pc = (this.pc + 2 * disp) & 0xffff; // SBO/SBZ/TB fall through
  }

  private shift(op: number): void {
    const k = op >> 8;
    let count = (op >> 4) & 15;
    if (count === 0) count = this.reg(0) & 15 || 16;
    const w = op & 15;
    let v = this.reg(w);
    for (let i = 0; i < count; i++) {
      if (k === 8) {
        this.carry((v & 1) === 1);
        v = (v >> 1) | (v & 0x8000);
      } else if (k === 9) {
        this.carry((v & 1) === 1);
        v >>= 1;
      } else if (k === 10) {
        this.carry((v & 0x8000) !== 0);
        v = (v << 1) & 0xffff;
      } else {
        const b = v & 1;
        this.carry(b === 1);
        v = (v >> 1) | (b << 15);
      }
    }
    this.status(v);
    this.setReg(w, v);
  }

  private single(op: number): void {
    const k = op & 0xffc0;
    const a = this.ea((op >> 4) & 3, op & 15, false);
    if (k === 0x400) {
      // BLWP
      const [owp, opc, ost] = [this.wp, this.pc, this.st];
      this.wp = this.rw(a);
      this.pc = this.rw(a + 2);
      this.setReg(13, owp);
      this.setReg(14, opc);
      this.setReg(15, ost);
      return;
    }
    if (k === 0x440) {
      this.pc = a;
      return;
    }
    if (k === 0x680) {
      this.setReg(11, this.pc);
      this.pc = a;
      return;
    }
    if (k === 0x480) throw new Stop('X');
    if (k === 0x4c0) {
      this.ww(a, 0);
      return;
    }
    let v = this.rw(a);
    if (k === 0x500) v = -v & 0xffff;
    else if (k === 0x540) v = ~v & 0xffff;
    else if (k === 0x580) {
      this.carry(v === 0xffff);
      v = (v + 1) & 0xffff;
    } else if (k === 0x5c0) {
      this.carry(v >= 0xfffe);
      v = (v + 2) & 0xffff;
    } else if (k === 0x600) {
      this.carry(v !== 0);
      v = (v - 1) & 0xffff;
    } else if (k === 0x640) {
      this.carry(v >= 2);
      v = (v - 2) & 0xffff;
    } else if (k === 0x6c0) v = ((v << 8) | (v >> 8)) & 0xffff;
    else if (k === 0x700) v = 0xffff;
    else if (k === 0x740 && v & 0x8000) v = -v & 0xffff;
    this.status(v);
    this.ww(a, v);
  }

  private immediate(op: number): void {
    const k = op & 0xffe0;
    const r = op & 15;
    if (k >= 0x200 && k <= 0x280) {
      const imm = this.rw(this.pc);
      this.pc += 2;
      const v = this.reg(r);
      if (k === 0x200) {
        this.status(imm);
        this.setReg(r, imm);
      } else if (k === 0x220) {
        const x = v + imm;
        this.carry(x > 0xffff);
        this.status(x & 0xffff);
        this.setReg(r, x & 0xffff);
      } else if (k === 0x240) {
        this.status(v & imm);
        this.setReg(r, v & imm);
      } else if (k === 0x260) {
        this.status(v | imm);
        this.setReg(r, v | imm);
      } else this.compare(v, imm);
      return;
    }
    if (k === 0x2e0) {
      this.wp = this.rw(this.pc);
      this.pc += 2;
    } else if (k === 0x300) this.pc += 2; // LIMI
    else if (k === 0x2a0) this.setReg(r, this.wp);
    else if (k === 0x2c0) this.setReg(r, this.st);
    else if (op === 0x380) {
      this.st = this.reg(15);
      this.pc = this.reg(14);
      this.wp = this.reg(13);
    } else throw new Stop(`bad opcode ${op.toString(16)}`);
  }
}

/** The GROM address of each room's picture (0 = none), from the ROM's table. */
export function tiPictureAddress(rom: Uint8Array, room: number): number {
  const at = TABLE - 0x6000 + 2 * room;
  return at + 1 < rom.length ? (rom[at]! << 8) | rom[at + 1]! : 0;
}

/** Run the cartridge's drawing routine for the picture at `address` and read it back as a 256×96 bitmap. */
export function drawTi(rom: Uint8Array, grom: Uint8Array, address: number): Bitmap | undefined {
  const m = new Machine(rom, grom);
  m.ww(0x8320, 0x3800); // the routine keeps a register stack in video memory here
  m.setReg(1, 0x61be); // read the next GROM byte
  m.setReg(7, 0x6478); // read a byte of video memory
  m.setReg(9, 0x61ce); // read the next GROM word
  m.setReg(10, address);
  m.setReg(11, 0xfffe); // return here when done
  m.pc = DRAW;
  try {
    while (m.pc !== 0xfffe) m.step();
  } catch {
    return undefined;
  }
  const W = 256;
  const H = 96;
  const pixels = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = (y >> 3) * 32 + (x >> 3);
      const pattern = m.vdp[0x2000 + cell * 8 + (y & 7)]!;
      const colour = m.vdp[cell * 8 + (y & 7)]!;
      pixels[y * W + x] = pattern & (0x80 >> (x & 7)) ? colour >> 4 : colour & 15;
    }
  }
  return { width: W, height: H, pixels };
}
