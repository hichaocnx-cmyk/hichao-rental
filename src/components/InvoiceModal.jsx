const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

const fmtDate = (ds) => {
  if (!ds) return '—'
  const [y, m, d] = ds.split('-')
  return `${parseInt(d)} ${MONTHS_TH[parseInt(m) - 1]} ${parseInt(y) + 543}`
}

const fmtTime = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':')
  return `${h}:${m} น.`
}

const calcDays = (start, end) => {
  if (!start || !end) return 0
  // นับแบบ "คืน": รับวันหนึ่ง คืนอีกวัน (ข้ามคืน) = 1 วัน ไม่ใช่ 2 วัน
  return Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000))
}

async function toBase64(url) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export default function InvoiceModal({ rental, onClose }) {
  const days        = calcDays(rental.start_date, rental.end_date)
  const discount    = Number(rental.discount    || 0)
  const totalPrice  = Number(rental.total_price || 0)          // หลังหักส่วนลดแล้ว
  const rentalPrice = totalPrice + discount                      // ราคาก่อนส่วนลด
  const deposit     = Number(rental.deposit     || 0)
  const insurance   = Number(rental.insurance   || 0)
  const deliveryFee = Number(rental.delivery_fee || 0)
  const dueOnPickup = Number(rental.due_on_pickup || 0)
  const invoiceNo   = `HC-${rental.id?.slice(-8).toUpperCase()}`
  const createdDate = rental.created_at ? new Date(rental.created_at) : new Date()
  const createdStr  = `${createdDate.getDate()} ${MONTHS_TH[createdDate.getMonth()]} ${createdDate.getFullYear() + 543}`

  const handlePrint = async () => {
    let cameraImgSrc = ''
    if (rental.camera?.image_url) {
      cameraImgSrc = await toBase64(rental.camera.image_url) || ''
    }

    const cameraImg = cameraImgSrc
      ? `<img src="${cameraImgSrc}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;" />`
      : `<div style="width:56px;height:56px;background:#f3f4f6;border-radius:8px;flex-shrink:0;"></div>`

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8" />
<title>ใบเสร็จ ${invoiceNo}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Sarabun', sans-serif; font-size: 13px; color: #1f2937; background: white; }
  @page { size: A4; margin: 12mm 14mm; }

  .invoice { max-width: 720px; margin: 0 auto; }

  .header { background: #111827; color: white; padding: 24px 28px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: flex-start; }
  .logo-wrap { display: flex; align-items: center; gap: 12px; }
  .logo-icon { width: 48px; height: 48px; background: #0ea5e9; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .logo-icon svg { width: 28px; height: 28px; stroke: white; fill: none; }
  .brand-name { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
  .brand-sub { font-size: 12px; color: #9ca3af; margin-top: 2px; }
  .invoice-meta { text-align: right; }
  .invoice-label { font-size: 10px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
  .invoice-no { font-size: 18px; font-weight: 800; }
  .invoice-date { font-size: 11px; color: #9ca3af; margin-top: 4px; }

  .body { padding: 24px 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }

  .section-label { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .info-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  .info-row { display: flex; gap: 8px; font-size: 12px; margin-bottom: 3px; }
  .info-label { color: #6b7280; width: 80px; flex-shrink: 0; }
  .info-value { color: #111827; font-weight: 500; }

  .item-table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
  .item-table th { background: #f9fafb; padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; }
  .item-table th.right { text-align: right; }
  .item-table th.center { text-align: center; }
  .item-table td { padding: 14px; vertical-align: middle; border-bottom: 1px solid #f3f4f6; }
  .item-table td.right { text-align: right; }
  .item-table td.center { text-align: center; }
  .item-cell { display: flex; align-items: center; gap: 12px; }
  .camera-name { font-weight: 600; font-size: 14px; }
  .camera-brand { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .price-total { font-weight: 800; font-size: 14px; }

  .summary-wrap { display: flex; justify-content: flex-end; margin-bottom: 20px; }
  .summary-box { width: 280px; }
  .sum-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
  .sum-row.discount { color: #7c3aed; font-weight: 600; }
  .sum-row.deduct { color: #16a34a; }
  .sum-row.add-ins { color: #ea580c; }
  .sum-row.add-del { color: #2563eb; }
  .sum-divider { border-top: 2.5px solid #111827; margin: 10px 0 8px; }
  .sum-final { display: flex; justify-content: space-between; align-items: baseline; }
  .sum-final-label { font-size: 15px; font-weight: 700; color: #111827; }
  .sum-final-amount { font-size: 26px; font-weight: 900; color: #111827; }
  .sum-note { font-size: 11px; color: #9ca3af; text-align: right; margin-top: 4px; }
  .discount-badge { display: inline-block; font-size: 10px; font-weight: 700; color: #7c3aed; background: #f5f3ff; border: 1px solid #ddd6fe; padding: 1px 8px; border-radius: 999px; margin-left: 6px; vertical-align: middle; }

  .status-row { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #f3f4f6; margin-bottom: 20px; }
  .badge { font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 999px; }
  .badge-active { background: #fff7ed; color: #c2410c; }
  .badge-returned { background: #f0fdf4; color: #15803d; }
  .invoice-ref { font-size: 11px; color: #9ca3af; }

  .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 28px; text-align: center; border-radius: 0 0 12px 12px; }
  .footer-main { font-size: 13px; font-weight: 600; color: #374151; }
  .footer-sub { font-size: 11px; color: #9ca3af; margin-top: 3px; }

  .notes-box { background: #f9fafb; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; }
  .notes-label { font-size: 10px; color: #9ca3af; font-weight: 600; margin-bottom: 4px; }
  .notes-text { font-size: 12px; color: #374151; }
</style>
</head>
<body>
<div class="invoice">
  <div class="header">
    <div class="logo-wrap">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"/>
        </svg>
      </div>
      <div>
        <div class="brand-name">HICHAO.CNX</div>
        <div class="brand-sub">Camera Rental · เชียงใหม่</div>
      </div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-label">ใบเสร็จรับเงิน</div>
      <div class="invoice-no">${invoiceNo}</div>
      <div class="invoice-date">วันที่ออก: ${createdStr}</div>
    </div>
  </div>

  <div class="body">
    <div class="info-grid">
      <div>
        <div class="section-label">ข้อมูลลูกค้า</div>
        <div class="info-name">${rental.customer?.name || '—'}</div>
        ${rental.customer?.phone ? `<div class="info-row"><span class="info-label">โทร</span><span class="info-value">${rental.customer.phone}</span></div>` : ''}
        ${rental.customer?.line_id ? `<div class="info-row"><span class="info-label">LINE</span><span class="info-value">${rental.customer.line_id}</span></div>` : ''}
        ${rental.customer?.id_card ? `<div class="info-row"><span class="info-label">บัตร ปชช.</span><span class="info-value">${rental.customer.id_card}</span></div>` : ''}
      </div>
      <div>
        <div class="section-label">ข้อมูลการเช่า</div>
        <div class="info-row"><span class="info-label">รับกล้อง</span><span class="info-value">${fmtDate(rental.start_date)}${rental.pickup_time ? ' ' + fmtTime(rental.pickup_time) : ''}</span></div>
        <div class="info-row"><span class="info-label">คืนกล้อง</span><span class="info-value">${fmtDate(rental.end_date)}${rental.return_time ? ' ' + fmtTime(rental.return_time) : ''}</span></div>
        ${rental.pickup_location ? `<div class="info-row"><span class="info-label">สถานที่รับ</span><span class="info-value">${rental.pickup_location}</span></div>` : ''}
        ${rental.return_location ? `<div class="info-row"><span class="info-label">สถานที่คืน</span><span class="info-value">${rental.return_location}</span></div>` : ''}
      </div>
    </div>

    <div class="section-label">รายการ</div>
    <table class="item-table">
      <thead>
        <tr>
          <th>อุปกรณ์</th>
          <th class="center">จำนวนวัน</th>
          <th class="right">ราคาเช่า</th>
          ${discount > 0 ? `<th class="right">ส่วนลด</th>` : ''}
          <th class="right">รวม</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="item-cell">
              ${cameraImg}
              <div>
                <div class="camera-name">${rental.camera?.name || '—'}</div>
                <div class="camera-brand">${rental.camera?.brand || ''}</div>
              </div>
            </div>
          </td>
          <td class="center" style="font-weight:600;">${days} วัน</td>
          <td class="right" style="color:#374151;">฿${rentalPrice.toLocaleString()}</td>
          ${discount > 0 ? `<td class="right" style="color:#7c3aed;font-weight:600;">− ฿${discount.toLocaleString()}</td>` : ''}
          <td class="right price-total">฿${totalPrice.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-wrap">
      <div class="summary-box">
        <div class="sum-row"><span style="color:#374151;">ราคาเช่า (${days} วัน)</span><span style="font-weight:600;">฿${rentalPrice.toLocaleString()}</span></div>
        ${discount > 0 ? `<div class="sum-row discount"><span>ส่วนลด <span class="discount-badge">DISCOUNT</span></span><span>− ฿${discount.toLocaleString()}</span></div>` : ''}
        ${deposit > 0 ? `<div class="sum-row deduct"><span>หัก: ค่าจองมัดจำ</span><span>− ฿${deposit.toLocaleString()}</span></div>` : ''}
        ${insurance > 0 ? `<div class="sum-row add-ins"><span>ค่าประกัน</span><span>+ ฿${insurance.toLocaleString()}</span></div>` : ''}
        ${deliveryFee > 0 ? `<div class="sum-row add-del"><span>ค่าส่ง</span><span>+ ฿${deliveryFee.toLocaleString()}</span></div>` : ''}
        <div class="sum-divider"></div>
        <div class="sum-final">
          <div>
            <div class="sum-final-label">จ่ายวันรับกล้อง</div>
            ${deposit > 0 ? `<div class="sum-note">มัดจำแล้ว ฿${deposit.toLocaleString()}</div>` : ''}
          </div>
          <div class="sum-final-amount">฿${dueOnPickup.toLocaleString()}</div>
        </div>
      </div>
    </div>

    ${rental.notes ? `
    <div class="notes-box">
      <div class="notes-label">หมายเหตุ</div>
      <div class="notes-text">${rental.notes}</div>
    </div>` : ''}

    <div class="status-row">
      <span class="badge ${rental.status === 'returned' ? 'badge-returned' : 'badge-active'}">
        ${rental.status === 'returned' ? '✓ คืนแล้ว' : '● กำลังเช่า'}
      </span>
      <span class="invoice-ref">เลขที่: ${invoiceNo}</span>
    </div>
  </div>

  <div class="footer">
    <div class="footer-main">ขอบคุณที่ใช้บริการ HICHAO.CNX Camera Rental</div>
    <div class="footer-sub">เชียงใหม่ · hichao.cnx@gmail.com</div>
  </div>
</div>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)
    const win = window.open(blobUrl, '_blank')
    if (!win) { alert('กรุณาอนุญาต popup ใน browser เพื่อบันทึก PDF'); return }
    win.onload = () => {
      setTimeout(() => {
        win.focus()
        win.print()
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
      }, 900)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-14 h-14 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-7 h-7 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900">ใบเสร็จ {invoiceNo}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{rental.customer?.name} · {rental.camera?.name}</p>
            <div className="flex gap-4 mt-3 text-sm flex-wrap">
              <div><span className="text-gray-500">ระยะเช่า</span><span className="font-medium text-gray-900 ml-2">{days} วัน</span></div>
              <div><span className="text-gray-500">จ่ายวันรับ</span><span className="font-bold text-brand-600 ml-2">฿{dueOnPickup.toLocaleString()}</span></div>
            </div>
          </div>
        </div>

        {/* Summary preview */}
        <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm space-y-1.5">
          <div className="flex justify-between text-gray-600">
            <span>ราคาเช่า ({days} วัน)</span>
            <span className="font-medium text-gray-900">฿{rentalPrice.toLocaleString()}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-purple-700 font-semibold">
              <span className="flex items-center gap-1.5">
                ส่วนลด
                <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">DISCOUNT</span>
              </span>
              <span>− ฿{discount.toLocaleString()}</span>
            </div>
          )}
          {deposit > 0 && (
            <div className="flex justify-between text-green-700">
              <span>หัก: ค่าจองมัดจำ</span><span>− ฿{deposit.toLocaleString()}</span>
            </div>
          )}
          {insurance > 0 && (
            <div className="flex justify-between text-orange-600">
              <span>ค่าประกัน</span><span>+ ฿{insurance.toLocaleString()}</span>
            </div>
          )}
          {deliveryFee > 0 && (
            <div className="flex justify-between text-blue-600">
              <span>ค่าส่ง</span><span>+ ฿{deliveryFee.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2 mt-1 text-base">
            <span>จ่ายวันรับกล้อง</span>
            <span className="text-brand-600">฿{dueOnPickup.toLocaleString()}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50">
            ปิด
          </button>
          <button onClick={handlePrint} className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
            </svg>
            พิมพ์ / บันทึก PDF
          </button>
        </div>
      </div>
    </div>
  )
}
