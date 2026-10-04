import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../common.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('function initContactForm()'),source.indexOf('function showNotification'));
function setup(fetcher, valid=true, language='en') {
 const fields=Array.from({length:3},()=>({value:valid?'value':'',required:true,type:'text',style:{},checkValidity:()=>valid,setAttribute(){},removeAttribute(){},addEventListener(){},focus(){this.focused=true;}}));
 const button={innerHTML:'Send',disabled:false};const listeners={};let resets=0;const status={setAttribute(){},textContent:''};
 const form={dataset:{},elements:{submissionId:{value:''}},action:'https://example.test',appendChild(){},addEventListener(type,fn){listeners[type]=fn;},querySelector(){return button;},reset(){resets++;this.elements.submissionId.value='';}};
 vm.runInNewContext(code+';initContactForm();',{document:{documentElement:{lang:language},getElementById:()=>form,createElement:()=>status},injectStyles(){},$$:()=>fields,crypto,FormData:class{},fetch:fetcher,AbortController,setTimeout,clearTimeout});
 return {fields,button,form,status,resets:()=>resets,submit:()=>listeners.submit({preventDefault(){}})};
}
test('all invalid fields are marked, first focused, no request',async()=>{
 let calls=0;const c=setup(async()=>{calls++;},false);await c.submit();
 assert.equal(calls,0);assert.ok(c.fields.every(f=>f.style.borderColor));assert.equal(c.fields[0].focused,true);
});
test('success resets form and unlocks fields',async()=>{
 const c=setup(async()=>({ok:true,json:async()=>({ok:true})}));await c.submit();
 assert.equal(c.resets(),1);assert.match(c.status.textContent,/Message sent/);assert.equal(c.button.disabled,false);assert.ok(c.fields.every(f=>!f.disabled));
});
test('HTTP and network failures keep data and retry identity, with Hebrew feedback',async()=>{
 for(const fetcher of [async()=>({ok:false}),async()=>{throw Error('network');}]) {
 const c=setup(fetcher,true,'he');await c.submit();const id=c.form.elements.submissionId.value;
 assert.equal(c.resets(),0);assert.ok(id);assert.equal(c.button.disabled,false);assert.match(c.status.textContent,/[א-ת]/);
 await c.submit();assert.equal(c.form.elements.submissionId.value,id);
 }
});
test('double submit ignored while request is in flight',async()=>{
 let resolve,calls=0;const c=setup(()=>{calls++;return new Promise(r=>{resolve=r;});});
 const pending=c.submit();await c.submit();assert.equal(calls,1);assert.equal(c.button.disabled,true);
 resolve({ok:true,json:async()=>({ok:true})});await pending;
});
