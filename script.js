/* script.js
   - Assumes logo.jpg is in same folder.
   - Uses jsPDF (loaded in index.html).
*/

/* -------------------------
   LocalStorage keys & init
   ------------------------- */
const storage = window.localStorage;
const KEYS = {
  PO_NEXT: 'hd_po_next',
  RP_NEXT: 'hd_rp_next',
  PR_NEXT: 'hd_pr_next',
  PO_LIST: 'hd_po_list',
  RP_LIST: 'hd_rp_list',
  PR_LIST: 'hd_pr_list'
};

function initStorage() {
  if (!storage.getItem(KEYS.PO_NEXT)) storage.setItem(KEYS.PO_NEXT, 'HD-PO-00001');
  if (!storage.getItem(KEYS.RP_NEXT)) storage.setItem(KEYS.RP_NEXT, 'HD-RP-00001');
  if (!storage.getItem(KEYS.PR_NEXT)) storage.setItem(KEYS.PR_NEXT, 'HD-PR-00001');
  if (!storage.getItem(KEYS.PO_LIST)) storage.setItem(KEYS.PO_LIST, JSON.stringify([]));
  if (!storage.getItem(KEYS.RP_LIST)) storage.setItem(KEYS.RP_LIST, JSON.stringify([]));
  if (!storage.getItem(KEYS.PR_LIST)) storage.setItem(KEYS.PR_LIST, JSON.stringify([]));
}
initStorage();

/* -------------------------
   Navigation helpers
   ------------------------- */
function hideAll() {
  document.querySelectorAll('.panel, .form-card, #home').forEach(el => el.style.display = 'none');
}
function showModule(mod) {
  hideAll();
  if (mod === 'po') { document.getElementById('panel-po').style.display = 'block'; renderList('po'); }
  if (mod === 'rp') { document.getElementById('panel-rp').style.display = 'block'; renderList('rp'); }
  if (mod === 'pr') { document.getElementById('panel-pr').style.display = 'block'; renderList('pr'); }
}
function goHome() {
  hideAll();
  document.getElementById('home').style.display = 'block';
}
function openCreate(mod) {
  hideAll();
  if (mod === 'po') { document.getElementById('form-po').style.display = 'block'; poPrepare(); }
  if (mod === 'rp') { document.getElementById('form-rp').style.display = 'block'; rpPrepare(); }
  if (mod === 'pr') { document.getElementById('form-pr').style.display = 'block'; prPrepare(); }
}
function closeForm() {
  document.getElementById('form-po').style.display = 'none';
  document.getElementById('form-rp').style.display = 'none';
  document.getElementById('form-pr').style.display = 'none';
  // return to last module list if any, otherwise homepage
  const last = storage.getItem('hd_last_module');
  if (last) showModule(last);
  else goHome();
}

/* -------------------------
   Utility: increment number
   format: HD-PO-00001 -> HD-PO-00002
   ------------------------- */
function incrementSerial(current) {
  // expects format PREFIX-XXXXX where last part is numbers with leading zeros
  const parts = current.split('-');
  const last = parts.pop();
  const num = parseInt(last, 10) + 1;
  const padded = String(num).padStart(last.length, '0');
  parts.push(padded);
  return parts.join('-');
}

/* -------------------------
   Helpers to convert logo.jpg into dataURL for jsPDF
   ------------------------- */
function getLogoDataURL(callback) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = 'logo.png';
  img.onload = function () {
    const canvas = document.createElement('canvas');
    const maxW = 200; // pixel width we'll fit to
    const ratio = img.width > maxW ? (maxW / img.width) : 1;
    canvas.width = img.width * ratio;
    canvas.height = img.height * ratio;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    try {
      const dataURL = canvas.toDataURL('image/jpeg', 0.9);
      callback(dataURL);
    } catch (e) {
      // fallback: call with null
      callback(null);
    }
  };
  img.onerror = function () { callback(null); };
}

/* -------------------------
   PURCHASE ORDER (PO)
   ------------------------- */
function poPrepare() {
  // set next PO number but do not increment yet
  const next = storage.getItem(KEYS.PO_NEXT);
  document.getElementById('po-no').value = next;
  document.getElementById('po-date').valueAsDate = new Date();
  document.getElementById('po-dept').value = '';
  document.getElementById('po-supplier').value = '';
  document.getElementById('po-tin').value = '';
  document.getElementById('po-address').value = '';
  document.getElementById('po-contact-person').value = '';
  document.getElementById('po-contact-number').value = '';
  document.getElementById('po-items').innerHTML = '';
  poAddItem();
  updatePOTotal();
  storage.setItem('hd_last_module', 'po');
}
function poAddItem(q=1, unit='pcs', desc='', cost=0) {
  const tbody = document.getElementById('po-items');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="po-qty" type="number" min="0" value="${q}" oninput="updatePOTotal()"></td>
    <td><input class="po-unit" value="${unit}"></td>
    <td><input class="po-desc" value="${desc}"></td>
    <td><input class="po-cost" type="number" step="0.01" value="${cost.toFixed(2)}" oninput="updatePOTotal()"></td>
    <td class="po-sub">₱ 0.00</td>
    <td><button class="btn secondary" onclick="this.closest('tr').remove(); updatePOTotal()">Remove</button></td>
  `;
  tbody.appendChild(tr);
}
function updatePOTotal() {
  const rows = document.querySelectorAll('#po-items tr');
  let total = 0;
  rows.forEach(r => {
    const qty = parseFloat(r.querySelector('.po-qty').value || 0);
    const cost = parseFloat(r.querySelector('.po-cost').value || 0);
    const sub = qty * cost;
    total += sub;
    r.querySelector('.po-sub').innerText = '₱ ' + sub.toFixed(2);
  });
  document.getElementById('po-total').innerText = '₱ ' + total.toFixed(2);
}
async function savePO() {
  const po = {
    no: document.getElementById('po-no').value,
    date: document.getElementById('po-date').value || new Date().toISOString().slice(0,10),
    dept: document.getElementById('po-dept').value,
    supplier: document.getElementById('po-supplier').value,
    tin: document.getElementById('po-tin').value,
    address: document.getElementById('po-address').value,
    contact_person: document.getElementById('po-contact-person').value,
    contact_number: document.getElementById('po-contact-number').value,
    prepared_by: document.getElementById('po-prepared-by').value,
    checked_by: document.getElementById('po-checked-by').value,
    approved_by: document.getElementById('po-approved-by').value,
    items: []
  };

  const rows = document.querySelectorAll('#po-items tr');
  let total = 0;
  rows.forEach(r => {
    const qty = parseFloat(r.querySelector('.po-qty').value || 0);
    const unit = r.querySelector('.po-unit').value || '';
    const desc = r.querySelector('.po-desc').value || '';
    const cost = parseFloat(r.querySelector('.po-cost').value || 0);
    const sub = qty * cost;
    total += sub;
    po.items.push({ qty, unit, desc, cost, sub });
  });
  po.total = total;

  // basic validation
  if (!po.supplier) { alert('Please enter supplier name.'); return; }

  // persist
  const list = JSON.parse(storage.getItem(KEYS.PO_LIST) || '[]');
  list.push(po);
  storage.setItem(KEYS.PO_LIST, JSON.stringify(list));

  // increment serial only after successful save
  const cur = storage.getItem(KEYS.PO_NEXT);
  storage.setItem(KEYS.PO_NEXT, incrementSerial(cur));

  // refresh list
  renderList('po');
  alert('Purchase Order saved.');
  closeForm();
}

/* Generate PDF from provided PO object */
function generatePOPdf(po, autoDownload = true) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const left = 40;
  let y = 40;

  return new Promise(resolve => {
    getLogoDataURL((logoData) => {
      if (logoData) {
        try { doc.addImage(logoData, 'JPEG', left, y, 80, 80); } catch (e) {}
      }
      doc.setFontSize(16); doc.text('HOTEL DULCEE', left + 100, y + 20);
      doc.setFontSize(10); doc.text('Brgy. Colon, City of Naga, Cebu', left + 100, y + 38);

      y += 100;
      doc.setFontSize(13); doc.text('PURCHASE ORDER', left, y);
      y += 18;
      doc.setFontSize(10);
      doc.text(`P.O. No.: ${po.no}`, left, y);
      doc.text(`Date: ${po.date}`, 420, y);
      y += 14;
      doc.text(`Department: ${po.dept || ''}`, left, y);
      y += 14;
      doc.text(`Supplier: ${po.supplier}`, left, y);
      y += 12;
      doc.text(`Address: ${po.address || ''}`, left, y);
      y += 12;
      doc.text(`Contact: ${po.contact_person || ''} ${po.contact_number || ''}`, left, y);

      y += 18;
      // table header
      doc.setFontSize(10);
      doc.text('Qty', left, y);
      doc.text('Unit', left + 60, y);
      doc.text('Description', left + 110, y);
      doc.text('Unit Cost', left + 360, y);
      doc.text('Amount', left + 460, y);
      y += 8;
      doc.line(left, y, 560, y);
      y += 14;

      po.items.forEach((it) => {
        doc.text(String(it.qty), left, y);
        doc.text(it.unit || '', left + 60, y);
        // description wrap
        doc.text(String(it.desc || ''), left + 110, y, { maxWidth: 230 });
        doc.text('₱ ' + Number(it.cost).toFixed(2), left + 360, y);
        doc.text('₱ ' + Number(it.sub).toFixed(2), left + 460, y);
        y += 16;
        if (y > 740) { doc.addPage(); y = 40; }
      });

      y += 10;
      doc.setFontSize(12);
      doc.text('TOTAL: ₱ ' + Number(po.total).toFixed(2), left + 360, y);

      y += 30;
      doc.setFontSize(10);
      doc.text('*** NOTHING FOLLOWS ***', left, y);

      y += 30;
      doc.text('Prepared by:', left, y);
      doc.text('Checked by:', left + 180, y);
      doc.text('Approved by:', left + 360, y);

      y += 14;
      doc.text(po.prepared_by || '____________________', left, y);
      doc.text(po.checked_by || '____________________', left + 180, y);
      doc.text(po.approved_by || '____________________', left + 360, y);

      if (autoDownload) {
        doc.save(`${po.no}.pdf`);
      }
      resolve(doc);
    });
  });
}

/* helper used by form 'Generate PDF' button */
function generatePOPdfFromForm() {
  const po = {
    no: document.getElementById('po-no').value,
    date: document.getElementById('po-date').value || new Date().toISOString().slice(0,10),
    dept: document.getElementById('po-dept').value,
    supplier: document.getElementById('po-supplier').value,
    address: document.getElementById('po-address').value,
    contact_person: document.getElementById('po-contact-person').value,
    contact_number: document.getElementById('po-contact-number').value,
    prepared_by: document.getElementById('po-prepared-by').value,
    checked_by: document.getElementById('po-checked-by').value,
    approved_by: document.getElementById('po-approved-by').value,
    items: []
  };
  document.querySelectorAll('#po-items tr').forEach(r => {
    const qty = parseFloat(r.querySelector('.po-qty').value || 0);
    const unit = r.querySelector('.po-unit').value || '';
    const desc = r.querySelector('.po-desc').value || '';
    const cost = parseFloat(r.querySelector('.po-cost').value || 0);
    po.items.push({ qty, unit, desc, cost, sub: qty * cost });
  });
  po.total = po.items.reduce((s, i) => s + i.sub, 0);
  generatePOPdf(po, true);
}

/* -------------------------
   RFP (Request for Payment)
   ------------------------- */
function rpPrepare() {
  document.getElementById('rp-no').value = storage.getItem(KEYS.RP_NEXT);
  document.getElementById('rp-date').valueAsDate = new Date();
  document.getElementById('rp-payee').value = '';
  document.getElementById('rp-tin').value = '';
  document.getElementById('rp-dept').value = '';
  document.getElementById('rp-mode').value = '';
  document.getElementById('rp-for').value = '';
  document.getElementById('rp-amount').value = '';
  document.getElementById('rp-remarks').value = '';
  document.getElementById('rp-requested-by').value = '';
  document.getElementById('rp-checked-by').value = '';
  document.getElementById('rp-recommend').value = '';
  document.getElementById('rp-approved-by').value = '';
  storage.setItem('hd_last_module','rp');
}
function saveRP() {
  const rp = {
    no: document.getElementById('rp-no').value,
    date: document.getElementById('rp-date').value || new Date().toISOString().slice(0,10),
    payee: document.getElementById('rp-payee').value,
    tin: document.getElementById('rp-tin').value,
    dept: document.getElementById('rp-dept').value,
    mode: document.getElementById('rp-mode').value,
    payment_for: document.getElementById('rp-for').value,
    amount: parseFloat(document.getElementById('rp-amount').value || 0),
    remarks: document.getElementById('rp-remarks').value,
    requested_by: document.getElementById('rp-requested-by').value,
    checked_by: document.getElementById('rp-checked-by').value,
    recommend: document.getElementById('rp-recommend').value,
    approved_by: document.getElementById('rp-approved-by').value
  };

  if (!rp.payee) { alert('Please enter payee.'); return; }
  const list = JSON.parse(storage.getItem(KEYS.RP_LIST) || '[]');
  list.push(rp);
  storage.setItem(KEYS.RP_LIST, JSON.stringify(list));

  const cur = storage.getItem(KEYS.RP_NEXT);
  storage.setItem(KEYS.RP_NEXT, incrementSerial(cur));

  renderList('rp');
  alert('Request Payment saved.');
  closeForm();
}
function generateRPPdf(rp, autoDownload = true) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = 40;

  return new Promise(resolve => {
    getLogoDataURL((logoData) => {
      if (logoData) {
        try { doc.addImage(logoData, 'JPEG', 40, 40, 80, 80); } catch (e) {}
      }
      doc.setFontSize(16); doc.text('HOTEL DULCEE', 140, 58);
      doc.setFontSize(12); doc.text('REQUEST FOR PAYMENT', 40, 120);
      y = 140; doc.setFontSize(10);
      doc.text(`RP No.: ${rp.no}`, 40, y);
      doc.text(`Date: ${rp.date}`, 420, y);
      y += 18;
      doc.text(`Payee: ${rp.payee}`, 40, y);
      doc.text(`TIN: ${rp.tin || ''}`, 320, y);
      y += 16;
      doc.text(`Department: ${rp.dept || ''}`, 40, y);
      doc.text(`Mode: ${rp.mode || ''}`, 320, y);
      y += 18;
      doc.text(`Payment For: ${rp.payment_for || ''}`, 40, y);
      doc.text(`Amount: ₱ ${Number(rp.amount||0).toFixed(2)}`, 420, y);
      y += 18;
      doc.text(`Remarks: ${rp.remarks || ''}`, 40, y);

      y += 36;
      doc.text('Requested by:', 40, y);
      doc.text('Checked by:', 220, y);
      doc.text('Recommending Approval:', 380, y);
      doc.text('Approved by:', 550, y);

      y += 14;
      doc.text(rp.requested_by || '____________________', 40, y);
      doc.text(rp.checked_by || '____________________', 220, y);
      doc.text(rp.recommend || '____________________', 380, y);
      doc.text(rp.approved_by || '____________________', 550, y);

      if (autoDownload) doc.save(`${rp.no}.pdf`);
      resolve(doc);
    });
  });
}
function generateRPPdfFromForm() {
  const rp = {
    no: document.getElementById('rp-no').value,
    date: document.getElementById('rp-date').value || new Date().toISOString().slice(0,10),
    payee: document.getElementById('rp-payee').value,
    tin: document.getElementById('rp-tin').value,
    dept: document.getElementById('rp-dept').value,
    mode: document.getElementById('rp-mode').value,
    payment_for: document.getElementById('rp-for').value,
    amount: parseFloat(document.getElementById('rp-amount').value || 0),
    remarks: document.getElementById('rp-remarks').value,
    requested_by: document.getElementById('rp-requested-by').value,
    checked_by: document.getElementById('rp-checked-by').value,
    recommend: document.getElementById('rp-recommend').value,
    approved_by: document.getElementById('rp-approved-by').value
  };
  generateRPPdf(rp, true);
}

/* -------------------------
   PURCHASE REQUISITION (PR)
   ------------------------- */
function prPrepare() {
  document.getElementById('pr-no').value = storage.getItem(KEYS.PR_NEXT);
  document.getElementById('pr-date').valueAsDate = new Date();
  document.getElementById('pr-requester').value = '';
  document.getElementById('pr-dept').value = '';
  document.getElementById('pr-needed').value = '';
  document.getElementById('pr-remarks').value = '';
  document.getElementById('pr-items').innerHTML = '';
  prAddItem();
  storage.setItem('hd_last_module','pr');
}
function prAddItem(stk='', qty=1, unit='pcs', desc='', remark='') {
  const tbody = document.getElementById('pr-items');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="pr-stk" value="${stk}"></td>
    <td><input class="pr-qty" type="number" min="0" value="${qty}"></td>
    <td><input class="pr-unit" value="${unit}"></td>
    <td><input class="pr-desc" value="${desc}"></td>
    <td><input class="pr-remark" value="${remark}"></td>
    <td><button class="btn secondary" onclick="this.closest('tr').remove()">Remove</button></td>
  `;
  tbody.appendChild(tr);
}
function savePR() {
  const pr = {
    no: document.getElementById('pr-no').value,
    date: document.getElementById('pr-date').value || new Date().toISOString().slice(0,10),
    requester: document.getElementById('pr-requester').value,
    dept: document.getElementById('pr-dept').value,
    date_needed: document.getElementById('pr-needed').value,
    remarks: document.getElementById('pr-remarks').value,
    requested_by: document.getElementById('pr-requested-by').value,
    checked_by: document.getElementById('pr-checked-by').value,
    recommend: document.getElementById('pr-recommend').value,
    approved_by: document.getElementById('pr-approved-by').value,
    items: []
  };
  document.querySelectorAll('#pr-items tr').forEach(r => {
    const stk = r.querySelector('.pr-stk').value || '';
    const qty = parseFloat(r.querySelector('.pr-qty').value || 0);
    const unit = r.querySelector('.pr-unit').value || '';
    const desc = r.querySelector('.pr-desc').value || '';
    const remark = r.querySelector('.pr-remark').value || '';
    pr.items.push({ stk, qty, unit, desc, remark });
  });

  if (!pr.requester) { alert('Please enter requester.'); return; }

  const list = JSON.parse(storage.getItem(KEYS.PR_LIST) || '[]');
  list.push(pr);
  storage.setItem(KEYS.PR_LIST, JSON.stringify(list));

  const cur = storage.getItem(KEYS.PR_NEXT);
  storage.setItem(KEYS.PR_NEXT, incrementSerial(cur));

  renderList('pr');
  alert('Purchase Requisition saved.');
  closeForm();
}
function generatePRPdf(pr, autoDownload = true) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = 40;

  return new Promise(resolve => {
    getLogoDataURL((logoData) => {
      if (logoData) {
        try { doc.addImage(logoData, 'JPEG', 40, 40, 80, 80); } catch (e) {}
      }
      doc.setFontSize(16); doc.text('HOTEL DULCEE', 140, 58);
      doc.setFontSize(12); doc.text('PURCHASE REQUISITION', 40, 120);
      y = 140; doc.setFontSize(10);
      doc.text(`MRF No.: ${pr.no}`, 40, y);
      doc.text(`Date: ${pr.date}`, 420, y);
      y += 18;
      doc.text(`Requisitioner: ${pr.requester}`, 40, y);
      doc.text(`Dept: ${pr.dept}`, 320, y);
      y += 18;
      doc.text('Items:', 40, y);
      y += 14;
      pr.items.forEach(it => {
        doc.text(`${it.stk || ''} ${it.qty} ${it.unit || ''} - ${it.desc || ''}`, 40, y);
        if (it.remark) doc.text(`Remarks: ${it.remark}`, 40, y + 12);
        y += 28;
        if (y > 740) { doc.addPage(); y = 40; }
      });
      y += 10;
      doc.text('Requested by:', 40, y);
      doc.text('Checked by:', 220, y);
      doc.text('Recommending Approval:', 380, y);
      doc.text('Approved by:', 560, y);
      y += 14;
      doc.text(pr.requested_by || '____________________', 40, y);
      doc.text(pr.checked_by || '____________________', 220, y);
      doc.text(pr.recommend || '____________________', 380, y);
      doc.text(pr.approved_by || '____________________', 560, y);

      if (autoDownload) doc.save(`${pr.no}.pdf`);
      resolve(doc);
    });
  });
}
function generatePRPdfFromForm() {
  const pr = {
    no: document.getElementById('pr-no').value,
    date: document.getElementById('pr-date').value || new Date().toISOString().slice(0,10),
    requester: document.getElementById('pr-requester').value,
    dept: document.getElementById('pr-dept').value,
    date_needed: document.getElementById('pr-needed').value,
    remarks: document.getElementById('pr-remarks').value,
    requested_by: document.getElementById('pr-requested-by').value,
    checked_by: document.getElementById('pr-checked-by').value,
    recommend: document.getElementById('pr-recommend').value,
    approved_by: document.getElementById('pr-approved-by').value,
    items: []
  };
  document.querySelectorAll('#pr-items tr').forEach(r => {
    const stk = r.querySelector('.pr-stk').value || '';
    const qty = parseFloat(r.querySelector('.pr-qty').value || 0);
    const unit = r.querySelector('.pr-unit').value || '';
    const desc = r.querySelector('.pr-desc').value || '';
    const remark = r.querySelector('.pr-remark').value || '';
    pr.items.push({ stk, qty, unit, desc, remark });
  });
  generatePRPdf(pr, true);
}

/* -------------------------
   Render lists (PO, RP, PR)
   ------------------------- */
function renderList(mod) {
  let list = [];
  if (mod === 'po') list = JSON.parse(storage.getItem(KEYS.PO_LIST) || '[]');
  if (mod === 'rp') list = JSON.parse(storage.getItem(KEYS.RP_LIST) || '[]');
  if (mod === 'pr') list = JSON.parse(storage.getItem(KEYS.PR_LIST) || '[]');

  // filtering by period and search (simple)
  const period = document.getElementById(mod + '-filter') ? document.getElementById(mod + '-filter').value : 'all';
  const from = document.getElementById(mod + '-from') ? document.getElementById(mod + '-from').value : '';
  const to = document.getElementById(mod + '-to') ? document.getElementById(mod + '-to').value : '';
  const search = document.getElementById(mod + '-search') ? document.getElementById(mod + '-search').value.toLowerCase() : '';

  const now = new Date();
  list = list.filter(item => {
    let ok = true;
    if (period === 'weekly') {
      const d = new Date(item.date);
      const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      if (diff > 7) ok = false;
    }
    if (period === 'monthly') {
      const d = new Date(item.date);
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) ok = false;
    }
    if (period === 'yearly') {
      const d = new Date(item.date);
      if (d.getFullYear() !== now.getFullYear()) ok = false;
    }
    if (from && new Date(item.date) < new Date(from)) ok = false;
    if (to && new Date(item.date) > new Date(to)) ok = false;
    if (search && JSON.stringify(item).toLowerCase().indexOf(search) === -1) ok = false;
    return ok;
  });

  const area = document.getElementById(mod + '-list-area');
  area.innerHTML = '';
  if (!list || list.length === 0) {
    area.innerHTML = '<div class="small" style="padding:12px">No records</div>';
    return;
  }

  let html = '<table><thead><tr>';
  if (mod === 'po') html += '<th>PO No.</th><th>Date</th><th>Supplier</th><th>Dept</th><th>Items</th><th>Total</th><th></th>';
  if (mod === 'rp') html += '<th>RP No.</th><th>Date</th><th>Payee</th><th>Amount</th><th></th>';
  if (mod === 'pr') html += '<th>MRF No.</th><th>Date</th><th>Requester</th><th>Dept</th><th>Items</th><th></th>';
  html += '</tr></thead><tbody>';

  list.forEach((it, idx) => {
    if (mod === 'po') {
      html += `<tr><td>${it.no}</td><td>${it.date}</td><td>${it.supplier}</td><td>${it.dept||''}</td><td>${it.items.length}</td><td>₱ ${Number(it.total||0).toFixed(2)}</td><td><button class="btn" onclick="downloadPO(${idx})">PDF</button></td></tr>`;
    }
    if (mod === 'rp') {
      html += `<tr><td>${it.no}</td><td>${it.date}</td><td>${it.payee}</td><td>₱ ${Number(it.amount||0).toFixed(2)}</td><td><button class="btn" onclick="downloadRP(${idx})">PDF</button></td></tr>`;
    }
    if (mod === 'pr') {
      html += `<tr><td>${it.no}</td><td>${it.date}</td><td>${it.requester}</td><td>${it.dept||''}</td><td>${it.items.length}</td><td><button class="btn" onclick="downloadPR(${idx})">PDF</button></td></tr>`;
    }
  });

  html += '</tbody></table>';
  area.innerHTML = html;
}

/* download functions */
function downloadPO(i) {
  const list = JSON.parse(storage.getItem(KEYS.PO_LIST) || '[]');
  if (list[i]) generatePOPdf(list[i], true);
}
function downloadRP(i) {
  const list = JSON.parse(storage.getItem(KEYS.RP_LIST) || '[]');
  if (list[i]) generateRPPdf(list[i], true);
}
function downloadPR(i) {
  const list = JSON.parse(storage.getItem(KEYS.PR_LIST) || '[]');
  if (list[i]) generatePRPdf(list[i], true);
}

/* initial setup */
window.addEventListener('DOMContentLoaded', () => {
  goHome();
  // ensure lists are rendered if panels opened
  renderList('po'); renderList('rp'); renderList('pr');
});
