import crypto from 'node:crypto';
const TTL=8*60*60;
const signature=(payload,secret)=>crypto.createHmac('sha256',secret).update(payload).digest('base64url');
export function safeEqual(left,right){const a=Buffer.from(String(left??'')),b=Buffer.from(String(right??''));if(a.length!==b.length)return false;return crypto.timingSafeEqual(a,b)}
export function createSession(secret){const expires=Math.floor(Date.now()/1000)+TTL,payload=`v1.${expires}`;return`${payload}.${signature(payload,secret)}`}
export function sessionCookie(token){return`medife_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL}`}
export function clearSessionCookie(){return'medife_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'}
export function json(status,body,cookie){return{statusCode:status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})},body:JSON.stringify(body)}}
