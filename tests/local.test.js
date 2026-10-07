'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const Auth=require('../lib/telegram-auth'),Leads=require('../lib/leads');
const token='fake-test-token-never-used-on-network',now=1800000000;
function init(date=now,user={id:123,first_name:'Test'}) {
  const p=new URLSearchParams({auth_date:String(date),query_id:'test',user:JSON.stringify(user)});
  const check=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n');
  const key=crypto.createHmac('sha256','WebAppData').update(token).digest();
  p.set('hash',crypto.createHmac('sha256',key).update(check).digest('hex'));return p.toString();
}
function login(date=now,id='123') {
  const q={auth_date:String(date),id,first_name:'Test'};
  const check=Object.keys(q).sort().map(k=>k+'='+q[k]).join('\n');
  q.hash=crypto.createHmac('sha256',crypto.createHash('sha256').update(token).digest()).update(check).digest('hex');return q;
}
test('Mini App accepts valid signature and rejects expired/future/tampered/malformed/duplicate fields',()=>{
  assert.equal(Auth.validateInitData(init(),token,now).id,123);
  for(const data of [init(now-3601),init(now+61),init(now,{id:-1}),init()+'&auth_date='+now,'garbage',init().replace('query_id=test','query_id=changed')]) assert.equal(Auth.validateInitData(data,token,now),null);
});
test('Login Widget rejects expired/future/invalid identity and signature',()=>{
  assert.equal(Auth.validateLoginWidget(login(),token,now).id,123);
  for(const q of [login(now-86401),login(now+61),login(now,'abc'),{...login(),hash:'bad'}]) assert.equal(Auth.validateLoginWidget(q,token,now),null);
});
test('production and Railway refuse development auth; missing bot token fails closed',()=>{
  assert.throws(()=>Auth.assertProductionAuth({BOT_TOKEN:token,DEV_AUTH:'1',NODE_ENV:'production'}));
  assert.throws(()=>Auth.assertProductionAuth({BOT_TOKEN:token,DEV_AUTH:'1',RAILWAY_ENVIRONMENT_ID:'test'}));
  assert.throws(()=>Auth.assertProductionAuth({}));
  assert.doesNotThrow(()=>Auth.assertProductionAuth({BOT_TOKEN:token}));
});
test('inquiry validation rejects missing, wrong-type and oversized fields',()=>{
  for(const b of [null,[],{}, {contact:{}},{contact:'ok',message:'x'}, {contact:'test',message:'x'.repeat(3001)}])assert.throws(()=>Leads.validate(b));
  assert.equal(Leads.validate({phone:' test '}).contact,'test');
});
test('SQLite receipt persists across restart; failure retries only unsent recipients',async()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'carmon-test-'));
  let db;
  try {
    const file=path.join(folder,'test.sqlite'); db=new DatabaseSync(file);Leads.migrate(db);Leads.migrate(db);
    const id=Leads.accept(db,{contact:'test',message:'hello'},[1,2],1000);
    db.close();db=new DatabaseSync(file);
    assert.equal(db.prepare('SELECT count(*) AS n FROM leads').get().n,1);
    let fail=true;const sent=[];
    const drain=Leads.createWorker(db,async admin=>{if(admin==='2'&&fail)throw Error('mock failure');sent.push(admin);},()=> 'mock message');
    await drain(1000);assert.deepEqual(sent,['1']);
    assert.equal(db.prepare('SELECT status FROM lead_notifications WHERE lead_id=? AND admin_id=?').get(id,'2').status,'pending');
    fail=false;await drain(2000);assert.deepEqual(sent,['1']);await drain(31000);assert.deepEqual(sent,['1','2']);
    await drain(100000);assert.deepEqual(sent,['1','2']);
    assert.equal(db.prepare("SELECT count(*) AS n FROM lead_notifications WHERE status='sent'").get().n,2);
    const follow=Leads.accept(db,{contact:'test',message:'new request'},[1],100001);assert.notEqual(follow,id);
  } finally {if(db)db.close();fs.rmSync(folder,{recursive:true,force:true});}
});
test('notification retries are bounded, with durable failed status',async()=>{
  const db=new DatabaseSync(':memory:');try{
    Leads.migrate(db);Leads.accept(db,{contact:'test'},[1],0);
    const drain=Leads.createWorker(db,async()=>{throw Error('mock')},()=> 'mock');
    for(let i=0;i<6;i++)await drain(i*4000000);
    const row=db.prepare('SELECT status,attempts FROM lead_notifications').get();assert.equal(row.status,'failed');assert.equal(row.attempts,5);
  }finally{db.close();}
});
test('notification worker prevents overlapping local drains',async()=>{
  const db=new DatabaseSync(':memory:');try{
    Leads.migrate(db);Leads.accept(db,{contact:'test'},[1],0);let release,calls=0;
    const drain=Leads.createWorker(db,()=>{calls++;return new Promise(r=>{release=r});},()=> 'mock');
    const pending=drain(0);await drain(0);assert.equal(calls,1);release();await pending;
  }finally{db.close();}
});

test('actual patched route acknowledges durable receipt and handles invalid/config/storage failures',()=>{
  const vm=require('node:vm');const source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
  const start=source.indexOf("app.post('/api/lead', leadRateLimit");const end=source.indexOf("app.get('/api/orders',",start);let handler;
  const db=new DatabaseSync(':memory:');Leads.migrate(db);
  const context={app:{post:(_path,_limit,fn)=>{handler=fn;}},leadRateLimit:()=>{},Leads,db,ADMIN_IDS:[1],drainLeads:async()=>{},console:{error:()=>{}}};
  vm.runInNewContext(source.slice(start,end),context);
  const invoke=body=>{const res={code:200,status(n){this.code=n;return this;},json(b){this.body=b;return this;}};handler({body},res);return res;};
  assert.equal(invoke({}).code,400);
  const accepted=invoke({contact:'test'});assert.equal(accepted.code,202);assert.equal(accepted.body.accepted,true);
  assert.equal(db.prepare('SELECT id FROM leads').get().id,accepted.body.lead_id);
  context.ADMIN_IDS=[];assert.equal(invoke({contact:'test'}).code,503);
  context.ADMIN_IDS=[1];db.close();assert.equal(invoke({contact:'test'}).code,503);
});
