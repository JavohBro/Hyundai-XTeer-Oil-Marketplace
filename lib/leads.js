'use strict';
const crypto = require('node:crypto');
const MAX_ATTEMPTS = 5;
function migrate(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY, contact TEXT NOT NULL, company TEXT NOT NULL,
    country TEXT NOT NULL, message TEXT NOT NULL, created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lead_notifications (
    lead_id TEXT NOT NULL, admin_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (lead_id, admin_id)
  );`);
}
function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid inquiry');
  const limits = {contact:200, company:200, country:100, message:3000};
  const data = {};
  for (const [key,max] of Object.entries(limits)) {
    const raw = key === 'contact' ? (body.contact ?? body.phone ?? '') : (body[key] ?? '');
    if (typeof raw !== 'string' || raw.length > max) throw new Error('Invalid '+key);
    data[key] = raw.trim();
  }
  if (data.contact.replace(/\s/g,'').length < 3) throw new Error('Contact required');
  return data;
}
function accept(db,body,admins,now=Date.now()) {
  const data = validate(body), id = crypto.randomUUID();
  // Transaction guarantees an accepted inquiry and its notifications survive together.
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO leads (id,contact,company,country,message,created_at) VALUES (?,?,?,?,?,?)').run(id,data.contact,data.company,data.country,data.message,now);
    for (const admin of [...new Set(admins.map(String))]) db.prepare('INSERT INTO lead_notifications (lead_id,admin_id,next_attempt) VALUES (?,?,?)').run(id,admin,now);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return id;
}
function createWorker(db,send,render,log=()=>{}) {
  let busy=false;
  return async function drain(now=Date.now()) {
    if (busy) return; busy=true;
    try {
      const jobs=db.prepare(`SELECT n.*,l.contact,l.company,l.country,l.message FROM lead_notifications n JOIN leads l ON l.id=n.lead_id WHERE n.status='pending' AND n.next_attempt<=? ORDER BY n.next_attempt LIMIT 20`).all(now);
      for (const job of jobs) {
        try {
          await send(job.admin_id,render(job));
          db.prepare("UPDATE lead_notifications SET status='sent',attempts=attempts+1 WHERE lead_id=? AND admin_id=?").run(job.lead_id,job.admin_id);
        } catch {
          const attempts=job.attempts+1;
          const status=attempts>=MAX_ATTEMPTS?'failed':'pending';
          db.prepare('UPDATE lead_notifications SET status=?,attempts=?,next_attempt=? WHERE lead_id=? AND admin_id=?').run(status,attempts,now+Math.min(3600000,30000*2**(attempts-1)),job.lead_id,job.admin_id);
          log({leadId:job.lead_id,status,attempts});
        }
      }
    } finally { busy=false; }
  };
}
module.exports={migrate,validate,accept,createWorker};
