/* ══════════════════════════════════════════════════════════════
   ตัวสร้าง QR Code แบบเขียนเอง (ไม่ต้องโหลดจากเน็ต / ไม่ต้องลงแพ็กเกจเพิ่ม)
   รองรับโหมด byte · เวอร์ชัน 1–20 · ระดับกันเสีย L / M / Q / H
   พอสำหรับ QR พร้อมเพย์ และ QR ร้านค้า K SHOP (ข้อความยาว ~370–390 ตัวอักษร)

   ใช้:  const m = makeQR('ข้อความ', 'H')   →  m.size, m.get(row, col) = true/false
   ══════════════════════════════════════════════════════════════ */

// [จำนวน EC ต่อบล็อก, บล็อกกลุ่ม1, data ต่อบล็อกกลุ่ม1, บล็อกกลุ่ม2, data ต่อบล็อกกลุ่ม2]
const EC_TABLE = {
  1:  { L: [7, 1, 19],         M: [10, 1, 16],        Q: [13, 1, 13],        H: [17, 1, 9] },
  2:  { L: [10, 1, 34],        M: [16, 1, 28],        Q: [22, 1, 22],        H: [28, 1, 16] },
  3:  { L: [15, 1, 55],        M: [26, 1, 44],        Q: [18, 2, 17],        H: [22, 2, 13] },
  4:  { L: [20, 1, 80],        M: [18, 2, 32],        Q: [26, 2, 24],        H: [16, 4, 9] },
  5:  { L: [26, 1, 108],       M: [24, 2, 43],        Q: [18, 2, 15, 2, 16], H: [22, 2, 11, 2, 12] },
  6:  { L: [18, 2, 68],        M: [16, 4, 27],        Q: [24, 4, 19],        H: [28, 4, 15] },
  7:  { L: [20, 2, 78],        M: [18, 4, 31],        Q: [18, 2, 14, 4, 15], H: [26, 4, 13, 1, 14] },
  8:  { L: [24, 2, 97],        M: [22, 2, 38, 2, 39], Q: [22, 4, 18, 2, 19], H: [26, 4, 14, 2, 15] },
  9:  { L: [30, 2, 116],       M: [22, 3, 36, 2, 37], Q: [20, 4, 16, 4, 17], H: [24, 4, 12, 4, 13] },
  10: { L: [18, 2, 68, 2, 69], M: [26, 4, 43, 1, 44], Q: [24, 6, 19, 2, 20], H: [28, 6, 15, 2, 16] },
  11: { L: [20, 4, 81],        M: [30, 1, 50, 4, 51], Q: [28, 4, 22, 4, 23], H: [24, 3, 12, 8, 13] },
  12: { L: [24, 2, 92, 2, 93], M: [22, 6, 36, 2, 37], Q: [26, 4, 20, 6, 21], H: [28, 7, 14, 4, 15] },
  13: { L: [26, 4, 107],       M: [22, 8, 37, 1, 38], Q: [24, 8, 20, 4, 21], H: [22, 12, 11, 4, 12] },
  14: { L: [30, 3, 115, 1, 116], M: [24, 4, 40, 5, 41], Q: [20, 11, 16, 5, 17], H: [24, 11, 12, 5, 13] },
  15: { L: [22, 5, 87, 1, 88],   M: [24, 5, 41, 5, 42], Q: [30, 5, 24, 7, 25],  H: [24, 11, 12, 7, 13] },
  16: { L: [24, 5, 98, 1, 99],   M: [28, 7, 45, 3, 46], Q: [24, 15, 19, 2, 20], H: [30, 3, 15, 13, 16] },
  17: { L: [28, 1, 107, 5, 108], M: [28, 10, 46, 1, 47], Q: [28, 1, 22, 15, 23], H: [28, 2, 14, 17, 15] },
  18: { L: [30, 5, 120, 1, 121], M: [26, 9, 43, 4, 44], Q: [28, 17, 22, 1, 23], H: [28, 2, 14, 19, 15] },
  19: { L: [28, 3, 113, 4, 114], M: [26, 3, 44, 11, 45], Q: [26, 17, 21, 4, 22], H: [26, 9, 13, 16, 14] },
  20: { L: [28, 3, 107, 5, 108], M: [26, 3, 41, 13, 42], Q: [30, 15, 24, 5, 25], H: [28, 15, 15, 10, 16] },
}
const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
  7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
  11: [6, 30, 54], 12: [6, 32, 58], 13: [6, 34, 62], 14: [6, 26, 46, 66], 15: [6, 26, 48, 70],
  16: [6, 26, 50, 74], 17: [6, 30, 54, 78], 18: [6, 30, 56, 82], 19: [6, 30, 58, 86], 20: [6, 34, 62, 90] }
const EC_BITS = { L: 1, M: 0, Q: 3, H: 2 }

// ── Galois field GF(256) สำหรับ Reed-Solomon ─────────────────────
const EXP = new Array(512), LOG = new Array(256)
;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
})()
const gmul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]])

function rsGenerator(deg) {
  let g = [1]
  for (let i = 0; i < deg; i++) {
    const next = new Array(g.length + 1).fill(0)
    for (let j = 0; j < g.length; j++) {
      next[j] ^= g[j]
      next[j + 1] ^= gmul(g[j], EXP[i])
    }
    g = next
  }
  return g
}
function rsRemainder(data, deg) {
  const gen = rsGenerator(deg)
  const res = new Array(deg).fill(0)
  for (const b of data) {
    const f = b ^ res.shift()
    res.push(0)
    for (let i = 0; i < deg; i++) res[i] ^= gmul(gen[i + 1], f)
  }
  return res
}

// ── แปลงข้อความเป็น byte (UTF-8) ───────────────────────────────
const utf8 = (s) => Array.from(new TextEncoder().encode(s))

function blocksOf(v, ecl) {
  const [ec, b1, d1, b2 = 0, d2 = 0] = EC_TABLE[v][ecl]
  return { ec, b1, d1, b2, d2, dataTotal: b1 * d1 + b2 * d2 }
}

function encodeData(bytes, v, ecl) {
  const { ec, b1, d1, b2, d2, dataTotal } = blocksOf(v, ecl)
  const bits = []
  const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1) }
  put(0b0100, 4)                                // โหมด byte
  put(bytes.length, v < 10 ? 8 : 16)
  for (const b of bytes) put(b, 8)
  const cap = dataTotal * 8
  put(0, Math.min(4, cap - bits.length))        // terminator
  while (bits.length % 8) bits.push(0)
  const data = []
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2))
  for (let pad = 0xec; data.length < dataTotal; pad ^= 0xec ^ 0x11) data.push(pad)

  // แบ่งบล็อก + เติม EC แล้วสลับลำดับ (interleave)
  const blocks = [], ecs = []
  let k = 0
  for (let i = 0; i < b1 + b2; i++) {
    const n = i < b1 ? d1 : d2
    const blk = data.slice(k, k + n); k += n
    blocks.push(blk); ecs.push(rsRemainder(blk, ec))
  }
  const out = []
  const maxD = Math.max(d1, d2)
  for (let i = 0; i < maxD; i++) for (const b of blocks) if (i < b.length) out.push(b[i])
  for (let i = 0; i < ec; i++) for (const e of ecs) out.push(e[i])
  return out
}

function bch(value, poly, polyBits) {
  let v = value << (polyBits - 1)
  while (true) {
    const len = 32 - Math.clz32(v)
    if (len < polyBits) break
    v ^= poly << (len - polyBits)
  }
  return v
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
]

function build(v, ecl, codewords, mask) {
  const n = 17 + v * 4
  const m = Array.from({ length: n }, () => new Array(n).fill(false))
  const fixed = Array.from({ length: n }, () => new Array(n).fill(false))
  const set = (r, c, val) => { m[r][c] = val; fixed[r][c] = true }

  // finder + separator
  const finder = (r0, c0) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const rr = r0 + r, cc = c0 + c
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue
      const on = r >= 0 && r <= 6 && c >= 0 && c <= 6 &&
        (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4))
      set(rr, cc, on)
    }
  }
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0)

  // timing
  for (let i = 8; i < n - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0) }

  // alignment
  const al = ALIGN[v]
  const last = al.length - 1
  for (let i = 0; i < al.length; i++) for (let j = 0; j < al.length; j++) {
    // ข้ามเฉพาะ 3 มุมที่ทับ finder (ตัวที่ทับเส้น timing ยังต้องวาด)
    if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue
    const r = al[i], c = al[j]
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++)
      set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1)
  }

  // format info (จองที่ก่อน ใส่ค่าทีหลัง) + dark module
  const fmt = (((EC_BITS[ecl] << 3) | mask) << 10 | bch((EC_BITS[ecl] << 3) | mask, 0x537, 11)) ^ 0x5412
  const fbit = (i) => ((fmt >>> i) & 1) === 1
  for (let i = 0; i <= 5; i++) set(i, 8, fbit(i))
  set(7, 8, fbit(6)); set(8, 8, fbit(7)); set(8, 7, fbit(8))
  for (let i = 9; i < 15; i++) set(8, 14 - i, fbit(i))
  for (let i = 0; i < 8; i++) set(8, n - 1 - i, fbit(i))
  for (let i = 8; i < 15; i++) set(n - 15 + i, 8, fbit(i))
  set(n - 8, 8, true)   // dark module

  // version info (v7 ขึ้นไป)
  if (v >= 7) {
    const vi = (v << 12) | bch(v, 0x1f25, 13)
    for (let i = 0; i < 18; i++) {
      const bit = ((vi >>> i) & 1) === 1
      const a = n - 11 + (i % 3), b = Math.floor(i / 3)
      set(a, b, bit); set(b, a, bit)
    }
  }

  // วางข้อมูลแบบซิกแซก
  const bits = []
  for (const cw of codewords) for (let i = 7; i >= 0; i--) bits.push((cw >>> i) & 1)
  let bi = 0, up = true
  const fn = MASKS[mask]
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--
    for (let i = 0; i < n; i++) {
      const r = up ? n - 1 - i : i
      for (let dc = 0; dc < 2; dc++) {
        const c = col - dc
        if (fixed[r][c]) continue
        let dark = bi < bits.length ? bits[bi] === 1 : false
        bi++
        if (fn(r, c)) dark = !dark
        m[r][c] = dark
      }
    }
    up = !up
  }
  return m
}

function penalty(m) {
  const n = m.length
  let p = 0
  // กฎ 1: แถว/คอลัมน์สีเดียวกันติดกัน ≥5
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
    let run = 1
    for (let j = 1; j < n; j++) {
      const a = pass ? m[j][i] : m[i][j], b = pass ? m[j - 1][i] : m[i][j - 1]
      if (a === b) { run++; if (run === 5) p += 3; else if (run > 5) p++ } else run = 1
    }
  }
  // กฎ 2: บล็อก 2×2
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
    const v = m[r][c]
    if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) p += 3
  }
  // กฎ 3: ลายคล้าย finder
  const pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]
  for (let i = 0; i < n; i++) for (let j = 0; j <= n - 11; j++) {
    let h1 = true, h2 = true, v1 = true, v2 = true
    for (let k = 0; k < 11; k++) {
      const h = m[i][j + k] ? 1 : 0, vv = m[j + k][i] ? 1 : 0
      if (h !== pat1[k]) h1 = false
      if (h !== pat2[k]) h2 = false
      if (vv !== pat1[k]) v1 = false
      if (vv !== pat2[k]) v2 = false
    }
    p += 40 * (h1 + h2 + v1 + v2)
  }
  // กฎ 4: สัดส่วนสีเข้ม
  let dark = 0
  for (const row of m) for (const x of row) if (x) dark++
  p += Math.floor(Math.abs(dark * 100 / (n * n) - 50) / 5) * 10
  return p
}

export function makeQR(text, ecl = 'M') {
  const bytes = utf8(text)
  let v = 1
  for (; v <= 20; v++) {
    const { dataTotal } = blocksOf(v, ecl)
    const need = 4 + (v < 10 ? 8 : 16) + bytes.length * 8
    if (need <= dataTotal * 8) break
  }
  if (v > 20) throw new Error('ข้อความยาวเกินไปสำหรับ QR')
  const cw = encodeData(bytes, v, ecl)
  let best = null, bestP = Infinity
  for (let mask = 0; mask < 8; mask++) {
    const m = build(v, ecl, cw, mask)
    const p = penalty(m)
    if (p < bestP) { bestP = p; best = m }
  }
  return { size: best.length, version: v, get: (r, c) => best[r][c] }
}
