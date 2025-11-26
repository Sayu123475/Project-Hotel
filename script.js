const storage = window.localStorage;
const KEYS = {
  PO_NEXT: 'hd_po_next',
  RP_NEXT: 'hd_rp_next',
  PR_NEXT: 'hd_pr_next',
};

function initStorage() {
  if (!storage.getItem(KEYS.PO_NEXT)) storage.setItem(KEYS.PO_NEXT, 'HD-PO-00001');
  if (!storage.getItem(KEYS.RP_NEXT)) storage.setItem(KEYS.RP_NEXT, 'HD-RP-00001');
  if (!storage.getItem(KEYS.PR_NEXT)) storage.setItem(KEYS.PR_NEXT, 'HD-PR-00001');
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
  const last = storage.getItem('hd_last_module');
  if (last) showModule(last);
  else goHome();
}

/* -------------------------
   Utility: increment number
   ------------------------- */
function incrementSerial(current) {
  const parts = current.split('-');
  const last = parts.pop();
  const num = parseInt(last, 10) + 1;
  const padded = String(num).padStart(last.length, '0');
  parts.push(padded);
  return parts.join('-');
}

/* -------------------------
   Logo helper
   ------------------------- */
function getLogoDataURL(callback) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = 'logo.png';
  img.onload = function () {
    const canvas = document.createElement('canvas');
    const maxW = 200;
    const ratio = img.width > maxW ? (maxW / img.width) : 1;
    canvas.width = img.width * ratio;
    canvas.height = img.height * ratio;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    try {
      const dataURL = canvas.toDataURL('image/jpeg', 0.9);
      callback(dataURL);
    } catch (e) {
      callback(null);
    }
  };
  img.onerror = function () { callback(null); };
}

/* -------------------------
   PURCHASE ORDER (PO)
   ------------------------- */
function poPrepare() {
  const next = storage.getItem(KEYS.PO_NEXT);
  document.getElementById('po-no').value = next;
  document.getElementById('po-date').valueAsDate = new Date();
  document.getElementById('po-dept').value = '';
  document.getElementById('po-supplier').value = '';
  document.getElementById('po-tin').value = '';
  document.getElementById('po-address').value = '';
  document.getElementById('po-contact-person').value = '';
  document.getElementById('po-contact-number').value = '';
  document.getElementById('po-prepared-by').value = '';
  document.getElementById('po-checked-by').value = '';
  document.getElementById('po-approved-by').value = '';
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
  const no = document.getElementById('po-no').value;
  const date = document.getElementById('po-date').value || new Date().toISOString().slice(0,10);
  const dept = document.getElementById('po-dept').value;
  const supplier = document.getElementById('po-supplier').value;
  const tin = document.getElementById('po-tin').value;
  const address = document.getElementById('po-address').value;
  const contact_person = document.getElementById('po-contact-person').value;
  const contact_number = document.getElementById('po-contact-number').value;
  const prepared_by = document.getElementById('po-prepared-by').value;
  const checked_by = document.getElementById('po-checked-by').value;
  const approved_by = document.getElementById('po-approved-by').value;

  // FIXED: Collect items with correct field names matching database schema
  const items = [];
  document.querySelectorAll('#po-items tr').forEach(row => {
    const qty = parseFloat(row.querySelector('.po-qty').value || 0);
    const unit = row.querySelector('.po-unit').value || '';
    const description = row.querySelector('.po-desc').value || '';
    const unit_cost = parseFloat(row.querySelector('.po-cost').value || 0);
    const total = qty * unit_cost;
    
    items.push({ qty, unit, description, unit_cost, total });
  });

  const total = items.reduce((sum, item) => sum + item.total, 0);

  const po = {
    no, date, dept, supplier, tin, address, 
    contact_person, contact_number, total,
    prepared_by, checked_by, approved_by,
    items
  };

  try {
    const url = editingPOId ? `http://localhost:3000/api/purchase_orders/${editingPOId}` : "http://localhost:3000/api/purchase_orders";
    const method = editingPOId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(po)
    });

    const text = await response.text();
    let data = null;
    try { data = JSON.parse(text); } catch (e) {}

    if (!response.ok) {
      console.error("Save PO failed:", response.status, text);
      alert("Failed to save PO — server returned " + response.status + (data && data.error ? (": " + data.error) : (": " + text)));
      return;
    }

    if (data && data.success) {
      // on create increment serial
      if (!editingPOId) {
        const cur = storage.getItem(KEYS.PO_NEXT);
        storage.setItem(KEYS.PO_NEXT, incrementSerial(cur));
      }
      // clear editing state and refresh
      editingPOId = null;
      renderList('po');
      alert(editingPOId ? "Purchase Order updated." : "Purchase Order saved to database!");
      closeForm();
    } else {
      console.error("Unexpected response saving PO:", text);
      alert("Failed to save PO: " + (data && data.error ? data.error : text));
    }
  } catch (err) {
    console.error("Error saving PO (network):", err);
    alert("Error saving PO to database. See console for details.");
  }
}

function generatePOPdf(po, autoDownload = true) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  return new Promise(resolve => {
    getLogoDataURL((logoData) => {
      // Header with logo and title
      if (logoData) {
        try { doc.addImage(logoData, 'JPEG', margin, y, 25, 25); } catch (e) {}
      }
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('HOTEL DULCEE', margin + 35, y + 8);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text('Brgy. Colon, City of Naga, Cebu', margin + 35, y + 15);
      
      y += 35;
      
      // Title
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('PURCHASE ORDER', margin, y);
      
      // PO info (right side)
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const rightCol = pageWidth - margin - 60;
      doc.text(`P.O. No.: ${po.no}`, rightCol, y);
      y += 6;
      doc.text(`Date: ${po.date}`, rightCol, y);
      y += 6;
      doc.text(`Dept: ${po.dept || ''}`, rightCol, y);
      
      y += 12;
      
      // Supplier details box
      doc.setLineWidth(0.5);
      doc.rect(margin, y, pageWidth - 2 * margin, 35);
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('Supplier Name:', margin + 3, y + 6);
      doc.setFont(undefined, 'normal');
      doc.text(po.supplier || '___________________', margin + 3, y + 11);
      
      doc.setFont(undefined, 'bold');
      doc.text('TIN #:', margin + 3, y + 18);
      doc.setFont(undefined, 'normal');
      doc.text(po.tin || '', margin + 3, y + 23);
      
      doc.setFont(undefined, 'bold');
      doc.text('Address:', margin + 3, y + 30);
      doc.setFont(undefined, 'normal');
      doc.text(po.address || '', margin + 3, y + 35);
      
      doc.setFont(undefined, 'bold');
      doc.text('Contact Person:', rightCol - 40, y + 6);
      doc.setFont(undefined, 'normal');
      doc.text(po.contact_person || '', rightCol - 40, y + 11);
      
      doc.setFont(undefined, 'bold');
      doc.text('Contact Number:', rightCol - 40, y + 18);
      doc.setFont(undefined, 'normal');
      doc.text(po.contact_number || '', rightCol - 40, y + 23);
      
      y += 40;
      
      // Items table
      const tableTop = y;
      const colWidths = [15, 15, 70, 30, 30, 30];
      const cols = ['STK No.', 'Qty.', 'UNIT', 'ITEM DESCRIPTION', 'Unit Cost', 'Sub-Total'];
      
      // Header
      doc.setFillColor(200, 200, 200);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);
      let xPos = margin;
      cols.forEach((col, i) => {
        doc.rect(xPos, y, colWidths[i], 6, 'F');
        doc.text(col, xPos + 1, y + 4.5);
        xPos += colWidths[i];
      });
      
      y += 6;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      // Items rows
      po.items.forEach((it, idx) => {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = margin;
        }
        
        xPos = margin;
        doc.text(String(idx + 1), xPos + 1, y + 4);
        xPos += colWidths[0];
        
        doc.text(String(it.qty || ''), xPos + 1, y + 4);
        xPos += colWidths[1];
        
        doc.text(it.unit || '', xPos + 1, y + 4);
        xPos += colWidths[2];
        
        doc.text(it.description || '', xPos + 1, y + 4, { maxWidth: colWidths[3] - 2 });
        xPos += colWidths[3];
        
        doc.text('₱ ' + Number(it.unit_cost || 0).toFixed(2), xPos + 1, y + 4);
        xPos += colWidths[4];
        
        doc.text('₱ ' + Number(it.total || 0).toFixed(2), xPos + 1, y + 4);
        
        doc.setDrawColor(180);
        doc.line(margin, y + 5.5, pageWidth - margin, y + 5.5);
        y += 6;
      });
      
      // Total line
      doc.setDrawColor(0);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
      
      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.text('TOTAL: ₱ ' + Number(po.total || 0).toFixed(2), pageWidth - margin - 40, y);
      
      y += 12;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.text('*** NOTHING FOLLOWS ***', margin, y);
      
      y += 15;
      
      // Signatures
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      const sigColWidth = (pageWidth - 2 * margin) / 3;
      
      doc.text('Prepared by:', margin, y);
      doc.text('Checked by:', margin + sigColWidth, y);
      doc.text('Approved by:', margin + 2 * sigColWidth, y);
      
      y += 15;
      doc.setFont(undefined, 'normal');
      doc.text(po.prepared_by || '____________________', margin, y);
      doc.text(po.checked_by || '____________________', margin + sigColWidth, y);
      doc.text(po.approved_by || '____________________', margin + 2 * sigColWidth, y);

      if (autoDownload) {
        doc.save(`${po.no}.pdf`);
      }
      resolve(doc);
    });
  });
}

async function saveRP() {
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

  try {
    const url = editingRPId ? `http://localhost:3000/api/request_payments/${editingRPId}` : "http://localhost:3000/api/request_payments";
    const method = editingRPId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rp)
    });

    const data = await response.json();

    if (data.success) {
      if (!editingRPId) {
        const cur = storage.getItem(KEYS.RP_NEXT);
        storage.setItem(KEYS.RP_NEXT, incrementSerial(cur));
      }
      editingRPId = null;
      renderList('rp');
      alert(method === "PUT" ? "Request for Payment updated." : "Request Payment saved to database!");
      closeForm();
    } else {
      alert("Failed to save: " + (data.error || JSON.stringify(data)));
    }
  } catch (err) {
    console.error("Error saving RP:", err);
    alert("Error saving Request Payment to database.");
  }
}

function generateRPPdf(rp, autoDownload = true) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  return new Promise(resolve => {
    getLogoDataURL((logoData) => {
      // Header
      if (logoData) {
        try { doc.addImage(logoData, 'JPEG', margin, y, 25, 25); } catch (e) {}
      }
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('HOTEL DULCEE', margin + 35, y + 8);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text('Brgy. Colon, City of Naga, Cebu', margin + 35, y + 15);
      
      y += 35;
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('REQUEST FOR PAYMENT', margin, y);
      
      y += 12;
      
      // RP details
      const rightCol = pageWidth - margin - 50;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      doc.setFont(undefined, 'bold');
      doc.text('RP No.:', margin, y);
      doc.setFont(undefined, 'normal');
      doc.text(rp.no || '', margin + 20, y);
      
      doc.setFont(undefined, 'bold');
      doc.text('Date:', rightCol, y);
      doc.setFont(undefined, 'normal');
      doc.text(rp.date || '', rightCol + 15, y);
      
      y += 8;
      
      doc.setFont(undefined, 'bold');
      doc.text('Payee:', margin, y);
      doc.setFont(undefined, 'normal');
      doc.text(rp.payee || '___________________', margin + 20, y);
      
      doc.setFont(undefined, 'bold');
      doc.text('TIN:', rightCol, y);
      doc.setFont(undefined, 'normal');
      doc.text(rp.tin || '', rightCol + 15, y);
      
      y += 8;
      
      doc.setFont(undefined, 'bold');
      doc.text('Department:', margin, y);
      doc.setFont(undefined, 'normal');
      doc.text(rp.dept || '', margin + 20, y);
      
      doc.setFont(undefined, 'bold');
      doc.text('Mode:', rightCol, y);
      doc.setFont(undefined, 'normal');
      doc.text(rp.mode || '', rightCol + 15, y);
      
      y += 8;
      
      doc.setFont(undefined, 'bold');
      doc.text('Payment For:', margin, y);
      doc.setFont(undefined, 'normal');
      doc.text(rp.payment_for || '', margin + 25, y);
      
      doc.setFont(undefined, 'bold');
      doc.text('Amount:', rightCol, y);
      doc.setFont(undefined, 'normal');
      doc.text('₱ ' + Number(rp.amount || 0).toFixed(2), rightCol + 15, y);
      
      y += 8;
      
      doc.setFont(undefined, 'bold');
      doc.text('Remarks:', margin, y);
      doc.setFont(undefined, 'normal');
      doc.text(rp.remarks || '', margin + 20, y, { maxWidth: pageWidth - 2 * margin - 20 });
      
      y += 20;
      
      // Signatures
      const sigColWidth = (pageWidth - 2 * margin) / 4;
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text('Requested by:', margin, y);
      doc.text('Checked by:', margin + sigColWidth, y);
      doc.text('Recommend Approval:', margin + 2 * sigColWidth, y);
      doc.text('Approved by:', margin + 3 * sigColWidth, y);
      
      y += 18;
      doc.setFont(undefined, 'normal');
      doc.text(rp.requested_by || '____________________', margin, y);
      doc.text(rp.checked_by || '____________________', margin + sigColWidth, y);
      doc.text(rp.recommend || '____________________', margin + 2 * sigColWidth, y);
      doc.text(rp.approved_by || '____________________', margin + 3 * sigColWidth, y);

      if (autoDownload) {
        doc.save(`${rp.no}.pdf`);
      }
      resolve(doc);
    });
  });
}

function generatePRPdf(pr, autoDownload = true) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  return new Promise(resolve => {
    getLogoDataURL((logoData) => {
      // Header
      if (logoData) {
        try { doc.addImage(logoData, 'JPEG', margin, y, 25, 25); } catch (e) {}
      }
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('HOTEL DULCEE', margin + 35, y + 8);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text('Brgy. Colon, City of Naga, Cebu', margin + 35, y + 15);
      
      y += 35;
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('PURCHASE REQUISITION FORM', margin, y);
      
      y += 12;
      
      // PR details
      const rightCol = pageWidth - margin - 50;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      doc.setFont(undefined, 'bold');
      doc.text('MRF No.:', margin, y);
      doc.setFont(undefined, 'normal');
      doc.text(pr.no || '', margin + 18, y);
      
      doc.setFont(undefined, 'bold');
      doc.text('Date:', rightCol, y);
      doc.setFont(undefined, 'normal');
      doc.text(pr.date || '', rightCol + 15, y);
      
      y += 8;
      
      doc.setFont(undefined, 'bold');
      doc.text('Requisitioner:', margin, y);
      doc.setFont(undefined, 'normal');
      doc.text(pr.requester || '___________________', margin + 22, y);
      
      doc.setFont(undefined, 'bold');
      doc.text('Dept:', rightCol, y);
      doc.setFont(undefined, 'normal');
      doc.text(pr.dept || '', rightCol + 15, y);
      
      y += 8;
      
      doc.setFont(undefined, 'bold');
      doc.text('Date Needed:', margin, y);
      doc.setFont(undefined, 'normal');
      doc.text(pr.date_needed || '', margin + 22, y);
      
      y += 12;
      
      // Items table
      const colWidths = [18, 15, 18, 80, 30];
      const cols = ['STK NO.', 'Qty', 'Unit', 'Item Description', 'Remarks'];
      
      // Header
      doc.setFillColor(200, 200, 200);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);
      let xPos = margin;
      cols.forEach((col, i) => {
        doc.rect(xPos, y, colWidths[i], 6, 'F');
        doc.text(col, xPos + 1, y + 4.5);
        xPos += colWidths[i];
      });
      
      y += 6;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      // Items rows
      if (Array.isArray(pr.items)) {
        pr.items.forEach((it) => {
          if (y > pageHeight - 40) {
            doc.addPage();
            y = margin;
          }
          
          xPos = margin;
          doc.text(it.stk || '', xPos + 1, y + 4);
          xPos += colWidths[0];
          
          doc.text(String(it.qty || ''), xPos + 1, y + 4);
          xPos += colWidths[1];
          
          doc.text(it.unit || '', xPos + 1, y + 4);
          xPos += colWidths[2];
          
          doc.text(it.desc || it.description || '', xPos + 1, y + 4, { maxWidth: colWidths[3] - 2 });
          xPos += colWidths[3];
          
          doc.text(it.remark || it.remarks || '', xPos + 1, y + 4, { maxWidth: colWidths[4] - 2 });
          
          doc.setDrawColor(180);
          doc.line(margin, y + 5.5, pageWidth - margin, y + 5.5);
          y += 6;
        });
      }
      
      y += 8;
      
      // Signatures
      const sigColWidth = (pageWidth - 2 * margin) / 4;
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text('Requested by:', margin, y);
      doc.text('Checked by:', margin + sigColWidth, y);
      doc.text('Recommend Approval:', margin + 2 * sigColWidth, y);
      doc.text('Approved by:', margin + 3 * sigColWidth, y);
      
      y += 18;
      doc.setFont(undefined, 'normal');
      doc.text(pr.requested_by || '____________________', margin, y);
      doc.text(pr.checked_by || '____________________', margin + sigColWidth, y);
      doc.text(pr.recommend || '____________________', margin + 2 * sigColWidth, y);
      doc.text(pr.approved_by || '____________________', margin + 3 * sigColWidth, y);

      if (autoDownload) {
        doc.save(`${pr.no}.pdf`);
      }
      resolve(doc);
    });
  });
}

/* -------------------------
   FIXED: Render lists from DATABASE
   ------------------------- */
async function renderList(mod) {
  const area = document.getElementById(mod + '-list-area');
  area.innerHTML = '<div style="padding:12px">Loading...</div>';

  try {
    let endpoint = '';
    if (mod === 'po') endpoint = 'http://localhost:3000/api/purchase_orders';
    if (mod === 'rp') endpoint = 'http://localhost:3000/api/request_payments';
    if (mod === 'pr') endpoint = 'http://localhost:3000/api/purchase_requisitions';

    const response = await fetch(endpoint);
    const data = await response.json();
    
    let list = [];
    if (mod === 'pr' && data.data) {
      list = data.data;
    } else if (Array.isArray(data)) {
      list = data;
    }

    // Apply filters
    const period = document.getElementById(mod + '-filter') ? document.getElementById(mod + '-filter').value : 'all';
    const from = document.getElementById(mod + '-from') ? document.getElementById(mod + '-from').value : '';
    const to = document.getElementById(mod + '-to') ? document.getElementById(mod + '-to').value : '';
    const search = document.getElementById(mod + '-search') ? document.getElementById(mod + '-search').value.toLowerCase() : '';
    // NEW: department search input
    const deptSearch = document.getElementById(mod + '-dept-search') ? document.getElementById(mod + '-dept-search').value.toLowerCase().trim() : '';

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
      // NEW: apply department filter (works for PO, RP, PR)
      if (deptSearch) {
        const deptVal = (item.dept || '').toLowerCase();
        if (!deptVal.includes(deptSearch)) ok = false;
      }
      return ok;
    });

    if (!list || list.length === 0) {
      area.innerHTML = '<div class="small" style="padding:12px">No records</div>';
      return;
    }

    let html = '<table><thead><tr>';
    if (mod === 'po') html += '<th>PO No.</th><th>Date</th><th>Supplier</th><th>Dept</th><th>Total</th><th></th>';
    if (mod === 'rp') html += '<th>RP No.</th><th>Date</th><th>Payee</th><th>Amount</th><th></th>';
    if (mod === 'pr') html += '<th>MRF No.</th><th>Date</th><th>Requester</th><th>Dept</th><th></th>';
    html += '</tr></thead><tbody>';

    list.forEach((it) => {
      if (mod === 'po') {
        html += `<tr><td>${it.no}</td><td>${it.date}</td><td>${it.supplier}</td><td>${it.dept||''}</td><td>₱ ${Number(it.total||0).toFixed(2)}</td><td>
          <button class="btn" onclick="downloadPOFromDB(${it.id})">PDF</button>
          <button class="btn" onclick="editPO(${it.id})">Edit</button>
          <button class="btn danger" onclick="deletePO(${it.id})">Delete</button>
        </td></tr>`;
      }
      if (mod === 'rp') {
        html += `<tr><td>${it.no}</td><td>${it.date}</td><td>${it.payee}</td><td>₱ ${Number(it.amount||0).toFixed(2)}</td><td>
          <button class="btn" onclick="downloadRPFromDB(${it.id})">PDF</button>
          <button class="btn" onclick="editRP(${it.id})">Edit</button>
          <button class="btn danger" onclick="deleteRP(${it.id})">Delete</button>
        </td></tr>`;
      }
      if (mod === 'pr') {
        const itemCount = it.items ? (Array.isArray(it.items) ? it.items.length : 0) : 0;
        html += `<tr><td>${it.no}</td><td>${it.date}</td><td>${it.requester}</td><td>${it.dept||''}</td><td>
          <button class="btn" onclick="downloadPRFromDB(${it.id})">PDF</button>
          <button class="btn" onclick="editPR(${it.id})">Edit</button>
          <button class="btn danger" onclick="deletePR(${it.id})">Delete</button>
        </td></tr>`;
      }
    });

    html += '</tbody></table>';
    area.innerHTML = html;

  } catch (err) {
    console.error('Error loading list:', err);
    area.innerHTML = '<div style="padding:12px;color:red">Error loading records. Make sure server is running.</div>';
  }
}

/* Download functions - fetch from database by ID */
async function downloadPOFromDB(id) {
  try {
    const response = await fetch(`http://localhost:3000/api/purchase_orders/${id}`);
    const po = await response.json();
    if (po) generatePOPdf(po, true);
  } catch (err) {
    console.error('Error fetching PO:', err);
    alert('Error loading Purchase Order');
  }
}

async function downloadRPFromDB(id) {
  try {
    const response = await fetch(`http://localhost:3000/api/request_payments/${id}`);
    const rp = await response.json();
    if (rp) generateRPPdf(rp, true);
  } catch (err) {
    console.error('Error fetching RP:', err);
    alert('Error loading Request Payment');
  }
}

async function downloadPRFromDB(id) {
  try {
    const response = await fetch(`http://localhost:3000/api/purchase_requisitions/${id}`);
    const data = await response.json();
    const pr = data.data || data;
    if (pr) generatePRPdf(pr, true);
  } catch (err) {
    console.error('Error fetching PR:', err);
    alert('Error loading Purchase Requisition');
  }
}

/* Initial setup */
window.addEventListener('DOMContentLoaded', () => {
  goHome();
  renderList('po'); 
  renderList('rp'); 
  renderList('pr');
});

// Dark mode toggle
const darkToggle = document.getElementById('darkToggle');
const root = document.documentElement;

if (localStorage.getItem('theme') === 'dark') {
  root.classList.add('dark');
  darkToggle.checked = true;
}

darkToggle.addEventListener('change', () => {
  if (darkToggle.checked) {
    root.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    root.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
});

// add global editing ids
let editingPOId = null;
let editingRPId = null;
let editingPRId = null;

// helper: open form populated for editing
async function editPO(id) {
  try {
    const resp = await fetch(`http://localhost:3000/api/purchase_orders/${id}`);
    if (!resp.ok) throw new Error('Failed to load PO');
    const po = await resp.json();

    // populate form fields
    document.getElementById('po-no').value = po.no || '';
    const dateInput = document.getElementById('po-date');
    if (po.date) {
      // if server returns YYYY-MM-DD set value directly; otherwise parse
      if (/^\d{4}-\d{2}-\d{2}$/.test(po.date)) {
        dateInput.value = po.date;
      } else {
        const d = new Date(po.date);
        if (!isNaN(d)) dateInput.valueAsDate = d;
        else dateInput.value = '';
      }
    } else {
      dateInput.value = '';
    }

    document.getElementById('po-dept').value = po.dept || '';
    document.getElementById('po-supplier').value = po.supplier || '';
    document.getElementById('po-tin').value = po.tin || '';
    document.getElementById('po-address').value = po.address || '';
    document.getElementById('po-contact-person').value = po.contact_person || '';
    document.getElementById('po-contact-number').value = po.contact_number || '';
    document.getElementById('po-prepared-by').value = po.prepared_by || '';
    document.getElementById('po-checked-by').value = po.checked_by || '';
    document.getElementById('po-approved-by').value = po.approved_by || '';

    // populate items table
    document.getElementById('po-items').innerHTML = '';
    if (Array.isArray(po.items) && po.items.length) {
      po.items.forEach(it => poAddItem(it.qty || 0, it.unit || '', it.description || '', Number(it.unit_cost || 0)));
    } else {
      poAddItem();
    }
    updatePOTotal();

    // set editing id and show form
    editingPOId = id;
    storage.setItem('hd_last_module', 'po');
    hideAll();
    document.getElementById('form-po').style.display = 'block';
  } catch (err) {
    console.error('Error loading PO for edit:', err);
    alert('Error loading Purchase Order for edit.');
  }
}

// delete PO
async function deletePO(id) {
  if (!confirm("Delete this Purchase Order? This cannot be undone.")) return;
  try {
    const resp = await fetch(`http://localhost:3000/api/purchase_orders/${id}`, { method: "DELETE" });
    const data = await resp.json();
    if (resp.ok && data.success) {
      alert("Purchase Order deleted.");
      renderList('po');
    } else {
      console.error("Delete failed:", data);
      alert("Failed to delete Purchase Order.");
    }
  } catch (err) {
    console.error("Error deleting PO:", err);
    alert("Error deleting Purchase Order. See console.");
  }
}

// ===== Request for Payment: edit/update/delete =====
async function editRP(id) {
  try {
    const resp = await fetch(`http://localhost:3000/api/request_payments/${id}`);
    if (!resp.ok) throw new Error('Failed to load RP');
    const rp = await resp.json();

    document.getElementById('rp-no').value = rp.no || '';
    const dateInput = document.getElementById('rp-date');
    if (rp.date && /^\d{4}-\d{2}-\d{2}$/.test(rp.date)) dateInput.value = rp.date;
    else if (rp.date) dateInput.valueAsDate = new Date(rp.date);
    else dateInput.value = '';

    document.getElementById('rp-payee').value = rp.payee || '';
    document.getElementById('rp-tin').value = rp.tin || '';
    document.getElementById('rp-dept').value = rp.dept || '';
    document.getElementById('rp-mode').value = rp.mode || '';
    document.getElementById('rp-for').value = rp.payment_for || '';
    document.getElementById('rp-amount').value = rp.amount || '';
    document.getElementById('rp-remarks').value = rp.remarks || '';
    document.getElementById('rp-requested-by').value = rp.requested_by || '';
    document.getElementById('rp-checked-by').value = rp.checked_by || '';
    document.getElementById('rp-recommend').value = rp.recommend || '';
    document.getElementById('rp-approved-by').value = rp.approved_by || '';

    editingRPId = id;
    storage.setItem('hd_last_module','rp');
    hideAll();
    document.getElementById('form-rp').style.display = 'block';
  } catch (err) {
    console.error('Error loading RP for edit:', err);
    alert('Error loading Request for Payment for edit.');
  }
}

async function deleteRP(id) {
  if (!confirm("Delete this Request for Payment? This cannot be undone.")) return;
  try {
    const resp = await fetch(`http://localhost:3000/api/request_payments/${id}`, { method: "DELETE" });
    const data = await resp.json();
    if (resp.ok && data.success) {
      alert("Request for Payment deleted.");
      renderList('rp');
    } else {
      console.error("Delete failed:", data);
      alert("Failed to delete Request for Payment.");
    }
  } catch (err) {
    console.error("Error deleting RP:", err);
    alert("Error deleting Request for Payment. See console.");
  }
}

// ===== Purchase Requisition: edit/update/delete =====
async function editPR(id) {
  try {
    const resp = await fetch(`http://localhost:3000/api/purchase_requisitions/${id}`);
    if (!resp.ok) throw new Error('Failed to load PR');
    const data = await resp.json();
    const pr = data.data || data;

    document.getElementById('pr-no').value = pr.no || '';
    const dateInput = document.getElementById('pr-date');
    if (pr.date && /^\d{4}-\d{2}-\d{2}$/.test(pr.date)) dateInput.value = pr.date;
    else if (pr.date) dateInput.valueAsDate = new Date(pr.date);
    else dateInput.value = '';

    document.getElementById('pr-requester').value = pr.requester || '';
    document.getElementById('pr-dept').value = pr.dept || '';
    document.getElementById('pr-needed').value = pr.date_needed || '';
    document.getElementById('pr-remarks').value = pr.remarks || '';
    document.getElementById('pr-requested-by').value = pr.requested_by || '';
    document.getElementById('pr-checked-by').value = pr.checked_by || '';
    document.getElementById('pr-recommend').value = pr.recommend || '';
    document.getElementById('pr-approved-by').value = pr.approved_by || '';

    // items (clear and populate)
    const tbody = document.getElementById('pr-items');
    tbody.innerHTML = '';
    if (Array.isArray(pr.items)) {
      pr.items.forEach(it => prAddItem(it.stk || '', it.qty || 1, it.unit || '', it.desc || '', it.remark || ''));
    } else {
      prAddItem();
    }

    editingPRId = id;
    storage.setItem('hd_last_module','pr');
    hideAll();
    document.getElementById('form-pr').style.display = 'block';
  } catch (err) {
    console.error('Error loading PR for edit:', err);
    alert('Error loading Purchase Requisition for edit.');
  }
}

async function deletePR(id) {
  if (!confirm("Delete this Purchase Requisition? This cannot be undone.")) return;
  try {
    const resp = await fetch(`http://localhost:3000/api/purchase_requisitions/${id}`, { method: "DELETE" });
    const data = await resp.json();
    if (resp.ok && data.success) {
      alert("Purchase Requisition deleted.");
      renderList('pr');
    } else {
      console.error("Delete failed:", data);
      alert("Failed to delete Purchase Requisition.");
    }
  } catch (err) {
    console.error("Error deleting PR:", err);
    alert("Error deleting Purchase Requisition. See console.");
  }
}