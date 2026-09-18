import{clearSessionCookie,json}from'./_auth.mjs';
export async function handler(event){if(event?.httpMethod!=='POST')return json(405,{ok:false,error:'Método no permitido.'});return json(200,{ok:true},clearSessionCookie())}
