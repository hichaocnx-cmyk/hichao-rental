# ย้าย HICHAO.CNX จาก Supabase → VPS ของตัวเอง

รอบนี้โฟกัสเรื่องเดียว: **กู้ข้อมูลออกจาก Supabase ให้ได้ก่อน**
เรื่องเขียน API server / ติดตั้ง VPS จะทำรอบถัดไป

---

## สรุปสถานะ

| สิ่งที่ต้องกู้ | ดึงออกได้ตอนนี้เลยไหม | ทำไม |
|---|---|---|
| ข้อมูล 4 ตาราง (กล้อง ลูกค้า การเช่า รายจ่าย) | **ได้เลย** ✅ | SQL Editor ต่อ Postgres ตรง ไม่ผ่าน API gateway ที่โดนบล็อก |
| รายชื่อ + ขนาดไฟล์รูป | **ได้เลย** ✅ | `storage.objects` เป็นตารางใน Postgres |
| บัญชีผู้ใช้ (`auth.users`) | **ได้เลย** ✅ | อยู่ใน Postgres เหมือนกัน |
| **ตัวไฟล์รูปจริง** | **ยังไม่ได้** ❌ | ไฟล์อยู่ใน S3 ต้องเรียกผ่าน Storage API → ตอบ 402 ตอนถูกระงับ |

**แปลว่า:** ทำขั้นที่ 1 ได้เลยวันนี้ · ขั้นที่ 3 (รูป) ต้องกู้บริการก่อน

> ลองเปิด Dashboard → Storage → กดดาวน์โหลดรูปด้วยมือดูก่อนก็ได้
> บางทีหน้า Dashboard ดาวน์โหลดได้แม้ API ถูกบล็อก ถ้าได้ก็ประหยัดเวลาไปเลย

---

## ขั้นที่ 1 — ดึงข้อมูลตารางออก (ทำได้เลย)

1. เปิด https://supabase.com/dashboard → เลือกโปรเจกต์ → **SQL Editor**
2. เปิดไฟล์ `01_export_db.sql` แล้วรันทีละบล็อก
3. **ขั้นที่ 1** ในไฟล์ = นับแถว → **จดตัวเลขไว้** ไว้เทียบตอน import
4. **ขั้นที่ 2** = ได้ JSON ก้อนเดียว → กดคัดลอกค่าในเซลล์ → วางลงไฟล์
   ตั้งชื่อ `hichao-backup-20260730.json`
5. **ขั้นที่ 3** = รายชื่อไฟล์รูป → เก็บไว้เทียบว่าดึงรูปครบไหม
6. **ขั้นที่ 4** = ดูว่ามีบัญชีอะไรอยู่

**เก็บไฟล์ backup ไว้อย่างน้อย 2 ที่** (เครื่อง + cloud drive) นี่คือข้อมูลลูกค้าจริง

> ถ้า JSON ใหญ่เกินคัดลอกทีเดียว มีวิธีรันแยกทีละตารางอยู่ท้ายไฟล์ `01_export_db.sql`

---

## ขั้นที่ 2 — เอาข้อมูลเข้า Postgres บน VPS

```bash
# ติดตั้ง Postgres (Ubuntu)
sudo apt update && sudo apt install -y postgresql postgresql-contrib

# สร้าง DB + user  (เปลี่ยน 'ตั้งรหัสเอง' เป็นรหัสจริง)
sudo -u postgres psql -c "create database hichao"
sudo -u postgres psql -c "create user hichao with password 'ตั้งรหัสเอง'"

# สร้างโครงตาราง
sudo -u postgres psql -d hichao -f 02_schema_selfhost.sql
sudo -u postgres psql -d hichao -c "grant all on schema public to hichao"
sudo -u postgres psql -d hichao -c "grant all on all tables in schema public to hichao"

# ยัดข้อมูลเข้า
psql -d hichao -v backup="$(cat hichao-backup-20260730.json)" -f 03_import_db.sql
```

ท้ายไฟล์ `03_import_db.sql` จะพิมพ์จำนวนแถวออกมา — **ต้องตรงกับที่จดไว้จากขั้นที่ 1**
พร้อมเช็คให้ด้วยว่ามี rental ที่ FK หลุดหรือไม่

---

## ขั้นที่ 3 — ดึงไฟล์รูป (ต้องกู้บริการ Supabase ก่อน)

1. เปิด `04_export_storage.html` ด้วยเบราว์เซอร์ (ดับเบิลคลิกได้เลย ไม่ต้องมีเซิร์ฟเวอร์)
2. วาง anon key (ตัวเดิมใน `.env`) → กด **เริ่มดึงรูป**
3. ได้ไฟล์ `hichao-storage-YYYYMMDD.zip` มี:
   - รูปทั้งหมดพร้อมโครงโฟลเดอร์เดิม (รวม `thumb/`)
   - `manifest.json` บอกว่าไฟล์ไหนคู่กับกล้องตัวไหน
4. เทียบจำนวนไฟล์กับผลลัพธ์ "ขั้นที่ 3" จาก `01_export_db.sql`
5. แตก zip ไปวางที่ `/var/www/hichao/uploads/` บน VPS

**ถ้าขึ้น 402** = ยังไม่ได้กู้บริการ — ต้องอัปเกรด Pro หรือรอรอบบิลรีเซ็ตก่อน

---

## ขั้นที่ 4 — แก้ URL รูปให้ชี้มาที่ VPS

หลังไฟล์รูปอยู่บน VPS แล้ว รัน SQL ท้ายไฟล์ `03_import_db.sql`:

```
https://xxx.supabase.co/storage/v1/object/public/camera-images/abc.jpg
                          ↓
/uploads/abc.jpg          (thumb → /uploads/thumb/abc.jpg)
```

แล้วแก้ `src/lib/images.js` ให้ `getThumbUrl()` ใช้ marker `/uploads/` แทน `/camera-images/`

---

## ยังต้องทำอะไรอีก (รอบถัดไป)

สิ่งที่ต้องมีบน VPS ให้แอปทำงานได้เต็มรูปแบบ:

| ส่วน | รายละเอียด |
|---|---|
| **API server** (Node/Fastify) | แทน `supabase.from()` 7 จุด · เบราว์เซอร์ต่อ Postgres ตรงไม่ได้ ต้องมีชั้นนี้ |
| **Auth** | JWT ใน httpOnly cookie + argon2 · แทน `supabase.auth.*` 4 จุด · ตาราง `app_users`/`app_sessions` เตรียมไว้แล้วใน `02_schema_selfhost.sql` |
| **Upload endpoint** | รับไฟล์ → ย่อ 700px + thumb 320px (ใช้ `sharp` ฝั่ง server ได้ ดีกว่า canvas) → เขียนลง `/var/www/hichao/uploads/` |
| **SSE endpoint** | `/api/events` — แทน realtime ของ Supabase (คุณเลือกไว้ว่าเอาไว้) |
| **LINE routes** | ย้าย Edge Function 3 ตัวมาเป็น route ในเซิร์ฟเวอร์เดียวกัน · token เก็บใน env ของ VPS |
| **pg_cron** | `sudo apt install postgresql-16-cron` แล้วย้าย job จาก `migration_003/004/005` มาได้เกือบตรงๆ · แทน `pg_net` ด้วยการเรียก API ตัวเอง |
| **nginx + TLS** | เสิร์ฟ SPA build + `/uploads/` (cache 1 ปี) + reverse proxy ไป API · Let's Encrypt ต่ออายุอัตโนมัติ |
| **Backup** | `pg_dump` + rsync ไฟล์รูป ขึ้น cron ทุกวัน **ส่งออกนอกเครื่อง** — Supabase ทำให้ฟรี ย้ายมาเองต้องทำเอง ไม่งั้นดิสก์เสีย = ข้อมูลลูกค้าหายหมด |

**ยังไม่มีโดเมน** — ต้องมีก่อนถึงจะขอ TLS จาก Let's Encrypt ได้
ระหว่างนี้รันด้วย IP + http ทดสอบได้ แต่ห้ามใช้เก็บข้อมูลลูกค้าจริงบน http เปล่า
(รหัสผ่านกับข้อมูลลูกค้าวิ่งผ่านเน็ตแบบไม่เข้ารหัส)

---

## หมายเหตุ

- **ยังไม่ต้องลบโปรเจกต์ Supabase** จนกว่าจะยืนยันว่า VPS ทำงานครบและ backup ใช้กู้คืนได้จริง
- ตอนนี้ยัง deploy อยู่บน Vercel + Supabase ตามปกติ (commit `f8221a9`) ไฟล์ในโฟลเดอร์นี้เป็นเครื่องมือย้าย ไม่กระทบระบบที่รันอยู่
- `.env` เดิมมี anon key ซึ่งเป็น public key — ปลอดภัยที่จะใช้ใน `04_export_storage.html`
  แต่ **service_role key ห้ามเอามาใส่** ในไฟล์ที่เปิดในเบราว์เซอร์เด็ดขาด
