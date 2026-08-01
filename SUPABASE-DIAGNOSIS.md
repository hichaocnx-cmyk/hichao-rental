# วินิจฉัย Supabase — hichao-rental (30 ก.ค. 2026)

## 🔍 หลักฐานยืนยัน (สำรวจ Storage จริงหลังบริการกลับมา 1 ส.ค. 2026)

พอบริการกลับมาแล้วสำรวจ bucket `camera-images` ได้ ตัวเลขออกมาชัดกว่าที่ประเมินไว้มาก:

| | ค่าที่วัดได้จริง |
|---|---|
| จำนวนรูป | **8 ไฟล์** |
| ขนาดรวม | **63.39 MB** |
| เฉลี่ยต่อรูป | **~7.9 MB** |
| ใหญ่สุด | **13.3 MB** (มี 4 ไฟล์ขนาดนี้) |
| ชนิดไฟล์ | PNG ดิบ ไม่ผ่านการบีบอัด |
| `cache-control` | **`max-age=3600` ทั้ง 8 ไฟล์** (1 ชั่วโมง) |
| thumbnail | **0 ไฟล์** |

**คำนวณย้อนกลับ:**

- เปิดหน้าที่มีรูปครบ 1 ครั้ง (cache เย็น) = โหลด **63 MB**
- cache หมดอายุทุก 1 ชั่วโมง → เข้าใหม่หลังจากนั้นโหลดใหม่ทั้งหมด
- โค้ดเดิมยังยิง `/render/image/` ที่พังก่อน แล้วค่อย fallback ไปรูปเต็ม = เสียคำขอเปล่าอีก 1 รอบ

**63 MB × ~80 ครั้ง = 5 GB** — โควตาแผนฟรีทั้งเดือนหมดได้ในไม่กี่วัน ด้วยรูปแค่ 8 ใบ

หลังกดปุ่ม "จัดระเบียบรูป" ตัวเลขจะกลายเป็น:

| | ก่อน | หลัง |
|---|---|---|
| รูปที่ลิสต์โหลด | 7.9 MB/ใบ | **~20 KB/ใบ (thumb)** — ลด ~400 เท่า |
| Storage รวม | 63 MB | **< 1.5 MB** (700px JPEG + thumb) |
| cache | 1 ชั่วโมง | **1 ปี** |
| เปิดหน้ารายการ 1 ครั้ง | 63 MB | **~160 KB** |

---

## สรุปสั้น

**Login ไม่ได้เพราะโปรเจกต์ Supabase ถูกระงับ ไม่ใช่บั๊กในโค้ด**

ทดสอบยิงตรงไปที่ `ceutmrmtebnprbkotqzy.supabase.co` ได้ผลนี้ทุก endpoint:

```
HTTP 402
{"message":"Service for this project is restricted due to the following violations:
  exceed_cached_egress_quota. The project owner must upgrade their plan or
  remove spend caps to restore service."}
```

| Endpoint | ผล |
|---|---|
| `/auth/v1/token` (login) | **402 restricted** |
| `/rest/v1/cameras` | **402 restricted** |
| `/rest/v1/customers` | **402 restricted** |
| `/storage/v1/bucket` | **402 restricted** |

สิ่งที่ **ไม่ใช่** ปัญหา (ตรวจแล้วปกติ):

- หน้าเว็บ Vercel deploy ปกติ เรนเดอร์ครบ
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` ใน bundle ที่ deploy แล้ว **ตรงกับ `.env`** (ref `ceutmrmtebnprbkotqzy`, anon key หมดอายุปี 2036)
- โค้ด login / AuthContext / RLS policy — ไม่มีอะไรผิด

**`cached_egress` = bandwidth ที่ CDN ส่งออกจาก Storage** แผนฟรีให้ 5 GB/เดือน → ใช้เกิน ระบบตัดบริการทั้งโปรเจกต์

---

## ทำไม egress หมด — ต้นตอที่เจอในโค้ด

### 1. Thumbnail ที่ใช้ไม่ได้เลยในแผนฟรี (หนักสุด)

`CamerasPage.jsx` เดิมแปลง URL เป็น `/storage/v1/render/image/public/...` (Image Transformation)
แต่ **แผนฟรีไม่มีฟีเจอร์นี้** → ยิงไปพัง 1 ครั้ง แล้ว `onError` fallback ไปโหลด**รูปเต็ม**อีก 1 ครั้ง
= เสีย request 2 เท่า และไม่ได้รูปย่อจริงเลย

### 2. ลิสต์ทุกหน้าโหลดรูปเต็มมาแสดงเป็นไอคอนจิ๋ว

| ไฟล์ | ขนาดที่แสดง | ที่โหลดจริง |
|---|---|---|
| `DashboardPage.jsx` | 36 px | รูปเต็ม ~200–400 KB |
| `RentalsPage.jsx` | 56 / 40 px | รูปเต็ม |
| `CalendarPage.jsx` | 40 px | รูปเต็ม |
| `CalendarView.jsx` | 32 px | รูปเต็ม |

เปิดหน้ารายการเช่า 20 รายการบนมือถือที่ยังไม่มี cache ≈ **5–8 MB ต่อครั้ง**

### 3. Service Worker cache response ที่พังไปด้วย (v7)

SW เดิม cache ทั้ง `status === 200` **และ** `res.type === 'opaque'`
opaque คือ response ที่อ่าน status ไม่ได้ — ถ้าตอนนั้น Supabase ตอบ 402 อยู่
เราจะ cache หน้า error ค้างไว้ถาวร รูปพังต่อแม้บริการกลับมาแล้ว

### 4. ปุ่ม "บีบอัดรูปเก่า" กิน egress ทุกครั้งที่กด

`recompressAllImages()` เดิมยิง `fetch(url + '?orig=' + Date.now(), { cache: 'no-store' })`
cache-buster + no-store = **บังคับโหลดรูปต้นฉบับทุกใบใหม่หมด ข้ามทั้ง SW cache และ CDN**
กด 3 ครั้ง = โหลดคลังรูปทั้งหมด 3 รอบ

### 5. เปิดสัญญา/ใบเสร็จ = โหลดรูปใหม่ทุกครั้ง

`toBase64()` ใน `ContractModal` / `InvoiceModal` ใช้ `fetch(url)` เปล่าๆ
request แบบ CORS ไม่ match cache key ของ `<img>` (no-cors) → โหลดซ้ำทุกครั้งที่เปิด

### 6. Realtime refetch ถล่ม

`AppContext` subscribe 4 ตาราง แล้ว refetch **ทั้งตาราง** ต่อ 1 event
`auto_update_rental_status()` (pg_cron ทุก 1 นาที) อัปเดตหลายแถวรวดเดียว → ยิง refetch สิบครั้งใน 1 วินาที

---

## สิ่งที่แก้ให้แล้ว (ในโค้ด)

| ไฟล์ | การแก้ |
|---|---|
| `src/lib/images.js` **(ใหม่)** | สร้าง thumbnail จริงด้วย canvas → เก็บเป็นไฟล์ที่ 2 ที่ `camera-images/thumb/...` (320 px ~20 KB) ไม่พึ่ง Image Transformation อีก |
| `src/components/Thumb.jsx` **(ใหม่)** | คอมโพเนนต์รูปย่อ + `loading="lazy"` + fallback ไปต้นฉบับถ้ายังไม่มี thumb |
| `src/lib/cameras.js` | `uploadCameraImage` อัปโหลด 2 ไฟล์ (main 1000 px + thumb 320 px) · `deleteCamera` ลบ thumb ด้วย · เปลี่ยน `recompressAllImages` → `backfillThumbnails` ที่ `list()` เช็คก่อนว่ามี thumb แล้ว **ข้ามใบที่มีแล้ว** และเลิกใช้ cache-buster |
| Dashboard / Rentals / Calendar / CalendarView / Cameras | เปลี่ยน `<img src={image_url}>` → `<Thumb src={image_url}>` ทุกจุดในลิสต์ |
| `public/sw.js` → **v8** | ยิงแบบ CORS เพื่ออ่าน status ได้จริง **cache เฉพาะ 200** · bump version เพื่อล้าง cache พังของ v7 |
| `ContractModal` / `InvoiceModal` | `fetch(url, { cache: 'force-cache' })` ใช้ HTTP cache (ไฟล์ตั้ง cacheControl 1 ปีไว้แล้ว) |
| `src/context/AppContext.jsx` | debounce realtime refetch 800 ms รวม event เป็นครั้งเดียว |
| `src/lib/supabaseClient.js` | ดัก HTTP 402 ที่จุดเดียว → ยิง event + `friendlyError()` แปลง error เป็นภาษาไทยที่อ่านรู้เรื่อง |
| `src/components/ServiceBanner.jsx` **(ใหม่)** | แถบแดงบนสุด บอกทันทีว่าโปรเจกต์ถูกระงับเพราะโควตา + ลิงก์ไป Billing |
| `src/pages/LoginPage.jsx` | ใช้ `friendlyError()` แทนการโชว์ error ดิบ |

### รอบที่ 2 — ลดต่อจนหมดจุดที่หาได้

| ไฟล์ | การแก้ | ผล |
|---|---|---|
| `ContractModal` / `InvoiceModal` | เปลี่ยนไปใช้ `imageToDataUrl()` ที่ดึง **thumbnail** ก่อน · สัญญาแสดงรูปกล้อง 70×70 px ใบเสร็จ 56×56 px (pixelRatio 2 = สูงสุด 140 px) → **ไม่มีที่ไหนในแอปต้องใช้รูปเต็มอีกแล้ว** | ตัดการโหลดรูปต้นฉบับที่เหลืออยู่จุดสุดท้าย |
| `src/lib/cameras.js` | `backfillThumbnails` เขียน **main ทับด้วย** เพื่อตั้ง cacheControl 1 ปี · รูปเก่าได้ค่าเริ่มต้นของ Supabase = **3600 (1 ชม.)** → เบราว์เซอร์ทิ้ง cache ทุกชั่วโมงแล้วโหลดรูปเต็มใหม่ ทุกครั้งที่เปิดแอป | นี่คือต้นเหตุใหญ่อีกตัวที่มองไม่เห็น |
| `src/pages/RentalsPage.jsx` | **ลบ `setInterval(autoProcess, 60000)` ทิ้ง** — ซ้ำกับ `auto_update_rental_status()` ที่ pg_cron รันทุกนาทีอยู่แล้ว (migration_003/005) · ทุกแท็บที่เปิดหน้านี้เขียน DB แข่งกับ cron และแข่งกันเอง → ทุกการเขียนยิง realtime broadcast → ทุกเครื่อง refetch ทั้งตาราง | ลด write + realtime + race condition |
| `src/lib/rentals.js` | จำกัดช่วงข้อมูล: **ย้อนหลัง 18 เดือน + active/booked ทั้งหมดไม่จำกัดวัน** (หน้ารายงานย้อนได้สูงสุด 6 เดือน จึงเหลือเผื่ออีกเท่าตัว) | payload ไม่โตไม่มีเพดานอีก |
| `src/context/AppContext.jsx` | cache ใน `sessionStorage` (stale-while-revalidate) — refresh/สลับหน้าแล้วเห็นข้อมูลทันที ไม่ต้องรอ skeleton · ตัด realtime เหลือ **rentals + cameras** (customers/expenses เปลี่ยนจากในแอปเท่านั้น และเรียก reload ตรงๆ อยู่แล้ว) | ลด SELECT ซ้ำ + โควตา Realtime |
| `public/logo.png` | **726 KB → 25 KB** (ย่อ 1700×1088 → 625×400 + quantize 256 สี) · ของเดิมใหญ่สุดที่แสดงจริงคือ h-28 = 112 px · เทียบภาพแล้วตาเปล่าแยกไม่ออก | หน้า login เบาลง 700 KB |
| `public/icon-512.png` | 98 KB → 16 KB | |
| `public/icon-192.png` | 25 KB → 6 KB | |
| `public/apple-touch-icon.png` | 22 KB → 5 KB | |

> โลโก้/ไอคอนเสิร์ฟจาก **Vercel ไม่ใช่ Supabase** — ไม่ได้ช่วยโควตา Supabase
> แต่ช่วยความเร็วหน้า login (หน้าที่คุณค้างอยู่ตอนนี้) ลดไป ~795 KB

**ผลรวมที่คาดหวัง**

| จุด | เดิม | ใหม่ |
|---|---|---|
| รูปกล้องในลิสต์ | ~200–400 KB/รูป | ~20 KB/รูป |
| cache รูปในเบราว์เซอร์ | 1 ชั่วโมง | 1 ปี |
| รูปในสัญญา/ใบเสร็จ | ต้นฉบับเต็ม ทุกครั้งที่เปิด | thumb จาก cache |
| request ต่อรูป 1 ใบ | 2 (thumb พัง + รูปเต็ม) | 1 |
| เขียน DB จาก client | ทุก 60 วิ ทุกแท็บ | ไม่มี (server ทำคนเดียว) |
| หน้า login | ~1.5 MB | ~700 KB |

### ตรวจแล้ว

- `node scripts/check.cjs` — ผ่าน 44 ไฟล์ (syntax + TDZ)
- import/export resolve ครบทุกไฟล์
- ไม่มี import ที่ค้างไม่ได้ใช้
- ไม่มี `<img src={...image_url}>` ตรงๆ เหลือใน src แล้ว
- ไม่มี `/render/image/` เหลือใน src แล้ว
- เทียบภาพโลโก้ก่อน/หลังบีบอัดด้วยตา — แยกไม่ออก

**ยัง build ไม่ได้ในเครื่องผม** — `node_modules` เป็นไบนารี Windows (ขาด `@rollup/rollup-linux-x64-gnu`) และ sandbox ไม่มีเน็ตให้ลงใหม่ ต้อง `npm run build` บนเครื่องคุณ

---

## ที่ต้องทำเอง (โค้ดแก้ไม่ได้)

### ขั้นที่ 1 — กู้บริการคืน (ต้องทำก่อน ไม่งั้น login ยังไม่ได้)

เข้า https://supabase.com/dashboard → เลือก organization → **Billing**

เลือกทางใดทางหนึ่ง:

| ทางเลือก | ผล |
|---|---|
| **อัปเกรดเป็น Pro** ($25/เดือน) | โควตา egress 250 GB · กลับมาใช้ได้เกือบทันที · ได้ Image Transformation ด้วย |
| **รอรอบบิลใหม่** | โควตาฟรีรีเซ็ตต้นรอบบิล ระบบปลดล็อกเอง (เอกสาร Supabase ระบุว่าอาจใช้เวลาถึง 24–48 ชม.) — แต่ระหว่างนี้ใช้ระบบไม่ได้เลย |

> ผมไม่ได้กดอัปเกรด/จ่ายเงินให้นะครับ — เรื่องการเงินต้องให้คุณกดเอง
> ถ้ารอรอบบิลแล้วยังถูกระงับอยู่ (มีคนเจอเคสนี้) ให้เปิด ticket ที่ https://supabase.com/support

### ขั้นที่ 2 — deploy โค้ดที่แก้แล้ว

```
npm run check
npm run build
```
แล้ว push ขึ้น Vercel (ใช้ `deploy.bat` / `commit_push.bat` ที่มีอยู่)

### ขั้นที่ 3 — หลังบริการกลับมา จัดระเบียบรูปเก่า

หน้า **กล้องทั้งหมด** → ปุ่ม **"จัดระเบียบรูป"** → กด **ครั้งเดียว**

ต่อ 1 รูปจะ: สร้าง thumb 320px + เขียน main ทับเพื่อตั้ง cache 1 ปี
ครั้งต่อไปมันจะข้ามรูปที่จัดระเบียบแล้ว ไม่โหลดซ้ำ

> ขั้นนี้ต้องดาวน์โหลดรูปต้นฉบับทุกใบ 1 รอบ (ใช้ egress ก้อนหนึ่ง)
> แต่เป็นการลงทุนครั้งเดียวเพื่อไม่ต้องโหลดซ้ำอีกเลย

### ขั้นที่ 4 — เช็ค usage ว่าอะไรกิน bandwidth จริง

Dashboard → **Reports → Storage** และ **Settings → Billing → Usage**
ดูว่า Cached Egress มาจาก bucket ไหน · `daily-queue` bucket ที่ schema สร้างไว้ตอนนี้
ไม่มีโค้ดใช้แล้ว (Edge Function ไม่แตะ storage) — ถ้ามีไฟล์ค้างอยู่ ลบทิ้งได้

### ขั้นที่ 5 — กันไม่ให้เกิดซ้ำ

- Dashboard → **Settings → Billing → Cost Control** ตั้ง spend cap / เปิดอีเมลแจ้งเตือนโควตา
- ถ้าอัปเกรด Pro แล้ว จะใช้ Image Transformation ได้ (แต่โค้ดใหม่ไม่ต้องพึ่งมันก็ได้)

---

---

## รอบที่ 3 — ทำเพิ่มแล้ว + deploy ขึ้น production เรียบร้อย

| จุด | การแก้ |
|---|---|
| **ลบแมว NekoCat ทั้งหมด** | ลบ `src/components/NekoCat.jsx` (795 บรรทัด) + `public/cat.json` (125 KB) + เลิกโหลด `lottie-web` จาก CDN (~250 KB) → **ตัดของที่ต้องโหลดตอนเปิดแอปไป ~375 KB** และ bundle เล็กลง |
| `public/signature-lessor.png` | 48 KB → **6 KB** (ย่อ 1125×788 → 428×300 + quantize 64 สี) · เทียบภาพที่ขนาดแสดงจริงในสัญญาแล้วแยกไม่ออก |
| main image ตอนอัปโหลด | 1000px → **700px** (ที่ใหญ่สุดที่แอปแสดงจริงคือ 140px จึงยังเผื่อไว้ 5 เท่า) |
| `index.html` Google Fonts | ตัดน้ำหนัก 300 ออก (ไม่มี `font-light` ใช้เลยแม้แต่ที่เดียว) เหลือ 400/500/600/700 |
| `supabase/migration_009.sql` **(ใหม่)** | SQL ลบ bucket `daily-queue` ที่ไม่มีโค้ดใช้แล้ว + query ตรวจสอบ cache-control ของไฟล์เดิม · **ยังไม่ได้รัน** รอคุณรันใน SQL Editor เอง |

### ผลบน production (ตรวจสอบจริงบนเว็บที่ deploy แล้ว)

commit `f8221a9` → push ขึ้น `main` → Vercel build เสร็จ ยืนยันแล้วว่า live:

| ไฟล์ | เดิม | บน production ตอนนี้ |
|---|---|---|
| `logo.png` | 726 KB | **25 KB** ✅ |
| `icon-512.png` | 98 KB | **16 KB** ✅ |
| `signature-lessor.png` | 48 KB | **6 KB** ✅ |
| `cat.json` | 125 KB | **ไม่มีแล้ว** ✅ |
| service worker | v7 (มีบั๊ก) | **v8** ✅ |
| JS bundle | 689 KB | **672 KB** ✅ |

และแถบเตือนทำงานถูกต้อง — เปิดหน้า login ตอนนี้ขึ้นข้อความนี้แทน error มั่วๆ:

> ฐานข้อมูลถูกระงับชั่วคราว · ระบบฐานข้อมูล (Supabase) ถูกระงับชั่วคราว
> เพราะใช้ bandwidth (Cached Egress) เกินโควตาแผนฟรี —
> ไม่ใช่ปัญหาที่รหัสผ่านหรือบัญชีของคุณ ต้องแก้ที่ Supabase Dashboard

---

## จุดที่ยังเหลือ (ทำต่อได้ถ้าอยาก)

| จุด | ลดได้เท่าไหร่ | ข้อแลก |
|---|---|---|
| JS bundle 672 KB ก้อนเดียว | code-split ด้วย `React.lazy` ต่อหน้า → โหลดครั้งแรกเหลือ ~200 KB | ต้องใส่ Suspense fallback ทุกหน้า |
| `html-to-image` จาก CDN | โหลดเฉพาะตอนกดสร้างสัญญาอยู่แล้ว — ไม่ต้องแก้ | — |
| `migration_009.sql` | ลบ bucket `daily-queue` คืนพื้นที่ | ต้องรันเองใน SQL Editor |
| ปฏิทินย้อนเกิน 18 เดือน | ถ้าอยากดูย้อนไกลกว่านั้น ต้องเพิ่ม fetch on-demand ตอนเลื่อนเดือน | โค้ดซับซ้อนขึ้น |

---

## หมายเหตุความปลอดภัยที่เจอระหว่างตรวจ (ไม่เกี่ยวกับปัญหานี้)

`supabase/migration_003.sql`, `migration_004.sql` ฝัง anon key ไว้ในไฟล์ SQL แบบ plaintext
anon key เป็น public key อยู่แล้ว (อยู่ใน frontend bundle) จึงไม่ใช่ช่องโหว่โดยตรง
แต่ถ้าวันไหน rotate key จะต้องตามแก้ในหลายที่ — พิจารณาย้ายไปใช้ Vault (`vault.decrypted_secrets`) แทน
