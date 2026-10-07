'use strict';
const crypto = require('node:crypto');
function fresh(value, now, maxAge) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 && n <= now + 60 && now - n <= maxAge;
}
function equalHex(a, b) {
  if (typeof a !== 'string' || !/^[a-f0-9]{64}$/i.test(a)) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
function userValid(user) { return user && Number.isSafeInteger(user.id) && user.id > 0; }
function validateInitData(data, token, now = Math.floor(Date.now()/1000)) {
  try {
    if (typeof data !== 'string' || data.length > 16384) return null;
    const params = new URLSearchParams(data);
    const keys = [...params.keys()];
    if (new Set(keys).size !== keys.length) return null;
    const hash = params.get('hash'); params.delete('hash');
    if (!fresh(params.get('auth_date'), now, 3600)) return null;
    const check = [...params.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => k+'='+v).join('\n');
    const secret = crypto.createHmac('sha256','WebAppData').update(token).digest();
    const expected = crypto.createHmac('sha256',secret).update(check).digest('hex');
    if (!equalHex(hash,expected)) return null;
    const user = JSON.parse(params.get('user'));
    return userValid(user) ? user : null;
  } catch { return null; }
}
function validateLoginWidget(query, token, now = Math.floor(Date.now()/1000)) {
  try {
    const { hash, ...rest } = query;
    if (Object.values(rest).some(v => typeof v !== 'string') || !fresh(rest.auth_date,now,86400)) return null;
    const check = Object.keys(rest).sort().map(k=>k+'='+rest[k]).join('\n');
    const secret = crypto.createHash('sha256').update(token).digest();
    const expected = crypto.createHmac('sha256',secret).update(check).digest('hex');
    if (!equalHex(hash,expected)) return null;
    const user = { id:Number(rest.id),first_name:rest.first_name,last_name:rest.last_name,username:rest.username };
    return userValid(user) ? user : null;
  } catch { return null; }
}
function assertProductionAuth(env) {
  if (env.DEV_AUTH === '1' && (env.NODE_ENV === 'production' || env.RAILWAY_ENVIRONMENT_ID)) throw new Error('Development authentication is forbidden in production');
  if (!env.BOT_TOKEN) throw new Error('BOT_TOKEN is required');
}
module.exports = {validateInitData,validateLoginWidget,assertProductionAuth};
