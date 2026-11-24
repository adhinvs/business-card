// Apply editable values to the original markup, preserving every card design.
const designReady = setInterval(() => {
  if (typeof profile === 'undefined' || !profile) return;
  clearInterval(designReady);
  const editable = '.section-heading h2,.section-icon,.feature-card,.support-card,.list-card>a';
  const safeURL = value => /^(https?:\/\/|mailto:|tel:|\/[^/])/.test(value);
  function apply(doc, settings) {
    doc.querySelectorAll(editable).forEach((node, index) => {
      const item = settings[index]; if (!item) return;
      node.hidden = !!item.hidden;
      const targets = node.matches('h2,.section-icon') ? [node] : [...node.querySelectorAll('h3,p,b,small,.card-link,.card-icon:not(:has(img)),a')];
      targets.forEach((target, i) => { if(item.text?.[i] !== undefined && !target.querySelector('img,b')) target.textContent = item.text[i]; });
      [node,...node.querySelectorAll('a,img')].forEach((target,i) => {
        if(item.urls?.[i] && safeURL(item.urls[i])) target.setAttribute(target.tagName==='IMG'?'src':'href',item.urls[i]);
      });
      for(const key of ['padding','gap','fontSize']) if(item[key]) node.style[key]=Math.min(64,Math.max(0,Number(item[key])))+'px';
      if(item.iconSize) node.querySelectorAll('img,.card-icon').forEach(icon=>{icon.style.width=item.iconSize+'px';icon.style.height=item.iconSize+'px';});
      for(let n=0;n<Math.min(10,item.copies||0);n++)node.after(node.cloneNode(true));
    });
  }
  if (document.querySelector('#editable-design')) return;
  if (!document.querySelector('#editor')) {
    apply(document,profile.design||{});
    document.querySelector('#bio').hidden=!profile.showBio;
    document.querySelector('#save').lastChild.textContent=' '+(profile.saveLabel||'Save Contact');
    if(profile.whatsappUrl && safeURL(profile.whatsappUrl)){const link=document.createElement('a');link.className='button outline';link.textContent='WhatsApp';link.href=profile.whatsappUrl;document.querySelector('.hero-actions').append(link);}
    return;
  }
  const panel=document.createElement('section');panel.className='panel';panel.id='editable-design';panel.innerHTML='<h2>Page design and content</h2><p>Edit the existing cards. Publish changes to save.</p>';
  document.querySelector('#editor').append(panel);
  function field(parent,label,value,onchange,type='text'){const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.type=type;if(type==='checkbox')input.checked=!!value;else input.value=value??'';input.oninput=()=>{onchange(type==='checkbox'?input.checked:input.value);document.querySelector('#save-status').textContent='Unsaved changes';};wrap.append(input);parent.append(wrap);}
  field(panel,'Show introduction',profile.showBio,v=>profile.showBio=v,'checkbox');
  field(panel,'Save contact label',profile.saveLabel,v=>profile.saveLabel=v);
  field(panel,'WhatsApp / walink destination',profile.whatsappUrl,v=>profile.whatsappUrl=v);
  fetch('/').then(r=>r.text()).then(html=>{
    const doc=new DOMParser().parseFromString(html,'text/html');profile.design ||= {};
    doc.querySelectorAll(editable).forEach((node,index)=>{
      const item=profile.design[index] ||= {};item.text ||= {};item.urls ||= {};
      const box=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent=node.querySelector('h3,b')?.textContent||node.textContent.trim().slice(0,60);box.append(legend);panel.append(box);
      field(box,'Hide / remove',item.hidden,v=>item.hidden=v,'checkbox');
      const targets=node.matches('h2,.section-icon')?[node]:[...node.querySelectorAll('h3,p,b,small,.card-link,.card-icon:not(:has(img)),a')];
      targets.forEach((target,i)=>{if(!target.querySelector('img,b'))field(box,'Text / icon',item.text[i]??target.textContent,v=>item.text[i]=v);});
      [node,...node.querySelectorAll('a,img')].forEach((target,i)=>{if(target.matches('a,img'))field(box,target.tagName==='IMG'?'Icon image URL':'Link URL',item.urls[i]??target.getAttribute(target.tagName==='IMG'?'src':'href'),v=>item.urls[i]=v);});
      for(const key of ['padding','gap','fontSize','iconSize'])field(box,key+' (px; blank keeps original)',item[key],v=>item[key]=v,'number');
      if(node.matches('.feature-card,.support-card,.list-card>a'))field(box,'Additional copies',item.copies||0,v=>item.copies=Number(v),'number');
    });
  });
},100);
