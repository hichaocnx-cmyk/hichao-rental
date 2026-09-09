# ตั้งค่า Backup อัตโนมัติทุกวัน (ไม่ต้องเปิดแอปเลย)

**เป้าหมาย:** ทุกวันเวลา 04:00 น. (เวลาไทย) ระบบจะดึงข้อมูลทั้ง 4 ตาราง
(กล้อง/ลูกค้า/เช่า/รายจ่าย) เขียนเป็นไฟล์ JSON แล้วอัปขึ้น Google Drive
โฟลเดอร์เดิมที่ใช้อยู่ให้เองทั้งหมด — ไม่ต้องเปิดแอป ไม่ต้องกดปุ่มอะไรเลย
พร้อมแจ้งผลผ่าน LINE ทุกครั้ง (สำเร็จ/ล้มเหลว)

**หลักการ:** ใช้ pg_cron (ตัวเดียวกับที่ส่งกล้องอัตโนมัติ/แจ้งเตือนคิวอยู่แล้ว)
เรียก Edge Function ใหม่ชื่อ `daily-backup` ทุกวัน ฟังก์ชันนี้ดึงข้อมูลด้วยสิทธิ์
service role (เห็นครบทุกแถวเสมอ ไม่ผ่าน RLS) แล้วอัปโหลดเข้า Google Drive
ผ่าน Service Account (บัญชีหุ่นยนต์ของ Google ที่เราจะสร้างขึ้นเฉพาะงานนี้)

ปุ่ม **"สำรองข้อมูล"** ในแอปเดิมยังใช้งานได้ปกติ — ทั้งสองทางบันทึกประวัติลง
ตารางเดียวกัน (`backup_log`) ป้าย "สำรองล่าสุด" ในแอปจะเห็นทั้งคู่รวมกัน

ขั้นตอนทั้งหมดทำครั้งเดียว ใช้เวลารวมประมาณ 15–20 นาที

---

## ขั้นที่ 1 — สร้าง Google Service Account (~10 นาที)

1. เปิด https://console.cloud.google.com/ ล็อกอินด้วยบัญชี Google เดียวกับที่ใช้
   เก็บ backup อยู่แล้ว (`hichao.cnx@gmail.com` ตามที่ตรวจไว้ใน BACKUP.md)
2. สร้างโปรเจกต์ใหม่ (มุมซ้ายบน → **New Project**) ตั้งชื่อเช่น `hichao-backup`
   หรือใช้โปรเจกต์เดิมถ้ามีอยู่แล้วก็ได้
3. เปิดใช้งาน **Google Drive API**:
   เมนู ☰ → **APIs & Services** → **Library** → ค้นหา "Google Drive API" → กด **Enable**
4. สร้าง Service Account:
   เมนู ☰ → **APIs & Services** → **Credentials** → **+ Create Credentials**
   → **Service account**
   - ชื่อ: `hichao-backup` (ชื่ออะไรก็ได้)
   - กด **Create and Continue** → ข้าม role (ไม่ต้องเลือก) → **Done**
5. สร้างคีย์ (JSON key):
   คลิกที่ Service Account ที่เพิ่งสร้าง → แท็บ **Keys** → **Add Key** →
   **Create new key** → เลือก **JSON** → **Create**
   → ไฟล์ `.json` จะดาวน์โหลดลงเครื่องอัตโนมัติ **เก็บไฟล์นี้ไว้ให้ดี ห้ามอัปขึ้น GitHub**

เปิดไฟล์ JSON ที่ได้ด้วย Notepad จะเห็นประมาณนี้ (ค่าที่ต้องใช้ในขั้นถัดไป):

```json
{
  "client_email": "hichao-backup@xxxxx.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n",
  ...
}
```

จด/คัดลอกค่า `client_email` และ `private_key` ไว้ (ใช้ในขั้นที่ 3)

---

## ขั้นที่ 2 — แชร์โฟลเดอร์ Drive ปลายทางให้ Service Account (~3 นาที)

1. เปิด https://drive.google.com/ ไปที่โฟลเดอร์ปลายทางเดิม:
   `[DATABASE] HICHAO.CNX / DATABASE [APPWEB] / HICHAO-Backup Customer`
2. คลิกขวาที่โฟลเดอร์ → **Share** (แชร์)
3. ใส่อีเมล `client_email` จากขั้นที่ 1 (หน้าตาแบบ `xxx@xxx.iam.gserviceaccount.com`)
   ตั้งสิทธิ์เป็น **Editor** (แก้ไขได้) → **Send** / **Share**

   > ไม่ต้องกังวล — Service Account นี้เข้าถึงได้แค่โฟลเดอร์นี้โฟลเดอร์เดียวที่เราแชร์ให้
   > เข้าถึงไฟล์อื่นในไดรฟ์ไม่ได้เลย

4. หา **Folder ID**: เปิดโฟลเดอร์นั้นค้างไว้ ดู URL ในแถบที่อยู่ เช่น

   ```
   https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz
                                            └────────── นี่คือ Folder ID ──────────┘
   ```

   คัดลอกส่วนหลัง `/folders/` เก็บไว้ (ใช้ในขั้นที่ 3)

---

## ขั้นที่ 3 — ตั้งค่า Secret ใน Supabase (~5 นาที)

1. เปิด https://supabase.com/dashboard → เลือกโปรเจกต์ `hichao-rental`
2. ไปที่ **Edge Functions** → **Secrets** (หรือ **Settings → Edge Functions**)
3. เพิ่ม secret ทั้ง 3 ตัวนี้ (ถ้ามี `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_USER_ID`
   อยู่แล้วจากฟีเจอร์แจ้งเตือน LINE ไม่ต้องตั้งซ้ำ ใช้ตัวเดิมได้เลย):

   | ชื่อ | ค่า |
   |---|---|
   | `GOOGLE_SA_EMAIL` | ค่า `client_email` จากไฟล์ JSON ขั้นที่ 1 |
   | `GOOGLE_SA_PRIVATE_KEY` | ค่า `private_key` จากไฟล์ JSON ขั้นที่ 1 (วางทั้งก้อน รวมบรรทัด `-----BEGIN PRIVATE KEY-----` และ `-----END PRIVATE KEY-----`) |
   | `GOOGLE_DRIVE_FOLDER_ID` | Folder ID จากขั้นที่ 2 |

   > ช่อง Secret ใน Dashboard เป็นกล่องข้อความหลายบรรทัดอยู่แล้ว วาง `private_key`
   > ตรงๆ จากไฟล์ JSON ได้เลย ไม่ต้องแก้ไขอะไร (ทั้ง `\n` ที่เห็นในไฟล์ก็คัดลอกไปแบบนั้น
   > ได้ โค้ดฝั่ง Edge Function แปลงให้เองอัตโนมัติ)

---

## ขั้นที่ 4 — Deploy Edge Function + รัน Migration (~2 นาที)

จากเครื่องที่มี Supabase CLI ผูกกับโปรเจกต์นี้อยู่แล้ว (เครื่องเดียวกับที่ใช้
`deploy.bat` / `commit_push.bat`) เปิด terminal ที่โฟลเดอร์โปรเจกต์แล้วรัน:

```
supabase functions deploy daily-backup
```

จากนั้นรัน `supabase/migration_013.sql` ทั้งไฟล์ใน **Supabase Dashboard →
SQL Editor** (วางทั้งไฟล์ → Run) — ไฟล์นี้จะสร้างตาราง `backup_log` และตั้งเวลา
cron ให้เรียก Edge Function ทุกวัน 04:00 น.

---

## ขั้นที่ 5 — ทดสอบ

ไม่ต้องรอถึงพรุ่งนี้ ทดสอบได้ทันที 2 แบบ:

**แบบง่าย:** Supabase Dashboard → **Edge Functions** → `daily-backup` →
ปุ่ม **Invoke** (หรือ Test)

**แบบรัน SQL เอง:** ใน SQL Editor รัน

```sql
select net.http_post(
  url := 'https://ceutmrmtebnprbkotqzy.supabase.co/functions/v1/daily-backup',
  headers := jsonb_build_object('Content-Type','application/json'),
  body := '{}'::jsonb
);
```

ควรได้ผลนี้ภายในไม่กี่วินาที:

- ข้อความ LINE "💾 สำรองข้อมูลอัตโนมัติสำเร็จ" พร้อมจำนวนรายการ
- ไฟล์ `hichao-backup-auto-YYYYMMDD-HHMM.json` โผล่ในโฟลเดอร์ Drive ปลายทาง
- แถวใหม่ใน `backup_log`: `select * from backup_log order by created_at desc limit 5;`
- เปิดแอป → เมนูซ้ายล่าง ป้าย "สำรองล่าสุด" ควรขึ้น "วันนี้ (อัตโนมัติ)"

ถ้าได้ข้อความ LINE "⚠️ สำรองข้อมูลอัตโนมัติล้มเหลว" ให้ดูข้อความ error ที่แนบมา —
ส่วนใหญ่เป็นเรื่อง secret พิมพ์ผิดหรือยังไม่ได้แชร์โฟลเดอร์ให้ service account
(ดูตารางแก้ปัญหาด้านล่าง)

---

## แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุที่เป็นไปได้ | วิธีแก้ |
|---|---|---|
| `Google OAuth: invalid_grant` | เวลาเครื่อง/private key ไม่ตรง หรือ private key ไม่ครบ | คัดลอก `private_key` ใหม่ทั้งก้อนจากไฟล์ JSON อีกครั้ง อย่าตัดบรรทัดใดออก |
| `Drive create: File not found` หรือ `insufficientPermissions` | ยังไม่ได้แชร์โฟลเดอร์ให้ service account หรือแชร์ผิดอีเมล | กลับไปขั้นที่ 2 เช็คว่าแชร์ให้อีเมลที่ลงท้าย `.iam.gserviceaccount.com` และตั้งเป็น Editor |
| `ยังไม่ได้ตั้งค่า GOOGLE_SA_EMAIL / ...` | ตั้ง secret ไม่ครบ หรือพิมพ์ชื่อผิด | เช็คชื่อ secret ทั้ง 3 ตัวให้ตรงเป๊ะตามตารางขั้นที่ 3 แล้ว deploy ฟังก์ชันใหม่ (secret จะมีผลหลัง deploy ครั้งถัดไป) |
| ไม่มีข้อความ LINE เลย ทั้งสำเร็จและล้มเหลว | `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_USER_ID` ยังไม่ได้ตั้ง (หรือหมดอายุ) | เช็คใน Edge Functions → Secrets ว่ามีสองตัวนี้อยู่ — ใช้ตัวเดียวกับฟีเจอร์แจ้งเตือนอื่นได้เลย ไม่กระทบกัน |
| ไฟล์ไม่ขึ้นใน Drive ทั้งที่ log บอกสำเร็จ | ดูผิดโฟลเดอร์ หรือแคช Drive เว็บยังไม่รีเฟรช | เช็ค `GOOGLE_DRIVE_FOLDER_ID` ตรงกับโฟลเดอร์ที่เปิดดูอยู่ไหม แล้วลอง refresh หน้า drive.google.com |

---

## ต้นทุน / ความถี่

- Google Drive API: ฟรี ไม่มีค่าใช้จ่าย (โควตาเผื่อไว้สูงมากเทียบกับไฟล์เดียว/วัน)
- Supabase Edge Function + pg_cron: อยู่ในแผนฟรีอยู่แล้ว (เหมือนฟังก์ชันแจ้งเตือน LINE ที่ใช้อยู่)
- รันวันละ 1 ครั้ง (04:00 น.) — ถ้าอยากถี่กว่านี้ แก้ตารางเวลาได้ที่ `migration_013.sql`
  ส่วน `select cron.schedule('daily-backup', '0 21 * * *', ...)` (เวลาที่ตั้งเป็น UTC
  ต้องลบ 7 ชั่วโมงจากเวลาไทยที่ต้องการ)

## ความปลอดภัย

- Service Account เข้าถึงได้แค่โฟลเดอร์เดียวที่แชร์ให้ในขั้นที่ 2 เท่านั้น
- คีย์ทั้งหมดเก็บใน Supabase Secrets (ฝั่ง server) ไม่เคยส่งไปฝั่ง browser/frontend เลย
- ไฟล์ JSON คีย์ที่ดาวน์โหลดจาก Google Cloud (ขั้นที่ 1) เก็บไว้เป็นสำรองได้
  แต่ **ห้ามอัปขึ้น GitHub** เหมือนกับไฟล์ backup ข้อมูลลูกค้า (repo โค้ดเป็น public)
