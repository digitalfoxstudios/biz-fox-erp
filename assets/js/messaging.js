import { supabase } from "./supabase.js";

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const stamp = value => value ? new Date(value).toLocaleString([], {dateStyle:"medium",timeStyle:"short"}) : "";
const MAX_FILE = 10 * 1024 * 1024;

export function initMessaging({user, organizationId, role, customer=null, employee=null, mount}) {
  if (!user || !organizationId || !mount || mount.querySelector("[data-bizfox-messages]")) return;
  let conversations=[], contacts=[], active=null, channel=null, busy=false;
  const button=document.createElement("button");
  button.type="button"; button.className="bizfox-chat-launch"; button.dataset.bizfoxMessages="1";
  button.innerHTML='Messages <span class="bizfox-chat-badge" hidden>0</span>';
  mount.append(button);

  const overlay=document.createElement("div");
  overlay.className="bizfox-chat-overlay"; overlay.hidden=true;
  overlay.innerHTML=`
    <section class="bizfox-chat-window" role="dialog" aria-modal="true" aria-label="Messages">
      <header class="bizfox-chat-header"><div><strong>Biz FOX Messages</strong><small>Secure company conversations</small></div><button type="button" class="bizfox-chat-close" aria-label="Close">×</button></header>
      <div class="bizfox-chat-layout">
        <aside class="bizfox-chat-sidebar"><div class="bizfox-chat-list-head"><strong>Conversations</strong><button type="button" class="bizfox-chat-new">New</button></div><div class="bizfox-chat-list"></div></aside>
        <section class="bizfox-chat-thread"><div class="bizfox-chat-empty">Select a conversation to view messages.</div><div class="bizfox-chat-active" hidden>
          <div class="bizfox-chat-thread-head"><button type="button" class="bizfox-chat-back">‹</button><div><strong class="bizfox-chat-person"></strong><small class="bizfox-chat-subject"></small></div></div>
          <div class="bizfox-chat-messages" aria-live="polite"></div>
          <form class="bizfox-chat-compose"><label class="bizfox-chat-attach" title="Attach image or document">＋<input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" hidden></label><textarea rows="1" maxlength="10000" placeholder="Write a message…" aria-label="Message"></textarea><button type="submit">Send</button></form>
          <div class="bizfox-chat-file-note">Images and documents up to 10 MB</div>
        </div></section>
      </div>
    </section>
    <div class="bizfox-chat-new-dialog" hidden><div class="bizfox-chat-new-card"><strong>Start a conversation</strong><select aria-label="Choose contact"></select><input type="text" maxlength="120" placeholder="Subject (optional)"><div><button type="button" class="bizfox-chat-cancel">Cancel</button><button type="button" class="bizfox-chat-start">Start</button></div></div></div>`;
  document.body.append(overlay);

  const $=selector=>overlay.querySelector(selector);
  const list=$(".bizfox-chat-list"), messages=$(".bizfox-chat-messages"), empty=$(".bizfox-chat-empty"), activeBox=$(".bizfox-chat-active"), layout=$(".bizfox-chat-layout");
  const nameFor=conversation=>{
    if(conversation.conversation_type==="admin_employee") return contacts.find(x=>x.user_id===conversation.employee_user_id)?.name || "Employee";
    if(conversation.customer_id) return contacts.find(x=>x.id===conversation.customer_id)?.name || "Customer";
    return "Conversation";
  };
  const unreadCount=async()=>{
    const ids=conversations.map(c=>c.id);
    let total=0;
    if(ids.length){
      const {count}=await supabase.from("chat_messages").select("id",{count:"exact",head:true}).in("conversation_id",ids).is("read_at",null).neq("sender_id",user.id);
      total=count||0;
    }
    const badge=button.querySelector(".bizfox-chat-badge");
    badge.textContent=total>99?"99+":String(total); badge.hidden=!total;
  };
  async function loadContacts(){
    contacts=[];
    if(role==="admin"){
      const [e,c]=await Promise.all([
        supabase.from("employees").select("id,user_id,full_name,designation").eq("organization_id",organizationId).eq("employment_status","active").not("user_id","is",null).order("full_name"),
        supabase.from("customers").select("id,customer_name").eq("organization_id",organizationId).eq("status","active").order("customer_name")
      ]);
      (e.data||[]).forEach(x=>contacts.push({kind:"employee",id:x.id,user_id:x.user_id,name:x.full_name||"Employee",detail:x.designation||"Employee"}));
      (c.data||[]).forEach(x=>contacts.push({kind:"customer",id:x.id,name:x.customer_name||"Customer",detail:"Customer"}));
    } else if(role==="staff"){
      const {data:tasks}=await supabase.from("tasks").select("customer_id").eq("organization_id",organizationId).eq("assigned_to",user.id).not("customer_id","is",null);
      const ids=[...new Set((tasks||[]).map(x=>x.customer_id).filter(Boolean))];
      if(ids.length){
        const {data}=await supabase.from("customers").select("id,customer_name").in("id",ids);
        contacts=(data||[]).map(x=>({kind:"customer",id:x.id,name:x.customer_name||"Customer",detail:"Assigned customer"}));
      }
    } else if(customer){
      contacts=[{kind:"admin",id:customer.id,name:"Company support",detail:"Admin team"}];
    }
  }
  async function loadConversations(){
    const {data,error}=await supabase.from("chat_conversations").select("id,organization_id,conversation_type,customer_id,employee_user_id,subject,status,last_message_at").eq("organization_id",organizationId).order("last_message_at",{ascending:false}).limit(100);
    if(error){list.innerHTML='<p class="bizfox-chat-hint">'+esc(error.message)+'</p>';return;}
    conversations=data||[];
    list.innerHTML=conversations.length?conversations.map(c=>`<button type="button" class="bizfox-chat-item ${active?.id===c.id?"selected":""}" data-chat-id="${c.id}"><strong>${esc(nameFor(c))}</strong><span>${esc(c.subject||"General conversation")}</span><small>${esc(stamp(c.last_message_at))}</small></button>`).join(""):'<p class="bizfox-chat-hint">No conversations yet. Select New to start one.</p>';
    list.querySelectorAll("[data-chat-id]").forEach(b=>b.addEventListener("click",()=>openConversation(b.dataset.chatId)));
    await unreadCount();
  }
  async function openConversation(id){
    const c=conversations.find(x=>x.id===id); if(!c)return;
    active=c; empty.hidden=true; activeBox.hidden=false; layout.classList.add("chat-open");
    $(".bizfox-chat-person").textContent=nameFor(c);
    $(".bizfox-chat-subject").textContent=c.subject||"General conversation";
    list.querySelectorAll(".bizfox-chat-item").forEach(x=>x.classList.toggle("selected",x.dataset.chatId===id));
    await loadMessages();
    await supabase.from("chat_messages").update({read_at:new Date().toISOString()}).eq("conversation_id",id).is("read_at",null).neq("sender_id",user.id);
    await unreadCount();
  }
  async function loadMessages(){
    if(!active)return;
    const {data,error}=await supabase.from("chat_messages").select("id,sender_id,body,attachment_path,attachment_name,attachment_type,created_at,read_at").eq("conversation_id",active.id).order("created_at",{ascending:true}).limit(200);
    if(error){messages.innerHTML='<p class="bizfox-chat-hint">'+esc(error.message)+'</p>';return;}
    const rows=data||[];
    const rendered=await Promise.all(rows.map(async m=>{
      let attachment="";
      if(m.attachment_path){
        const {data}=await supabase.storage.from("bizfox-chat-files").createSignedUrl(m.attachment_path,3600);
        if(data?.signedUrl) attachment=`<a class="bizfox-chat-file" href="${esc(data.signedUrl)}" target="_blank" rel="noopener">${m.attachment_type?.startsWith("image/")?"Image":"File"} · ${esc(m.attachment_name||"Open attachment")}</a>`;
      }
      return `<article class="bizfox-chat-bubble ${m.sender_id===user.id?"mine":"theirs"}"><div>${esc(m.body).replace(/\n/g,"<br>")}</div>${attachment}<small>${esc(stamp(m.created_at))}${m.sender_id===user.id&&m.read_at?" · Read":""}</small></article>`;
    }));
    messages.innerHTML=rendered.join("")||'<p class="bizfox-chat-hint">No messages yet. Send the first message.</p>';
    messages.scrollTop=messages.scrollHeight;
  }
  async function startConversation(){
    const select=$(".bizfox-chat-new-card select"), choice=contacts.find(x=>x.kind+":"+x.id===select.value);
    if(!choice)return;
    const subject=$(".bizfox-chat-new-card input").value.trim()||"General conversation";
    let type, customerId=null, employeeUserId=null;
    if(role==="admin"&&choice.kind==="employee"){type="admin_employee";employeeUserId=choice.user_id;}
    else if(role==="admin"&&choice.kind==="customer"){type="admin_customer";customerId=choice.id;}
    else if(role==="staff"&&choice.kind==="customer"){type="employee_customer";customerId=choice.id;employeeUserId=user.id;}
    else if(role==="customer"&&choice.kind==="admin"){type="admin_customer";customerId=choice.id;}
    else return;
    let query=supabase.from("chat_conversations").select("id").eq("organization_id",organizationId).eq("conversation_type",type);
    query=customerId?query.eq("customer_id",customerId):query.is("customer_id",null);
    query=employeeUserId?query.eq("employee_user_id",employeeUserId):query.is("employee_user_id",null);
    const {data:existing}=await query.limit(1).maybeSingle();
    let id=existing?.id;
    if(!id){
      const {data,error}=await supabase.from("chat_conversations").insert({organization_id:organizationId,conversation_type:type,customer_id:customerId,employee_user_id:employeeUserId,created_by:user.id,subject}).select("id").single();
      if(error){alert("Could not start conversation: "+error.message);return;}
      id=data.id;
    }
    $(".bizfox-chat-new-dialog").hidden=true;
    await loadConversations(); await openConversation(id);
  }
  async function sendMessage(event){
    event.preventDefault(); if(!active||busy)return;
    const form=$(".bizfox-chat-compose"),input=form.querySelector("textarea"),fileInput=form.querySelector('input[type="file"]');
    const body=input.value.trim(),file=fileInput.files?.[0];
    if(!body&&!file)return;
    if(file&&file.size>MAX_FILE){alert("File size must be 10 MB or less.");return;}
    busy=true;form.querySelector("button[type=submit]").disabled=true;
    let attachment={};
    if(file){
      const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-100)||"attachment";
      const path=active.id+"/"+user.id+"/"+Date.now()+"_"+safeName;
      const {error}=await supabase.storage.from("bizfox-chat-files").upload(path,file,{contentType:file.type||"application/octet-stream",upsert:false});
      if(error){alert("Attachment upload failed: "+error.message);busy=false;form.querySelector("button[type=submit]").disabled=false;return;}
      attachment={attachment_path:path,attachment_name:file.name,attachment_type:file.type,attachment_size:file.size};
    }
    const {error}=await supabase.from("chat_messages").insert({conversation_id:active.id,organization_id:organizationId,sender_id:user.id,body,...attachment});
    if(error)alert("Message could not be sent: "+error.message);
    else{input.value="";fileInput.value="";await loadMessages();await loadConversations();}
    busy=false;form.querySelector("button[type=submit]").disabled=false;
  }
  async function refreshRealtime(){
    if(channel)await supabase.removeChannel(channel);
    channel=supabase.channel("bizfox-chat-"+organizationId+"-"+user.id)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_messages",filter:"organization_id=eq."+organizationId},async payload=>{
        await loadConversations();
        if(active&&payload.new.conversation_id===active.id){await loadMessages();await supabase.from("chat_messages").update({read_at:new Date().toISOString()}).eq("id",payload.new.id).neq("sender_id",user.id);await unreadCount();}
      }).subscribe();
  }

  button.addEventListener("click",async()=>{overlay.hidden=false;await loadContacts();await loadConversations();});
  $(".bizfox-chat-close").addEventListener("click",()=>{overlay.hidden=true;});
  $(".bizfox-chat-new").addEventListener("click",()=>{
    const select=$(".bizfox-chat-new-card select");
    select.innerHTML=contacts.map(x=>`<option value="${x.kind}:${x.id}">${esc(x.name)} · ${esc(x.detail)}</option>`).join("");
    $(".bizfox-chat-new-dialog").hidden=false;
  });
  $(".bizfox-chat-cancel").addEventListener("click",()=>{$(".bizfox-chat-new-dialog").hidden=true;});
  $(".bizfox-chat-start").addEventListener("click",startConversation);
  $(".bizfox-chat-compose").addEventListener("submit",sendMessage);
  $(".bizfox-chat-back").addEventListener("click",()=>{active=null;activeBox.hidden=true;empty.hidden=false;layout.classList.remove("chat-open");});
  overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.hidden=true;});
  if(role==="customer")$(".bizfox-chat-new").textContent="Contact admin";
  refreshRealtime();
  window.addEventListener("beforeunload",()=>{if(channel)supabase.removeChannel(channel);},{once:true});
}
