import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const app = express();
app.set('trust proxy', 'loopback');
const PORT = Number(process.env.PORT || 3000);
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 1);
const DEFAULT_FOLDER_CAPACITY = Number(process.env.DEFAULT_FOLDER_CAPACITY || 25);
const COOKIE = 'arms_session';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const loginAttempts=new Map();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  next();
});
app.use(express.json({ limit: '1mb' }));

const uuid = () => crypto.randomUUID();
const hashToken = value => crypto.createHash('sha256').update(value).digest('hex');
const userView = user => ({ id:user.id, name:user.full_name, email:user.email, role:user.role, roleTitle:user.role_title, department:user.department });
const recordView = row => ({
  id: row.id, armsRef: row.arms_ref, transactionType: row.transaction_type, materialDoc: row.material_doc,
  deliveryPo: row.delivery_po, grDate: row.gr_date, materialNumber: row.material_number,
  vendorSiteNumber: row.vendor_site_number, vamNumber: row.vam_number, freightOrder: row.freight_order,
  numPackages: row.num_packages, operator: row.operator, encoder: row.encoder, checker: row.checker,
  plateNumber: row.plate_number,
  location: { zone: row.zone || '', shelf: row.shelf || '', folder: row.folder || '', code: row.location_code || '' },
  retentionDate: row.retention_date, retentionStatus: row.retention_status, remarks: row.remarks,
  lineItems: db.prepare('SELECT id,batch_code as batchCode,prod_date as prodDate,exp_date as expDate,quantity FROM record_batches WHERE record_id=?').all(row.id),
  borrowInfo: (()=>{const request=db.prepare("SELECT * FROM borrow_requests WHERE record_id=? AND status IN ('Approved','Returned') ORDER BY created_at DESC LIMIT 1").get(row.id);return request?{borrowerName:`${request.given_name} ${request.family_name}`,familyName:request.family_name,givenName:request.given_name,designation:request.designation,purpose:request.purpose,requestDate:request.request_date,approvedDate:request.approved_date||undefined,transactionSeries:request.transaction_series,approvedBy:request.approved_by||undefined}:undefined;})(),
  status: row.status, custodian: row.custodian, assignedCustodian: row.assigned_custodian,
  createdAt: row.created_at, updatedAt: row.updated_at,
});
const recordSelect = `SELECT r.*,l.zone,l.shelf,l.folder FROM records r LEFT JOIN storage_locations l ON l.id=r.location_id`;
const mapRequest = r => ({ id:r.id, transactionSeries:r.transaction_series, armsRef:r.arms_ref, fileId:r.record_id || '', familyName:r.family_name, givenName:r.given_name, designation:r.designation, purpose:r.purpose, requestDate:r.request_date, status:r.status, approvedBy:r.approved_by, approvedDate:r.approved_date });
const mapNotification = n => ({ id:n.id, title:n.title, message:n.message, transactionSeries:n.transaction_series || '', armsRef:n.arms_ref || '', status:n.status, isRead:Boolean(n.is_read), isStarred:Boolean(n.is_starred), createdAt:n.created_at, borrowRequestId:n.borrow_request_id, borrowerName:n.borrower_name, designation:n.designation, purpose:n.purpose });
const mapActivity = a => ({ id:a.id, type:a.type, title:a.title, description:a.description, armsRef:a.arms_ref, user:a.user_name, timestamp:new Date(a.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }), statusBadge:a.status_badge, createdAt:a.created_at });

const sessionUser = (req, res, next) => {
  const token = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!token) return res.status(401).json({ error:'Authentication required' });
  const row = db.prepare(`SELECT u.*,s.id AS session_id,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?`).get(hashToken(decodeURIComponent(token)));
  if (!row || new Date(row.expires_at) <= new Date()) {
    if (row) db.prepare('DELETE FROM sessions WHERE id=?').run(row.session_id);
    return res.status(401).json({ error:'Session expired' });
  }
  req.user = userView(row); req.sessionId = row.session_id;
  next();
};
const managementOnly = (req, res, next) => req.user.role === 'management' ? next() : res.status(403).json({ error:'Management role required' });
const mutatingRequest = (req, res, next) => {
  const origin = req.get('origin');
  if (origin) {
    const remoteAddress = req.socket.remoteAddress || '';
    const localProxy = remoteAddress === '127.0.0.1' || remoteAddress === '::1' || remoteAddress === '::ffff:127.0.0.1';
    const host = (localProxy && req.get('x-forwarded-host')) || req.get('host');
    const forwardedProto = localProxy && req.get('x-forwarded-proto');
    const protocol = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;
    let originUrl;
    try { originUrl = new URL(origin); } catch { return res.status(403).json({ error:'Cross-origin request rejected' }); }
    if (originUrl.origin !== `${protocol}://${host}`) return res.status(403).json({ error:'Cross-origin request rejected' });
  }
  if (req.get('x-arms-request') !== '1') return res.status(403).json({ error:'Request validation failed' });
  next();
};
app.use('/api', (req,res,next) => ['GET','HEAD','OPTIONS'].includes(req.method) ? next() : mutatingRequest(req,res,next));
app.use('/api', (req,res,next) => req.path === '/login' || req.path === '/session' || req.path === '/health' ? next() : sessionUser(req,res,next));

function addActivity(user, type, title, description, armsRef = null, badge = null) {
  db.prepare('INSERT INTO activity_logs(id,type,title,description,arms_ref,user_name,user_email,user_id,status_badge) VALUES(?,?,?,?,?,?,?,?,?)')
    .run(uuid(), type, title, description, armsRef, user.name, user.email, user.id, badge);
}
function upsertLocation(location, capacity = DEFAULT_FOLDER_CAPACITY, updateCapacity = false) {
  const zone = String(location?.zone || '').trim();
  const shelf = String(location?.shelf || '').trim();
  const folder = String(location?.folder || '').trim();
  if (!zone || !shelf || !folder) throw new Error('Zone, shelf, and folder are required');
  const id = uuid();
  const existing = db.prepare('SELECT id FROM storage_locations WHERE zone=? AND shelf=? AND folder=?').get(zone,shelf,folder);
  if (existing) {
    if (updateCapacity) db.prepare('UPDATE storage_locations SET max_capacity=? WHERE id=?').run(Math.max(1, Number(capacity) || 1), existing.id);
    return existing.id;
  }
  db.prepare('INSERT INTO storage_locations(id,zone,shelf,folder,max_capacity) VALUES(?,?,?,?,?)').run(id, zone, shelf, folder, Math.max(1, Number(capacity) || DEFAULT_FOLDER_CAPACITY));
  return id;
}
function generateArmsRef(transactionType) {
  const categories = [
    [/IFT/i, 'IB', 'IFT'], [/local.*(delivery|resupply)/i, 'IB', 'LOC'],
    [/outbound|dispatch/i, 'OB', 'DIS'], [/scrap/i, 'SC', 'SCR'],
    [/inventory|cycle/i, 'INV', 'CYC'],
  ];
  const category = categories.find(([pattern]) => pattern.test(String(transactionType)));
  const [prefix,code] = category ? category.slice(1) : ['OT','OTH'];
  const year = new Date().getFullYear();
  const start = `${prefix}${year}-${code}`;
  const existing = db.prepare('SELECT arms_ref FROM records WHERE arms_ref LIKE ? ORDER BY arms_ref DESC LIMIT 1').get(`${start}%`);
  const next = existing ? (Number(existing.arms_ref.slice(start.length)) || 0) + 1 : 1;
  return `${start}${String(next).padStart(3,'0')}`;
}
function saveRecord(input, user, id = uuid()) {
  if (!input.transactionType) throw new Error('Transaction type is required');
  input.armsRef ||= generateArmsRef(input.transactionType);
  const locationId = upsertLocation(input.location, input.folderCapacity || DEFAULT_FOLDER_CAPACITY);
  const folder = db.prepare('SELECT max_capacity FROM storage_locations WHERE id=?').get(locationId);
  const used = db.prepare('SELECT count(*) AS n FROM records WHERE location_id=? AND id<>?').get(locationId,id).n;
  if (used >= folder.max_capacity) throw new Error('Selected folder is at capacity');
  const fields = [input.armsRef,input.transactionType,input.materialDoc || '',input.deliveryPo || '',input.grDate || '',input.materialNumber || '',input.vendorSiteNumber || '',input.vamNumber || '',input.freightOrder || '',Number(input.numPackages)||0,input.operator||'',input.encoder||user.name,input.checker||'',input.plateNumber||'',locationId,input.location?.code||'',input.retentionDate||'',input.retentionStatus||'Active',input.remarks||'',input.status||'Available',input.assignedCustodian||user.name,input.custodian||input.assignedCustodian||user.name];
  const tx = db.transaction(() => {
    if (db.prepare('SELECT id FROM records WHERE id=?').get(id)) {
      db.prepare(`UPDATE records SET arms_ref=?,transaction_type=?,material_doc=?,delivery_po=?,gr_date=?,material_number=?,vendor_site_number=?,vam_number=?,freight_order=?,num_packages=?,operator=?,encoder=?,checker=?,plate_number=?,location_id=?,location_code=?,retention_date=?,retention_status=?,remarks=?,status=?,assigned_custodian=?,custodian=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(...fields,id);
      db.prepare('DELETE FROM record_batches WHERE record_id=?').run(id);
    } else {
      db.prepare(`INSERT INTO records(arms_ref,transaction_type,material_doc,delivery_po,gr_date,material_number,vendor_site_number,vam_number,freight_order,num_packages,operator,encoder,checker,plate_number,location_id,location_code,retention_date,retention_status,remarks,status,assigned_custodian,custodian,id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(...fields,id);
    }
    for (const batch of input.lineItems || []) db.prepare('INSERT INTO record_batches(id,record_id,batch_code,prod_date,exp_date,quantity) VALUES(?,?,?,?,?,?)').run(uuid(),id,batch.batchCode||'',batch.prodDate||'',batch.expDate||'',batch.quantity||'');
  });
  tx(); return id;
}

app.get('/api/health', (_req,res) => {
  const setupRequired = db.prepare('SELECT COUNT(*) AS count FROM users').get().count === 0;
  res.json({ ok:true, setupRequired });
});
app.get('/api/session', (req,res,next) => sessionUser(req,res,() => {
  db.prepare('UPDATE sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE id=?').run(req.sessionId);
  res.json({ user:req.user });
}));
app.post('/api/login', (req,res) => {
  const username = String(req.body?.username || req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const source=req.ip||req.socket.remoteAddress||'unknown';
  const prior=loginAttempts.get(source)||{count:0,until:0};
  if(prior.until>Date.now()&&prior.count>=10)return res.status(429).json({error:'Too many sign-in attempts. Try again later.'});
  const user = db.prepare('SELECT * FROM users WHERE username=? OR email=?').get(username,username);
  if (!user || !bcrypt.compareSync(password,user.password_hash)) {
    const count=prior.until>Date.now()?prior.count+1:1;loginAttempts.set(source,{count,until:Date.now()+15*60*1000});
    return res.status(401).json({ error:'Invalid username or password' });
  }
  loginAttempts.delete(source);
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  db.prepare('INSERT INTO sessions(id,user_id,token_hash,expires_at,last_seen_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)').run(uuid(),user.id,hashToken(token),expires);
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DAYS*86400}${req.secure?'; Secure':''}`);
  addActivity(userView(user),'login','User signed in',`${user.full_name} signed in to the local archive portal`);
  res.json({ user:userView(user) });
});
app.post('/api/logout', (req,res) => {
  if(req.user)addActivity(req.user,'logout','User signed out',`${req.user.name} signed out of the local archive portal`);
  const token = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hashToken(decodeURIComponent(token)));
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
  res.json({ ok:true });
});
app.get('/api/private/data', (req,res) => {
  const records = db.prepare(`${recordSelect} ORDER BY r.created_at DESC`).all().map(recordView);
  const requests = db.prepare('SELECT * FROM borrow_requests ORDER BY created_at DESC').all().map(mapRequest);
  const notifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC').all().map(mapNotification);
  const dailyLogs = db.prepare('SELECT * FROM log_counts ORDER BY created_at DESC').all().map(r=>({ id:r.id,date:r.date,inbound:r.inbound,outbound:r.outbound,scrap:r.scrap,inventory:r.inventory,rhTemp:r.rh_temp,rackInspections:r.rack_inspections,mhePreOps:r.mhe_pre_ops,submittedBy:r.submitted_by,submittedAt:r.created_at }));
  const logEntries = db.prepare('SELECT e.*,u.full_name AS created_by_name FROM log_entries e JOIN users u ON u.id=e.created_by ORDER BY e.created_at DESC,e.rowid DESC').all().map(r=>({ id:r.id,uniqueCode:r.unique_code,transactionType:r.transaction_type,materialNumber:r.material_number,materialDescription:r.material_description,date:r.gr_date,po:r.po,drInvNumber:r.dr_inv_number,proNumber:r.pro_number,vamNumber:r.vam_number,plateNumber:r.plate_number,operator:r.operator,materialCondition:r.material_condition,truckCvCondition:r.truck_cv_condition,noInfestation:r.no_infestation,truckCvOdor:r.truck_cv_odor,truckCvSeal:r.truck_cv_seal,gateIn:r.gate_in,unloadingStart:r.unloading_start,unloadingEnd:r.unloading_end,dwellMinutes:r.dwell_minutes,createdBy:r.created_by_name,createdAt:r.created_at }));
  const activities = db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100').all().map(mapActivity);
  const activeUsers = db.prepare('SELECT DISTINCT u.id,u.full_name,u.email,u.role,s.last_seen_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.expires_at>CURRENT_TIMESTAMP AND s.last_seen_at>=datetime(\'now\',\'-2 minutes\')').all().map(u=>({ userId:u.id,name:u.full_name,email:u.email,role:u.role,onlineAt:u.last_seen_at }));
  res.json({ user:req.user, records, requests, notifications, dailyLogs, logEntries, activities, activeUsers });
});
app.post('/api/private/heartbeat', (req,res)=>{ db.prepare('UPDATE sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE id=?').run(req.sessionId); res.json({ok:true}); });
app.post('/api/private/records', (req,res) => {
  try { const id=saveRecord(req.body,req.user); const saved=recordView(db.prepare(`${recordSelect} WHERE r.id=?`).get(id)); addActivity(req.user,'upload','Record registered',`Registered ${saved.armsRef}`,saved.armsRef,'Available'); res.status(201).json(saved); }
  catch(e){ res.status(400).json({error:e.message}); }
});
app.put('/api/private/records/:id', (req,res) => {
  try { saveRecord(req.body,req.user,req.params.id); res.json(recordView(db.prepare(`${recordSelect} WHERE r.id=?`).get(req.params.id))); }
  catch(e){ res.status(400).json({error:e.message}); }
});
app.delete('/api/private/records/:id', managementOnly, (req,res) => { db.prepare('DELETE FROM records WHERE id=?').run(req.params.id); res.json({ok:true}); });
app.post('/api/private/borrow-requests', (req,res) => {
  const input=req.body||{}; const record=db.prepare('SELECT * FROM records WHERE arms_ref=?').get(input.armsRef);
  if(!record || record.status!=='Available') return res.status(400).json({error:'File is missing or unavailable'});
  const next=db.prepare(`SELECT COALESCE(MAX(CAST(substr(transaction_series,6) AS INTEGER)),0)+1 AS n FROM borrow_requests WHERE transaction_series LIKE ?`).get(`${new Date().getFullYear()}-%`).n;
  const series=`${new Date().getFullYear()}-${String(next).padStart(3,'0')}`; const id=uuid();
  const tx=db.transaction(()=>{
    db.prepare('INSERT INTO borrow_requests(id,transaction_series,arms_ref,record_id,family_name,given_name,designation,purpose,request_date) VALUES(?,?,?,?,?,?,?,?,?)').run(id,series,input.armsRef,record.id,input.familyName,input.givenName,input.designation,input.purpose,input.date);
    db.prepare("UPDATE records SET status='Pending',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(record.id);
    db.prepare('INSERT INTO notifications(id,title,message,transaction_series,arms_ref,status,is_starred,borrow_request_id,borrower_name,designation,purpose) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(uuid(),'Pending Approval',`Requisition to borrow ARMS Ref. ${input.armsRef} is pending approval.`,series,input.armsRef,'Pending',1,id,`${input.givenName} ${input.familyName}`,input.designation,input.purpose);
    addActivity(req.user,'borrow','Pull-Out Request Submitted',`Requested ${input.armsRef} for ${input.purpose} (${series})`,input.armsRef,'Pending');
  });
  try { tx(); res.status(201).json({transactionSeries:series,armsRef:input.armsRef}); } catch(e){res.status(400).json({error:e.message});}
});
app.post('/api/private/notifications/:id/decision', managementOnly, (req,res) => {
  const { decision }=req.body||{}; const n=db.prepare('SELECT * FROM notifications WHERE id=?').get(req.params.id);
  if(!n?.borrow_request_id || !['approve','reject'].includes(decision)) return res.status(400).json({error:'Invalid requisition decision'});
  const approved=decision==='approve'; const title=approved?'Request Approved':'Request Rejected'; const status=approved?'Approved':'Rejected';
  db.transaction(()=>{
    db.prepare('UPDATE borrow_requests SET status=?,approved_by=?,approved_by_id=?,approved_date=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status,approved?req.user.name:null,approved?req.user.id:null,approved?new Date().toISOString().slice(0,10):null,n.borrow_request_id);
    db.prepare('UPDATE records SET status=?,updated_at=CURRENT_TIMESTAMP WHERE arms_ref=?').run(approved?'Borrowed':'Available',n.arms_ref);
    db.prepare('UPDATE notifications SET status=?,title=?,message=?,is_read=1 WHERE id=?').run(status,title,`${n.arms_ref} was ${status.toLowerCase()} by ${req.user.name}.`,n.id);
    addActivity(req.user,approved?'approval':'reject',title,`${req.user.name} ${status.toLowerCase()} request for ${n.arms_ref}`,n.arms_ref,status);
  })(); res.json({ok:true});
});
app.post('/api/private/records/:armsRef/return', (req,res) => {
  const record=db.prepare('SELECT * FROM records WHERE arms_ref=?').get(req.params.armsRef);
  if(!record || record.status!=='Borrowed') return res.status(400).json({error:'File is not currently borrowed'});
  db.transaction(()=>{
    db.prepare("UPDATE records SET status='Available',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(record.id);
    db.prepare("UPDATE borrow_requests SET status='Returned',updated_at=CURRENT_TIMESTAMP WHERE arms_ref=? AND status='Approved'").run(record.arms_ref);
    db.prepare("INSERT INTO notifications(id,title,message,arms_ref,status) VALUES(?,?,?,?, 'System')").run(uuid(),'File Check-In Completed',`${record.arms_ref} was returned to storage.`,record.arms_ref);
    addActivity(req.user,'return','File Returned to Archive',`${record.arms_ref} checked back into the archive`,record.arms_ref,'Returned');
  })(); res.json({ok:true});
});
app.post('/api/private/log-counts', (req,res) => {
  const d=req.body||{}; const id=uuid();
  db.prepare('INSERT INTO log_counts(id,date,inbound,outbound,scrap,inventory,rh_temp,rack_inspections,mhe_pre_ops,submitted_by,user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,d.date,Number(d.inbound)||0,Number(d.outbound)||0,Number(d.scrap)||0,Number(d.inventory)||0,Number(d.rhTemp)||0,Number(d.rackInspections)||0,Number(d.mhePreOps)||0,req.user.name,req.user.id);
  addActivity(req.user,'log_count','Daily Log Count Recorded',`Shift counts logged: ${d.inbound} Inbound, ${d.outbound} Outbound, ${d.scrap} Scrap, ${d.inventory} Inventory`,null,'Shift Log');
  res.status(201).json({id});
});
app.post('/api/private/log-entries', (req,res) => {
  const input=req.body||{};
  const transactionType=String(input.transactionType||'').trim();
  if(!transactionType) return res.status(400).json({error:'Select Transaction is required'});
  const conditionFields=['materialCondition','truckCvCondition','noInfestation','truckCvOdor','truckCvSeal'];
  if(conditionFields.some(name=>!['OK','NOT OK'].includes(input[name]))) return res.status(400).json({error:'Choose OK or NOT OK for each inspection condition'});
  const gateIn=String(input.gateIn||'').trim();
  const unloadingStart=String(input.unloadingStart||'').trim();
  const unloadingEnd=String(input.unloadingEnd||'').trim();
  const validTime=value=>value===''||/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  if(![gateIn,unloadingStart,unloadingEnd].every(validTime)) return res.status(400).json({error:'Enter valid truck times in HH:MM format'});
  const clockMinutes=value=>value?Number(value.slice(0,2))*60+Number(value.slice(3,5)):null;
  let dwellMinutes=null;
  if(gateIn&&unloadingEnd){dwellMinutes=clockMinutes(unloadingEnd)-clockMinutes(gateIn);if(dwellMinutes<0)dwellMinutes+=24*60;}
  const fields={
    materialNumber:String(input.materialNumber||'').trim(),
    materialDescription:String(input.materialDescription||'').trim(),
    date:String(input.date||'').trim(),
    po:String(input.po||'').trim(),
    drInvNumber:String(input.drInvNumber||'').trim(),
    proNumber:String(input.proNumber||'').trim(),
    operator:String(input.operator||'').trim(),
    vamNumber:String(input.vamNumber||'').trim(),
    plateNumber:String(input.plateNumber||'').trim(),
    materialCondition:input.materialCondition,
    truckCvCondition:input.truckCvCondition,
    noInfestation:input.noInfestation,
    truckCvOdor:input.truckCvOdor,
    truckCvSeal:input.truckCvSeal,
    gateIn,unloadingStart,unloadingEnd,dwellMinutes,
  };
  const create=db.transaction(()=>{
    const day=new Date().toISOString().slice(0,10).replace(/-/g,'');
    let uniqueCode='';
    for(let attempt=0;attempt<32;attempt++){
      const candidate=`LOG-${day}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      if(!db.prepare('SELECT 1 FROM log_entries WHERE unique_code=?').get(candidate)){uniqueCode=candidate;break;}
    }
    if(!uniqueCode) throw new Error('Could not generate a unique log reference. Please try again.');
    const id=uuid();
    db.prepare(`INSERT INTO log_entries
      (id,unique_code,transaction_type,material_number,material_description,gr_date,po,dr_inv_number,pro_number,vam_number,plate_number,operator,material_condition,truck_cv_condition,no_infestation,truck_cv_odor,truck_cv_seal,gate_in,unloading_start,unloading_end,dwell_minutes,created_by)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,uniqueCode,transactionType,fields.materialNumber,fields.materialDescription,fields.date,fields.po,fields.drInvNumber,fields.proNumber,fields.vamNumber,fields.plateNumber,fields.operator,fields.materialCondition,fields.truckCvCondition,fields.noInfestation,fields.truckCvOdor,fields.truckCvSeal,fields.gateIn,fields.unloadingStart,fields.unloadingEnd,fields.dwellMinutes,req.user.id);
    addActivity(req.user,'log_entry','Pre-Print Log Entry Created',`Created ${uniqueCode} for ${transactionType}`,uniqueCode,'Pre-Print');
    const row=db.prepare('SELECT * FROM log_entries WHERE id=?').get(id);
    return {id:row.id,uniqueCode:row.unique_code,transactionType:row.transaction_type,materialNumber:row.material_number,materialDescription:row.material_description,date:row.gr_date,po:row.po,drInvNumber:row.dr_inv_number,proNumber:row.pro_number,vamNumber:row.vam_number,plateNumber:row.plate_number,operator:row.operator,materialCondition:row.material_condition,truckCvCondition:row.truck_cv_condition,noInfestation:row.no_infestation,truckCvOdor:row.truck_cv_odor,truckCvSeal:row.truck_cv_seal,gateIn:row.gate_in,unloadingStart:row.unloading_start,unloadingEnd:row.unloading_end,dwellMinutes:row.dwell_minutes,createdBy:req.user.name,createdAt:row.created_at};
  });
  try { res.status(201).json(create()); } catch(error) { res.status(500).json({error:error.message}); }
});
app.patch('/api/private/notifications/:id', (req,res) => {
  const n=db.prepare('SELECT * FROM notifications WHERE id=?').get(req.params.id); if(!n)return res.status(404).json({error:'Notification not found'});
  db.prepare('UPDATE notifications SET is_read=?,is_starred=? WHERE id=?').run(req.body.isRead===undefined?n.is_read:Number(Boolean(req.body.isRead)),req.body.isStarred===undefined?n.is_starred:Number(Boolean(req.body.isStarred)),n.id); res.json({ok:true});
});
app.delete('/api/private/notifications/:id', (req,res) => { db.prepare('DELETE FROM notifications WHERE id=?').run(req.params.id); res.json({ok:true}); });
app.get('/api/private/storage-utilization', (_req,res) => {
  const locations=db.prepare(`SELECT l.zone,l.shelf,l.folder,l.max_capacity,COUNT(r.id) AS occupied FROM storage_locations l LEFT JOIN records r ON r.location_id=l.id GROUP BY l.id ORDER BY l.zone,l.shelf,l.folder`).all();
  const capacity=locations.reduce((sum,l)=>sum+l.max_capacity,0), occupied=locations.reduce((sum,l)=>sum+l.occupied,0);
  const shelfMap=new Map();
  for(const location of locations){const key=`${location.zone}\u0000${location.shelf}`;const shelf=shelfMap.get(key)||{zone:location.zone,shelf:location.shelf,capacity:0,occupied:0};shelf.capacity+=location.max_capacity;shelf.occupied+=location.occupied;shelfMap.set(key,shelf);}
  const shelves=[...shelfMap.values()].map(shelf=>({...shelf,occupancy:shelf.capacity?Math.round(shelf.occupied/shelf.capacity*100):0,expansionAlert:shelf.capacity>0&&shelf.occupied/shelf.capacity>.85}));
  const reviewCutoff=new Date(Date.now()+90*86400000).toISOString().slice(0,10);
  const recommendations=db.prepare(`${recordSelect} WHERE r.retention_status IN ('Near Expiry','Disposal Due','Semi-Active') OR (r.retention_date<>'' AND r.retention_date<=?) OR r.id IN (SELECT id FROM records ORDER BY gr_date ASC LIMIT 10) ORDER BY r.retention_date ASC,r.gr_date ASC`).all(reviewCutoff).map(row=>({...recordView(row),recommendationReason:['Near Expiry','Disposal Due','Semi-Active'].includes(row.retention_status)?row.retention_status:(row.retention_date&&row.retention_date<=reviewCutoff?`Retention due by ${row.retention_date}`:'Oldest records for review')}));
  res.json({locations,shelves,totalCapacity:capacity,occupied,occupancy:capacity?Math.round(occupied/capacity*100):0,expansionAlert:capacity>0&&occupied/capacity>.85,recommendations});
});
app.post('/api/private/storage-locations', managementOnly, (req,res) => {
  try {
    const { zone,shelf,folder,maxCapacity }=req.body||{};
    const id=upsertLocation({zone,shelf,folder},maxCapacity,true);
    res.status(201).json({id,zone,shelf,folder,max_capacity:Math.max(1,Number(maxCapacity)||DEFAULT_FOLDER_CAPACITY)});
  } catch(error) { res.status(400).json({error:error.message}); }
});
app.get('/api/private/encoding-compliance', (_req,res) => {
  const rows=db.prepare(`SELECT encoder,substr(created_at,1,10) AS day,COUNT(*) AS entries FROM records GROUP BY encoder,day ORDER BY day DESC,encoder`).all(); res.json(rows);
});
app.get('/api/private/users', managementOnly, (_req,res) => res.json(db.prepare('SELECT id,username,email,full_name as name,role,role_title as roleTitle,department FROM users ORDER BY role,username').all()));
app.use('/api', (_req,res)=>res.status(404).json({error:'API route not found'}));
app.use(express.static(path.join(root,'dist'), { index:false, fallthrough:true, setHeaders(res){res.setHeader('Cache-Control','no-store');} }));
app.get(/.*/, (req,res) => req.path.startsWith('/api/') ? res.status(404).end() : res.sendFile(path.join(root,'dist','index.html')));
app.listen(PORT,'0.0.0.0',()=>console.log(`ARMS on-prem portal listening on http://0.0.0.0:${PORT}`));
