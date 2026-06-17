/* HICHAO build safety check — ไม่ต้องลง dependency เพิ่ม (ใช้ @babel ที่มากับ vite)
   ดัก 2 อย่างที่เคยทำ production พัง:
   1) Syntax error (เช่น แท็ก JSX ปิดไม่ครบ) -> build ไม่ผ่าน
   2) ใช้ const/let "ก่อนประกาศในสโคปเดียวกัน" -> หน้าขาว (TDZ)
*/
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const fs = require('fs'), path = require('path')

function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    const st = fs.statSync(p)
    if (st.isDirectory()) { if (f === 'node_modules') continue; walk(p, acc) }
    else if (/\.(jsx?|js)$/.test(f)) acc.push(p)
  }
  return acc
}

const files = walk('src')
const errors = []
const seen = new Set()

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8')
  let ast
  try {
    ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] })
  } catch (e) {
    errors.push(`[SYNTAX] ${file}: ${e.message}`)
    continue
  }
  traverse(ast, {
    Scope(p) {
      const b = p.scope.bindings
      for (const name in b) {
        const binding = b[name]
        if (binding.kind !== 'const' && binding.kind !== 'let') continue
        // ขอบเขตของ "ทั้งคำสั่งประกาศ" (รวม export const ... = ...)
        const stmt = binding.path.getStatementParent()
        const declStart = stmt ? stmt.node.start : binding.path.node.start
        const declEnd   = stmt ? stmt.node.end   : binding.path.node.end
        for (const ref of binding.referencePaths) {
          if (ref.scope !== binding.scope) continue          // ข้าม ref ในฟังก์ชันซ้อน (ปลอดภัย)
          if (ref.node.start >= declStart && ref.node.start <= declEnd) continue // ข้ามตัวประกาศเอง/export
          if (ref.node.start < declStart) {
            const line = code.slice(0, ref.node.start).split('\n').length
            const key = `${file}:${line}:${name}`
            if (seen.has(key)) continue
            seen.add(key)
            errors.push(`[USE-BEFORE-DEFINE] ${file}:${line}  '${name}' ถูกใช้ก่อนประกาศในสโคปเดียวกัน (เสี่ยงหน้าขาว/TDZ)`)
          }
        }
      }
    }
  })
}

if (errors.length) {
  console.error('\n❌ พบปัญหา ' + errors.length + ' จุด — แก้ก่อน deploy:\n')
  errors.forEach(e => console.error('  ' + e))
  console.error('')
  process.exit(1)
} else {
  console.log(`✅ ผ่านการตรวจ (${files.length} ไฟล์) — ไม่มี syntax error / ใช้ตัวแปรก่อนประกาศ`)
}
