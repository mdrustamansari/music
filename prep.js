/* Prepared audio. Songs are decoded once, and Lofi slowing is done ahead of time in a worker (WSOLA with long windows),
   so what plays is a ready buffer on the audio thread, not live work that a busy screen can interrupt. */
(() => {
'use strict';
const A = () => window.Android, P = {}, cache = new Map(), pend = new Map();
const WSRC = `onmessage=e=>{const {L,R,rate}=e.data,n=L.length,W=4096,H=2048,TOL=768,CL=1024,ha=Math.max(1,Math.round(H*rate)),nf=Math.max(1,Math.ceil((n-W)/ha)+1),outLen=(nf-1)*H+W,oL=new Float32Array(outLen),oR=new Float32Array(outLen),win=new Float32Array(W);
for(let i=0;i<W;i++)win[i]=.5-.5*Math.cos(2*Math.PI*i/W);
let prev=0;
for(let f=0;f<nf;f++){let st=Math.min(f*ha,Math.max(0,n-W));
if(f>0){const nat=prev+H;if(nat+CL<n){const lo=Math.max(0,st-TOL),hi=Math.min(n-W,st+TOL);let best=st,bv=-Infinity;
for(let c=lo;c<=hi;c+=4){let s=0;for(let k=0;k<CL;k+=4)s+=(L[c+k]+R[c+k])*(L[nat+k]+R[nat+k]);if(s>bv){bv=s;best=c}}
const r0=Math.max(lo,best-3),r1=Math.min(hi,best+3);for(let c=r0;c<=r1;c++){let s=0;for(let k=0;k<CL;k+=4)s+=(L[c+k]+R[c+k])*(L[nat+k]+R[nat+k]);if(s>bv){bv=s;best=c}}
st=best}}
const o=f*H;for(let i=0;i<W;i++){const w=win[i];oL[o+i]+=L[st+i]*w;oR[o+i]+=R[st+i]*w}
prev=st}
postMessage({L:oL,R:oR},[oL.buffer,oR.buffer])}`;
let wurl = null;
P.decode = async (ac, id) => { const url = await A().fileUrl(id); if (!url) throw new Error('nofile'); try { const ab = await (await fetch(url)).arrayBuffer(); return await ac.decodeAudioData(ab); } finally { URL.revokeObjectURL(url); } };
P.stretch = (ac, buf, rate) => new Promise((res, rej) => {
  wurl = wurl || URL.createObjectURL(new Blob([WSRC], { type: 'text/javascript' })); const w = new Worker(wurl);
  const L = buf.getChannelData(0).slice(), R = (buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0)).slice();
  w.onmessage = e => { w.terminate(); const o = ac.createBuffer(2, e.data.L.length, buf.sampleRate); o.copyToChannel(e.data.L, 0); o.copyToChannel(e.data.R, 1); o._r = rate; res(o); };
  w.onerror = e => { w.terminate(); rej(e); }; w.postMessage({ L, R, rate }, [L.buffer, R.buffer]);
});
/* a slowed copy of one song, kept for the next play (two at most) */
P.slowed = (ac, id, rate) => {
  const key = id + '|' + rate; if (cache.has(key)) return Promise.resolve(cache.get(key)); if (pend.has(key)) return pend.get(key);
  const p = P.decode(ac, id).then(b => P.stretch(ac, b, rate)).then(o => { cache.set(key, o); while (cache.size > 2) cache.delete(cache.keys().next().value); pend.delete(key); return o; }).catch(e => { pend.delete(key); throw e; });
  pend.set(key, p); return p;
};
P.clear = () => cache.clear();
window.Prep = P;
})();
