// ---------- main.js: LocalStorage-based prototype logic ----------

// Initialize default admin and data stores on first load
(function init() {
  if (!localStorage.getItem('users')) {
    const admin = {
      id: 1,
      email: 'admin@hotel.com',
      password: 'admin123',
      role: 'admin',
      department: 'Admin',
      approved: true,
      name: 'System Administrator',
      security: ['admin','admin','admin','admin','admin'],
      notifications: []
    };
    localStorage.setItem('users', JSON.stringify([admin]));
  }
  if (!localStorage.getItem('pending')) {
    localStorage.setItem('pending', JSON.stringify([]));
  }
})();

// ---------- Utility helpers ----------
function readUsers(){ return JSON.parse(localStorage.getItem('users') || '[]'); }
function writeUsers(u){ localStorage.setItem('users', JSON.stringify(u)); }
function readPending(){ return JSON.parse(localStorage.getItem('pending') || '[]'); }
function writePending(p){ localStorage.setItem('pending', JSON.stringify(p)); }
function setCurrent(user){ localStorage.setItem('currentUser', JSON.stringify(user)); }
function getCurrent(){ return JSON.parse(localStorage.getItem('currentUser') || 'null'); }
function clearCurrent(){ localStorage.removeItem('currentUser'); }

// ---------- SIGNUP ----------
function handleSignup(){
  const dept = document.getElementById('suDepartment').value.trim();
  const lname = document.getElementById('suLname').value.trim();
  const fname = document.getElementById('suFname').value.trim();
  const mname = document.getElementById('suMname').value.trim();
  const email = document.getElementById('suEmail').value.trim().toLowerCase();
  const password = document.getElementById('suPassword').value;
  const q1 = document.getElementById('q1').value.trim();
  const q2 = document.getElementById('q2').value.trim();
  const q3 = document.getElementById('q3').value.trim();
  const q4 = document.getElementById('q4').value.trim();
  const q5 = document.getElementById('q5').value.trim();

  if(!dept || !lname || !fname || !email || !password || !q1 || !q2 || !q3 || !q4 || !q5){
    return alert('Please fill all required fields and security questions.');
  }

  // check for existing email across approved users and pending
  const users = readUsers();
  const pending = readPending();
  if(users.find(u => u.email === email) || pending.find(p => p.email === email)){
    return alert('Email already exists.');
  }

  const newPending = {
    id: Date.now(),
    email,
    password,
    role: 'user',
    department: dept,
    approved: false,
    name: fname + ' ' + lname + (mname ? ' ' + mname : ''),
    security: [q1, q2, q3, q4, q5],
    notifications: []
  };

  pending.push(newPending);
  writePending(pending);

  alert('Signup submitted. Your account will be approved by the admin. You will receive an email notification when approved.');
  window.location = 'index.html';
}

// ---------- LOGIN ----------
function handleLogin(){
  const email = (document.getElementById('loginEmail').value || '').trim().toLowerCase();
  const password = document.getElementById('loginPassword').value || '';

  const users = readUsers();
  const user = users.find(u => u.email === email && u.password === password);

  if(!user){
    alert('Invalid credentials or account not approved yet.');
    return;
  }
  if(!user.approved){
    alert('Your account is not approved yet. Wait for admin.');
    return;
  }

  setCurrent(user);

  if(user.role === 'admin' || user.department === 'Admin') {
    window.location = 'admin-dashboard.html';
  } else if(user.department === 'Front Desk'){
    window.location = 'frontdesk-dashboard.html';
  } else {
    window.location = 'dept-dashboard.html';
  }
}

// ---------- START PASSWORD RECOVERY ----------
function startRecovery(){
  const email = (document.getElementById('fpEmail').value || '').trim().toLowerCase();
  if(!email) return alert('Enter your email.');

  const users = readUsers();
  const user = users.find(u => u.email === email);
  if(!user){
    return alert('Email not found.');
  }

  localStorage.setItem('recoverEmail', email);
  window.location = 'security.html';
}

// ---------- VERIFY SECURITY ----------
function verifySecurityAnswers(){
  const answers = [];
  for(let i=1;i<=5;i++){
    const val = (document.getElementById('sa'+i).value || '').trim();
    if(!val) return alert('Answer all questions.');
    answers.push(val.toLowerCase());
  }

  const email = localStorage.getItem('recoverEmail');
  const users = readUsers();
  const user = users.find(u => u.email === email);
  if(!user) return alert('No such user.');

  const stored = user.security.map(s => (s||'').toLowerCase());
  if(stored.length !== 5 || !stored.every((v,i)=>v===answers[i])){
    return alert('Security answers do not match.');
  }

  window.location = 'reset.html';
}

// ---------- COMPLETE RESET ----------
function completeReset(){
  const np = document.getElementById('newPassword').value || '';
  const cp = document.getElementById('confirmNewPassword').value || '';
  if(!np || !cp) return alert('Fill passwords.');
  if(np !== cp) return alert('Passwords do not match.');

  const email = localStorage.getItem('recoverEmail');
  const users = readUsers();
  const user = users.find(u => u.email === email);
  if(!user) return alert('No such user.');

  user.password = np;
  writeUsers(users);
  localStorage.removeItem('recoverEmail');
  alert('Password updated. You can now log in.');
  window.location = 'index.html';
}

// ---------- ADMIN DASHBOARD ----------
function adminLoad(){
  const cur = getCurrent();
  if(!cur || cur.role!=='admin'){ window.location='index.html'; return; }
  showSection('approvals');
  refreshPending();
  refreshUsers();
  loadAdminProfile();
  refreshNotifications();
}

function refreshPending(){
  const pending = readPending();
  const tbody = document.querySelector('#pendingTable tbody');
  if(!tbody) return;
  tbody.innerHTML='';
  pending.forEach(p=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${p.name}</td>
      <td>${p.department}</td>
      <td>${p.email}</td>
      <td>
        <button onclick="approvePending(${p.id})">Approve</button>
        <button onclick="rejectPending(${p.id})" style="margin-left:6px">Reject</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function approvePending(id){
  let pending = readPending();
  const idx = pending.findIndex(p=>p.id===id);
  if(idx===-1) return alert('Not found.');
  const approved = pending[idx];
  approved.approved = true;
  const users = readUsers();
  users.push(approved);
  writeUsers(users);
  pending.splice(idx,1);
  writePending(pending);
  // Add notification
  approved.notifications.push({text:`Your account has been approved`, date:new Date().toLocaleString()});
  alert('User approved.');
  refreshPending();
  refreshUsers();
}

function rejectPending(id){
  let pending = readPending();
  const idx = pending.findIndex(p=>p.id===id);
  if(idx===-1) return alert('Not found.');
  pending.splice(idx,1);
  writePending(pending);
  alert('User rejected.');
  refreshPending();
}

function refreshUsers(){
  const users = readUsers();
  const tbody = document.querySelector('#usersTable tbody');
  if(!tbody) return;
  tbody.innerHTML='';
  users.forEach(u=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${u.name}</td>
      <td>${u.department}</td>
      <td>${u.email}</td>
      <td>${u.approved?'Yes':'No'}</td>
      <td>${u.email!=='admin@hotel.com'?`<button onclick="removeUser('${u.email}')">Delete</button>`:''}</td>`;
    tbody.appendChild(tr);
  });
}

function removeUser(email){
  if(!confirm('Delete user '+email+'?')) return;
  let users = readUsers();
  users = users.filter(u=>u.email!==email);
  writeUsers(users);
  refreshUsers();
}

// ---------- DASHBOARDS (Front Desk / Dept User) ----------
function frontdeskLoad(){ dashboardLoad('Front Desk'); }
function deptLoad(){ dashboardLoad(); }

function dashboardLoad(deptRequired){
  const cur = getCurrent();
  if(!cur){ window.location='index.html'; return; }
  if(deptRequired && cur.department!==deptRequired && cur.role!=='admin'){
    alert('Access denied'); window.location='index.html'; return;
  }
  // populate profile
  const nameEl=document.getElementById('dashName');
  const deptEl=document.getElementById('dashDept');
  const emailEl=document.getElementById('dashEmail');
  const editEl=document.getElementById('dashEditName');
  if(nameEl) nameEl.innerText=cur.name;
  if(deptEl) deptEl.innerText=cur.department;
  if(emailEl) emailEl.innerText=cur.email;
  if(editEl) editEl.value=cur.name;
}

function updateProfile(dashPrefix){
  const cur=getCurrent();
  const newName=document.getElementById(dashPrefix+'EditName').value.trim();
  if(!newName) return alert('Enter name.');
  let users=readUsers();
  const u=users.find(x=>x.email===cur.email);
  u.name=newName;
  writeUsers(users);
  setCurrent(u);
  const nameEl=document.getElementById(dashPrefix+'Name');
  if(nameEl) nameEl.innerText=newName;
  alert('Profile updated.');
}

function changePassword(dashPrefix){
  const cur=getCurrent();
  const cp=document.getElementById(dashPrefix+'CurrentPass').value||'';
  const np=document.getElementById(dashPrefix+'NewPass').value||'';
  const cnp=document.getElementById(dashPrefix+'ConfirmPass').value||'';
  if(!cp||!np||!cnp) return alert('Fill all fields.');
  if(cp!==cur.password) return alert('Current password incorrect.');
  if(np!==cnp) return alert('Passwords do not match.');
  let users=readUsers();
  const u=users.find(x=>x.email===cur.email);
  u.password=np;
  writeUsers(users);
  setCurrent(u);
  alert('Password changed.');
}

// ---------- UI helpers ----------
function showSection(id){
  document.querySelectorAll('.section').forEach(s=>s.style.display='none');
  const el=document.getElementById(id);
  if(el) el.style.display='block';
}

// ---------- LOGOUT ----------
function logout(){ clearCurrent(); window.location='index.html'; }
