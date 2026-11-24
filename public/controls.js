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
    const exchange=document.querySelector('#exchange-open');
    const destination=[profile.exchangeUrl,profile.whatsappUrl].find(value=>/^https:\/\//i.test(value||''))||((profile.whatsapp||profile.exchangeUrl)?'https://wa.me/'+(profile.whatsapp||profile.exchangeUrl).replace(/\D/g,''):'');
    exchange.hidden=profile.exchangeEnabled===false;
    if(/^https:\/\//i.test(destination)){exchange.href=destination;}else{exchange.removeAttribute('href');exchange.setAttribute('aria-disabled','true');exchange.title='Contact exchange link has not been configured yet';}
    const socials=document.querySelector('#contacts');
    function social(label,icon,url){if(!url)return;const a=document.createElement('a');a.className='contact-link';a.href=url;a.title=label;a.setAttribute('aria-label',label);const span=document.createElement('span');span.className='contact-icon';const img=document.createElement('img');img.className='social-logo';img.src='/'+icon+'.svg';img.alt='';span.append(img);a.append(span);socials.append(a);}
    social('Email','mail',profile.email?'mailto:'+profile.email:'');
    social('WhatsApp','whatsapp',profile.whatsappUrl||(profile.whatsapp?'https://wa.me/'+profile.whatsapp.replace(/\D/g,''):''));
    document.querySelectorAll('#support .list-card>a').forEach((row,i)=>{const span=row.querySelector('span');if(span){span.replaceChildren();const img=document.createElement('img');img.src='/support-'+['training','consultation','tea'][i]+'.svg';img.alt='';span.append(img);}});
    const website=document.querySelector('.profile-website');
    const globe=document.createElement('img');globe.src='/globe.svg';globe.alt='';website.prepend(globe);
    const framework=[...document.querySelectorAll('.feature-card')].find(card=>card.querySelector('h3')?.textContent==='AICR Framework');
    if(framework)framework.querySelector('.card-icon').innerHTML='<img src="/aicr.svg" alt="AICR framework">';
    return;
  }
  const panel=document.createElement('section');panel.className='panel';panel.id='editable-design';panel.innerHTML='<h2>Page design and content</h2><p>Edit the existing cards. Publish changes to save.</p>';
  document.querySelector('#editor').append(panel);
  function field(parent,label,value,onchange,type='text'){const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.type=type;if(type==='checkbox')input.checked=!!value;else input.value=value??'';input.oninput=()=>{onchange(type==='checkbox'?input.checked:input.value);document.querySelector('#save-status').textContent='Unsaved changes';};wrap.append(input);parent.append(wrap);}
  field(panel,'Show introduction',profile.showBio,v=>profile.showBio=v,'checkbox');
  field(panel,'Save contact label',profile.saveLabel,v=>profile.saveLabel=v);
  field(panel,'Exchange Contacts link or phone number',profile.exchangeUrl||profile.whatsappUrl,v=>profile.exchangeUrl=v);
  field(panel,'WhatsApp / walink destination',profile.whatsappUrl,v=>profile.whatsappUrl=v);
  const uploadLabel=document.createElement('label');uploadLabel.textContent='Upload contact file (.vcf). Without an upload, the profile and contact privacy settings generate the download.';
  const upload=document.createElement('input');upload.type='file';upload.accept='.vcf,text/vcard';
  const status=document.createElement('p');status.textContent=profile.vcard?'Uploaded vCard selected':'Using profile details';
  upload.onchange=async()=>{const file=upload.files[0];if(!file)return;if(file.size>100000){status.textContent='Choose a vCard under 100 KB';return;}const text=await file.text();if(!/^BEGIN:VCARD\r?\n/i.test(text)||!/END:VCARD\s*$/i.test(text)){status.textContent='This file is not a valid vCard';return;}profile.vcard=text;status.textContent='vCard ready — publish changes to save';};
  const clear=document.createElement('button');clear.type='button';clear.textContent='Use profile details instead';clear.onclick=()=>{profile.vcard='';upload.value='';status.textContent='Profile details selected — publish changes to save';};uploadLabel.append(upload);panel.append(uploadLabel,status,clear);
  fetch('/').then(r=>r.text()).then(html=>{
    const doc=new DOMParser().parseFromString(html,'text/html');profile.design ||= {};
    doc.querySelectorAll(editable).forEach((node,index)=>{
      const item=profile.design[index] ||= {};item.text ||= {};item.urls ||= {};
      const box=document.createElement('details');const legend=document.createElement('summary');legend.textContent=node.matches('.section-icon')?(node.closest('.section')?.querySelector('h2')?.textContent+' — section icon'):node.querySelector('h3,b')?.textContent||node.textContent.trim().slice(0,60);box.append(legend);panel.append(box);
      field(box,'Hide / remove',item.hidden,v=>item.hidden=v,'checkbox');
      const targets=node.matches('h2,.section-icon')?[node]:[...node.querySelectorAll('h3,p,b,small,.card-link,.card-icon:not(:has(img)),a')];
      targets.forEach((target,i)=>{if(!target.querySelector('img,b'))field(box,'Text / icon',item.text[i]??target.textContent,v=>item.text[i]=v);});
      [node,...node.querySelectorAll('a,img')].forEach((target,i)=>{if(target.matches('a,img'))field(box,target.tagName==='IMG'?'Icon image URL':'Link URL',item.urls[i]??target.getAttribute(target.tagName==='IMG'?'src':'href'),v=>item.urls[i]=v);});
      for(const key of ['padding','gap','fontSize','iconSize'])field(box,({padding:'Inner spacing',gap:'Space between items',fontSize:'Text size',iconSize:'Icon size'}[key])+' (px; optional)',item[key],v=>item[key]=v,'number');
      if(node.matches('.feature-card,.support-card,.list-card>a'))field(box,'Additional copies',item.copies||0,v=>item.copies=Number(v),'number');
    });
  });
},100);
