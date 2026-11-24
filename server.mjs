import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const COOKIE = 'bio_session';
const defaultProfile = {
  vcard: '', design: {}, showBio: false, saveLabel: 'Save Contact', whatsappUrl: '',
  name: 'Adhin V S', title: 'Cyber Security Expert & Human Risk Specialist', company: 'Founder · The Blue Signal',
  bio: 'Cybersecurity professional, corporate trainer, and human risk specialist focused on the human side of cybersecurity.', photo: '', email: 'reachadhinvs@gmail.com', phone: '',
  whatsapp: '', whatsappMessage: 'Hi Adhin, we met and I would like to connect.', website: 'https://adhinvs.com',
  linkedin: 'https://www.linkedin.com/in/adhin-v-s-411166368/', location: '', accent: '#0444FF', background: '#f5f7ff',
  contacts: { email: true, phone: false, website: true, location: false },
  links: [ { label: 'Website', url: 'https://adhinvs.com' }, { label: 'LinkedIn', url: 'https://www.linkedin.com/in/adhin-v-s-411166368/' } ],
  exchangeEnabled: true, analyticsEnabled: true, n8nWebhook: ''
};
let store;
const sessions = new Map();
const events = [];
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json', '.png':'image/png', '.ico':'image/x-icon' };
const json = (res, code, body, headers={}) => { const out=JSON.stringify(body); res.writeHead(code,{ 'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(out),'cache-control':'no-store',...headers }); res.end(out); };
const sha = v => crypto.createHash('sha256').update(v).digest('hex');
function safeEqual(a,b) { const x=Buffer.from(String(a)), y=Buffer.from(String(b)); return x.length===y.length && crypto.timingSafeEqual(x,y); }
function sign(value) { return crypto.createHmac('sha256',SESSION_SECRET).update(value).digest('base64url'); }
function getCookie(req) { return Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=').map(decodeURIComponent))).bio_session || ''; }
function isAdmin(req) { const raw=getCookie(req), [id, sig]=raw.split('.'); return !!id && !!sig && safeEqual(sign(id),sig) && sessions.has(id); }
function sessionCookie(id, clear=false) { return `${COOKIE}=${clear?'':encodeURIComponent(`${id}.${sign(id)}`)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear?0:86400*7}${process.env.NODE_ENV==='production'?'; Secure':''}`; }
function body(req, max=2_000_000) { return new Promise((resolve,reject)=>{let data='';req.on('data',c=>{data+=c;if(data.length>max){reject(new Error('Payload too large'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(data||'{}'));}catch{reject(new Error('Invalid JSON'));}});req.on('error',reject);}); }
async function persist(){ const tmp=path.join(DATA,'profile.tmp'); await fs.writeFile(tmp,JSON.stringify(store,null,2),{mode:0o600}); await fs.rename(tmp,path.join(DATA,'profile.json')); }
function record(event){ if(!store.profile.analyticsEnabled)return; events.unshift({event,at:new Date().toISOString()}); if(events.length>1000)events.length=1000; }
function cleanProfile(raw){
  const p={...defaultProfile,...raw}; p.contacts={...defaultProfile.contacts,...(raw.contacts||{})};
  p.links=Array.isArray(raw.links)?raw.links.slice(0,30).map(x=>({label:String(x.label||'').slice(0,60),url:String(x.url||'').slice(0,500)})):defaultProfile.links;
  p.name=String(p.name).slice(0,100);p.title=String(p.title).slice(0,120);p.company=String(p.company).slice(0,100);p.bio=String(p.bio).slice(0,500);
  for(const k of ['email','phone','whatsapp','whatsappMessage','website','linkedin','location','n8nWebhook'])p[k]=String(p[k]||'').slice(0,k==='n8nWebhook'?1000:500);
  p.accent=/^#[0-9a-f]{6}$/i.test(p.accent)?p.accent:'#0444FF';p.background=/^#[0-9a-f]{6}$/i.test(p.background)?p.background:'#f5f7ff';p.exchangeEnabled=!!p.exchangeEnabled;p.analyticsEnabled=!!p.analyticsEnabled;
  if(p.photo && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.photo))p.photo='';
  p.vcard=typeof p.vcard==='string'&&p.vcard.length<=100000&&/^BEGIN:VCARD\r?\n/i.test(p.vcard)&&/END:VCARD\s*$/i.test(p.vcard)?p.vcard:'';
  p.whatsappUrl=typeof p.whatsappUrl==='string'&&/^https:\/\//i.test(p.whatsappUrl)?p.whatsappUrl.slice(0,2000):'';
  return p;
}
function publicProfile(){const p=structuredClone(store.profile); delete p.n8nWebhook; delete p.vcard; if(!p.contacts.phone)p.phone='';if(!p.contacts.email)p.email='';if(!p.contacts.website)p.website='';if(!p.contacts.location)p.location='';return p;}
async function sendWebhook(payload){const url=store.profile.n8nWebhook;if(!url)return;try{const u=new URL(url);if(!['https:','http:'].includes(u.protocol))return;await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(5000)});}catch(e){console.error('Webhook delivery failed:',e.message);}}
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost'), pathname=url.pathname;
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Referrer-Policy','same-origin');
    if(!['GET','HEAD'].includes(req.method)&&req.headers.origin&&req.headers.origin!==(process.env.PUBLIC_URL||`http://${req.headers.host}`))return json(res,403,{error:'Origin not allowed'});
    if(pathname==='/api/admin/profile'){if(!isAdmin(req))return json(res,401,{error:'Sign in required'});return json(res,200,store.profile);}
    if(pathname==='/api/health')return json(res,200,{ok:true});
    if(pathname==='/api/setup/status')return json(res,200,{configured:!!store.passwordHash});
    if(pathname==='/api/setup'&&req.method==='POST'){
      if(store.passwordHash)return json(res,409,{error:'Admin already configured'});
      const b=await body(req);if(typeof b.password!=='string'||b.password.length<12)return json(res,400,{error:'Use at least 12 characters'});
      store.passwordHash=sha(b.password);await persist();const id=crypto.randomBytes(32).toString('hex');sessions.set(id,true);return json(res,200,{ok:true},{'set-cookie':sessionCookie(id)});
    }
    if(pathname==='/api/login'&&req.method==='POST'){
      const b=await body(req);if(!store.passwordHash||!safeEqual(sha(String(b.password||'')),store.passwordHash))return json(res,401,{error:'Incorrect password'});
      const id=crypto.randomBytes(32).toString('hex');sessions.set(id,true);return json(res,200,{ok:true},{'set-cookie':sessionCookie(id)});
    }
    if(pathname==='/api/logout'&&req.method==='POST'){const id=getCookie(req).split('.')[0];sessions.delete(id);return json(res,200,{ok:true},{'set-cookie':sessionCookie('',true)});}
    if(pathname==='/api/me')return json(res,200,{admin:isAdmin(req),configured:!!store.passwordHash});
    if(pathname==='/api/profile'&&req.method==='GET'){if(!isAdmin(req))record('visit');return json(res,200,publicProfile());}
    if(pathname==='/api/profile'&&req.method==='PUT'){
      if(!isAdmin(req))return json(res,401,{error:'Sign in required'});const b=await body(req,5_000_000);store.profile=cleanProfile(b);await persist();return json(res,200,{ok:true});
    }
    if(pathname==='/api/analytics') {if(!isAdmin(req))return json(res,401,{error:'Sign in required'});const today=new Date().toISOString().slice(0,10);return json(res,200,{total:events.length,today:events.filter(x=>x.at.startsWith(today)).length,recent:events.slice(0,25)});}
    if(pathname==='/api/exchange'&&req.method==='POST'){
      if(!store.profile.exchangeEnabled)return json(res,404,{error:'Not available'});const b=await body(req);
      const entry={name:String(b.name||'').trim().slice(0,100),email:String(b.email||'').trim().slice(0,254),phone:String(b.phone||'').trim().slice(0,40),message:String(b.message||'').trim().slice(0,500),consent:b.consent===true,submittedAt:new Date().toISOString()};
      if(!entry.name||(!entry.email&&!entry.phone)||!entry.consent)return json(res,400,{error:'Name, one contact method and consent are required'});
      record('contact exchange');await sendWebhook(entry);return json(res,200,{ok:true});
    }
    if(pathname==='/card.vcf'){
      if(store.profile.vcard)return res.writeHead(200,{'content-type':'text/vcard; charset=utf-8','content-disposition':'attachment; filename="contact.vcf"','cache-control':'no-store'}).end(store.profile.vcard);
      const p=publicProfile();const lines=['BEGIN:VCARD','VERSION:3.0',`FN:${p.name}`,`ORG:${p.company}`,`TITLE:${p.title}`];if(p.email)lines.push(`EMAIL;TYPE=WORK:${p.email}`);if(p.phone)lines.push(`TEL;TYPE=CELL:${p.phone}`);if(p.website)lines.push(`URL:${p.website}`);if(p.location)lines.push(`ADR;TYPE=WORK:;;${p.location};;;;`);lines.push('END:VCARD');return res.writeHead(200,{'content-type':'text/vcard; charset=utf-8','content-disposition':'attachment; filename="contact.vcf"','cache-control':'no-store'}).end(lines.join('\r\n'));
    }
    if(pathname==='/api/event'&&req.method==='POST'){const b=await body(req);const allowed=new Set(['share','contact download','whatsapp','link click']);if(allowed.has(b.event))record(b.event);return json(res,200,{ok:true});}
    const file=pathname==='/'?'/index.html':pathname==='/admin'?'/admin.html':pathname;
    const target=path.resolve(ROOT,'public',`.${file}`);if(!target.startsWith(path.resolve(ROOT,'public')+path.sep))return json(res,404,{error:'Not found'});
    const data=await fs.readFile(target);res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':pathname==='/'||pathname==='/admin'?'no-cache':'public, max-age=3600'});return res.end(data);
  }catch(e){console.error(e);if(!res.headersSent)json(res,e.message==='Payload too large'?413:500,{error:e.message==='Payload too large'?'Payload too large':'Request failed'});else res.destroy();}
});
await fs.mkdir(DATA,{recursive:true});try{store=JSON.parse(await fs.readFile(path.join(DATA,'profile.json'),'utf8'));store.profile=cleanProfile(store.profile||{});}catch{store={profile:defaultProfile,passwordHash:null};await persist();}
server.listen(PORT,'0.0.0.0',()=>console.log(`Bio card listening on ${PORT}`));
