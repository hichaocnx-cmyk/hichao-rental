# ตั้งค่า Backup อัตโนมัติทุกวัน (ไม่ต้องเปิดแอปเลย)

**เป้าหมาย:** ทุกวันเวลา 04:00 น. (เวลาไทย) ระบบจะดึงข้อมูลทั้ง 4 ตาราง
(กล้อง/ลูกค้า/เช่า/รายจ่าย) เขียนเป็นไฟล์ JSON แล้วอัปขึ้น Google Drive
ให้เองทั้งหมด — ไม่ต้องเปิดแอป ไม่ต้องกดปุ่มอะไรเลย
พร้อมแจ้งผลผ่าน LINE ทุกครั้ง (สำเร็จ/ล้มเหลว)

**หลักการ:** ใช้ pg_cron (ตัวเดียวกับที่ส่งสรุปรายวัน/แจ้งเตือนคิวอยู่แล้ว)
เรียก Edge Function ชื่อ `daily-backup` ทุกวัน ฟังก์ชันนี้ดึงข้อมูลด้วยสิทธิ์
service role (เห็นครบทุกแถวเสมอ ไม่ผ่าน RLS) แล้วอัปโหลดเข้า Google Drive
ด้วย **OAuth ของบัญชี Google เจ้าของร้านเอง** (`hichao.cnx@gmail.com`)

ปุ่ม **"สำรองข้อมูล"** ในแอปเดิมยังใช้งานได้ปกติ — ทั้งสองทางบันทึกประวัติลง
ตารางเดียวกัน (`backup_log`) ป้าย "สำรองล่าสุด" ในแอปจะเห็นทั้งคู่รวมกัน

---

## ⚠️ ทำไมไม่ใช้ Service Account (บันทึกไว้กันหลงทางซ้ำ)

เวอร์ชันแรกของฟีเจอร์นี้ใช้ Google **Service Account** (บัญชีหุ่นยนต์) + แชร์โฟลเดอร์
Drive ให้มัน — **ทำไปจนจบแล้วใช้ไม่ได้** เพราะตั้งแต่ปี 2023 Google ตัดพื้นที่เก็บ
ของ Service Account ทิ้ง อัปโหลดเข้า Drive ของบัญชี Gmail ธรรมดาจะเจอ error:

```
Service Accounts do not have storage quota.
Leverage shared drives, or use OAuth delegation instead.
```

"Shared drive" มีเฉพาะ Google Workspace (บัญชีองค์กรแบบเสียเงิน) — บัญชี Gmail
ธรรมดาไม่มี ทางเดียวที่ใช้ได้จริงคือ **OAuth ของเจ้าของบัญชีเอง** (refresh token)
ไฟล์ที่ได้จึงเป็นของเจ้าของบัญชี และกินโควตา Drive 15GB ของบัญชีนั้นตามปกติ

**อย่ากลับไปใช้ Service Account อีก** ต่อให้เอกสารเก่า/บทความเก่าบอกว่าทำได้

---

## ⚠️ หน้า OAuth consent ต้องเป็น "In production" เท่านั้น

ใน Google Cloud Console → **Google Auth Platform → Audience** ต้องขึ้นว่า
**Publishing status: In production**

ถ้าปล่อยไว้เป็น **Testing** → refresh token จะ**หมดอายุทุก 7 วัน** แล้วการสำรอง
อัตโนมัติจะพังทุกสัปดาห์ (error `invalid_grant`) ต้องมาขอ token ใหม่เรื่อยๆ

เรา publish ได้โดย**ไม่ต้องส่งตรวจ (verification)** เพราะขอสิทธิ์แค่ `drive.file`
ซึ่งเป็น scope แบบ non-sensitive — ถ้าเผลอไปเพิ่ม scope กว้างกว่านี้ (เช่น
`drive` เต็ม) Google จะบังคับให้ส่งตรวจทันที

---

## ค่าที่ตั้งไว้แล้ว (สรุปสถานะปัจจุบัน)

| รายการ | ค่า |
|---|---|
| Google Cloud project | `hichao-backup` |
| OAuth app name | `HICHAO CNX Backup` |
| Publishing status | **In production** |
| Scope | `https://www.googleapis.com/auth/drive.file` (non-sensitive) |
| OAuth client type | Web application, redirect URI = `https://developers.google.com/oauthplayground` |
| โฟลเดอร์ปลายทางใน Drive | `HICHAO-CNX Backup` (ฟังก์ชันสร้าง/หาให้เอง) |
| Supabase project | `ceutmrmtebnprbkotqzy` (hichao-rental) |
| cron job | id 7 — `0 21 * * *` UTC = 04:00 น. เวลาไทย |

---

## ขั้นที่ 1 — สร้าง OAuth client (ทำไปแล้ว)

1. https://console.cloud.google.com/ → โปรเจกต์ `hichao-backup`
2. เปิดใช้ **Google Drive API** (APIs & Services → Library → Enable)
3. **Google Auth Platform → Branding**: ตั้งชื่อแอป, support email,
   home page / privacy policy / terms (ใช้ `https://hichao-rental.vercel.app`)
   และ **Authorized domain** = `hichao-rental.vercel.app`
   (ถ้าไม่กรอกครบ ปุ่ม Publish app จะกดไม่ได้)
4. **Data Access** → Add scope `https://www.googleapis.com/auth/drive.file` → Save
5. **Clients** → Create client → **Web application**
   → Authorized redirect URI = `https://developers.google.com/oauthplayground`
   → Create → **Download JSON** (เก็บไฟล์ไว้ **นอก** โฟลเดอร์โปรเจกต์ เพราะ repo เป็น public)
6. **Audience** → **Publish app** → Confirm → ต้องขึ้น **In production**

---

## ขั้นที่ 2 — ขอ refresh token ด้วย OAuth Playground

1. เปิด https://developers.google.com/oauthplayground/
2. กดรูปเฟือง ⚙ มุมขวาบน → ติ๊ก **Use your own OAuth credentials**
   → วาง **OAuth Client ID** และ **OAuth Client secret** จากไฟล์ JSON ขั้นที่ 1
   (ตรวจว่า **Access type = Offline** และ **Force prompt = Consent Screen**)
   → Close
3. ช่อง **Input your own scopes** (มุมซ้ายล่างของ Step 1) พิมพ์
   `https://www.googleapis.com/auth/drive.file` → กด **Authorize APIs**
4. เลือกบัญชี `hichao.cnx@gmail.com` → ถ้าขึ้น *"Google hasn't verified this app"*
   ให้กด **Advanced → Go to HICHAO CNX Backup (unsafe)** (ปกติ เพราะเป็นแอปของเราเอง)
   → **Continue / Allow**
5. Step 2 → กด **Exchange authorization code for tokens**
   → คัดลอก **Refresh token** (ขึ้นต้นด้วย `1//`)

> refresh token ตัวนี้ใช้ได้ไม่มีวันหมดอายุ ตราบใดที่แอปยังเป็น In production
> และเจ้าของบัญชีไม่ได้กดถอนสิทธิ์ที่ https://myaccount.google.com/permissions

---

## ขั้นที่ 3 — ตั้งค่า Secret ใน Supabase

Supabase Dashboard → โปรเจกต์ `hichao-rental` → **Edge Functions → Secrets**

| ชื่อ | ค่า |
|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | `client_id` จากไฟล์ JSON ขั้นที่ 1 |
| `GOOGLE_OAUTH_CLIENT_SECRET` | `client_secret` จากไฟล์เดียวกัน |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | refresh token จากขั้นที่ 2 (ขึ้นต้น `1//`) |

`LINE_CHANNEL_ACCESS_TOKEN` / `LINE_USER_ID` ใช้ตัวเดิมที่มีอยู่แล้ว ไม่ต้องตั้งซ้ำ

secret เก่าของ Service Account (`GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`,
`GOOGLE_DRIVE_FOLDER_ID`) **ไม่ได้ใช้แล้ว** ลบทิ้งได้

> **บทเรียนจากของจริง:** ครั้งแรกวางค่า `private_key_id` (ยาว 40 ตัว) ลงไปแทน
> `private_key` (ยาว ~1,700 ตัว) เพราะสองคีย์นี้อยู่ติดกันในไฟล์ JSON
> เสียเวลาไล่หาอยู่นาน — ตอนวางค่าอะไรก็ตาม **เช็คความยาวคร่าวๆ ก่อนเสมอ**

---

## ขั้นที่ 4 — Deploy Edge Function + รัน Migration

Deploy ได้ 2 ทาง:

- **ผ่าน Dashboard** (ที่ใช้จริง): Edge Functions → `daily-backup` → แท็บ **Code**
  → แก้/วางโค้ดจาก `supabase/functions/daily-backup/index.ts` → **Deploy updates**
  → กด **Deploy updates** ซ้ำในกล่องยืนยันด้วย (กดรอบเดียวไม่พอ)
- **ผ่าน CLI** (ถ้าเครื่องมี Supabase CLI ผูกไว้): `supabase functions deploy daily-backup`

จากนั้นรัน `supabase/migration_013.sql` ทั้งไฟล์ใน **SQL Editor** (ทำไปแล้ว —
สร้างตาราง `backup_log` + ตั้ง cron job id 7)

---

## ขั้นที่ 5 — ทดสอบ

Supabase Dashboard → **Edge Functions** → `daily-backup` → ปุ่ม **Test**
→ **Send Request** (ไม่ต้องใส่ query parameter อะไร)

ควรได้ผลนี้ภายในไม่กี่วินาที:

- ตอบกลับ `{"ok": true, "counts": {...}, "fileName": "...", "folderId": "..."}`
- ข้อความ LINE "💾 สำรองข้อมูลอัตโนมัติสำเร็จ" พร้อมจำนวนรายการ
- ไฟล์ `hichao-backup-auto-YYYYMMDD-HHMM.json` โผล่ในโฟลเดอร์ **HICHAO-CNX Backup**
  ใน Google Drive ของ `hichao.cnx@gmail.com`
- แถวใหม่ใน `backup_log`: `select * from backup_log order by created_at desc limit 5;`
- เปิดแอป → เมนูซ้ายล่าง ป้าย "สำรองล่าสุด" ควรขึ้น "วันนี้ (อัตโนมัติ)"

---

## แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุที่เป็นไปได้ | วิธีแก้ |
|---|---|---|
| `Service Accounts do not have storage quota` | ยังใช้โค้ดเวอร์ชัน Service Account อยู่ | เปลี่ยนมาใช้ OAuth ตามเอกสารนี้ — ดูหัวข้อ "ทำไมไม่ใช้ Service Account" |
| `Google OAuth: invalid_grant` | refresh token หมดอายุ/ถูกถอน — เกือบทุกครั้งเพราะ consent screen กลับไปเป็น **Testing** | เช็ค Audience ว่าเป็น In production แล้วขอ refresh token ใหม่ตามขั้นที่ 2 |
| `Failed to decode base64: invalid character` | (ของเวอร์ชันเก่า) private key ที่วางมี `\n` เป็นตัวอักษร | ไม่เกี่ยวกับเวอร์ชัน OAuth แล้ว |
| `ยังไม่ได้ตั้งค่า GOOGLE_OAUTH_...` | ตั้ง secret ไม่ครบ/พิมพ์ชื่อผิด | เช็คชื่อ secret ทั้ง 3 ตัวให้ตรงเป๊ะ แล้ว **deploy ฟังก์ชันใหม่** (secret มีผลหลัง deploy ครั้งถัดไป) |
| `Drive find folder: insufficientPermissions` | scope ไม่มี `drive.file` หรือ token ขอมาก่อนเพิ่ม scope | เพิ่ม scope ใน Data Access แล้วขอ refresh token ใหม่ |
| ไม่มีข้อความ LINE เลย | `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_USER_ID` ไม่ได้ตั้งหรือหมดอายุ | เช็คใน Edge Functions → Secrets |
| หาโฟลเดอร์ใน Drive ไม่เจอ | scope `drive.file` สร้างโฟลเดอร์ใหม่ชื่อ `HICHAO-CNX Backup` ที่ระดับบนสุดของ My Drive | ค้นหาชื่อนี้ใน drive.google.com — ย้ายเข้าโฟลเดอร์อื่นได้ปกติ ฟังก์ชันยังหาเจอ |

---

## ต้นทุน / ความถี่

- Google Drive API: ฟรี ใช้พื้นที่ Drive 15GB ของบัญชีเจ้าของ
  (ไฟล์ละ ~73 KB × 365 วัน ≈ 27 MB/ปี — แทบไม่กิน)
- Supabase Edge Function + pg_cron: อยู่ในแผนฟรีอยู่แล้ว
- รันวันละ 1 ครั้ง (04:00 น.) — แก้ตารางเวลาได้ที่ `migration_013.sql`
  ส่วน `select cron.schedule('daily-backup', '0 21 * * *', ...)`
  (เวลาเป็น UTC ต้องลบ 7 ชั่วโมงจากเวลาไทยที่ต้องการ)

## ความปลอดภัย

- scope `drive.file` = แอปเข้าถึงได้**เฉพาะไฟล์/โฟลเดอร์ที่ตัวเองสร้าง**เท่านั้น
  ไฟล์อื่นทั้งหมดใน Google Drive แตะไม่ได้เลย — แคบที่สุดเท่าที่งานนี้ต้องใช้
- คีย์ทั้งหมดเก็บใน Supabase Secrets (ฝั่ง server) ไม่เคยส่งไปฝั่ง browser/frontend
- ไฟล์ backup มีข้อมูลส่วนตัวลูกค้า → โฟลเดอร์ใน Drive ต้องเป็น **"จำกัด" (Restricted)**
  ห้ามตั้งเป็น "ทุกคนที่มีลิงก์" เด็ดขาด
- ไฟล์ JSON ของ OAuth client **ห้ามอัปขึ้น GitHub** (repo โค้ดเป็น public)
  เก็บไว้นอกโฟลเดอร์โปรเจกต์เท่านั้น
- ถ้าสงสัยว่าคีย์รั่ว: เพิกถอนที่ Google Cloud Console → Clients → ลบ client แล้วสร้างใหม่
