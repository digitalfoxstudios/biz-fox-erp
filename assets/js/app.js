import { supabase } from "./supabase.js";

const modules = [
  {id:"administration",icon:"▣",name:"Administration & HR",desc:"Employees, attendance, leave and duty rosters",table:"employees"},
  {id:"documents",icon:"▤",name:"Files & e-Office",desc:"Digital files, noting, approvals and movement",table:"office_files"},
  {id:"correspondence",icon:"✉",name:"Correspondence",desc:"Inward, outward letters and dispatch register",table:"correspondence"},
  {id:"finance",icon:"₹",name:"Accounts & Finance",desc:"Budgets, bills, vouchers and financial records"},
  {id:"departments",icon:"▥",name:"Departments",desc:"Department directory and responsibilities",table:"departments"},
  {id:"meetings",icon:"▦",name:"Meetings & Calendar",desc:"Agendas, minutes and action points",table:"meetings"},
  {id:"tasks",icon:"✓",name:"Tasks & Work",desc:"Assignments, deadlines and progress tracking",table:"tasks"},
  {id:"inventory",icon:"▧",name:"Inventory & Assets",desc:"Stock, equipment and asset registers",table:"assets"},
  {id:"projects",icon:"⌂",name:"Projects",desc:"Development works, milestones and monitoring",table:"projects"},
  {id:"communication",icon:"◉",name:"Communication",desc:"Messages, circulars and office notices",table:"announcements"},
  {id:"services",icon:"◎",name:"Public Services",desc:"Applications, requests and grievance tracking"},
  {id:"reports",icon:"▥",name:"Reports & Audit",desc:"Operational reports and audit trails",table:"audit_logs"},
  {id:"security",icon:"♙",name:"Users & Security",desc:"User accounts, roles and access controls",table:"organization_members"}
];
const content=document.getElementById("pageContent");
const title=document.getElementById("pageTitle");
const params=new URLSearchParams(location.search);
let currentUser=null;
let currentOrg=null;
let organizations=[];

let appRegistration=null;
let appUpdateNotice=null;
function showAppUpdateNotice(){
 if(!appUpdateNotice){appUpdateNotice=document.createElement("div");appUpdateNotice.id="appUpdateNotice";appUpdateNotice.className="app-update-notice";appUpdateNotice.setAttribute("role","status");document.body.append(appUpdateNotice);}
 appUpdateNotice.innerHTML='<div><strong>Biz FOX ERP update available</strong><p>A newer version is ready. Update now to use the latest improvements.</p></div><button type="button" id="applyAppUpdate">Update now</button>';
 document.getElementById("applyAppUpdate").addEventListener("click",()=>{const waiting=appRegistration?.waiting;if(waiting)waiting.postMessage({type:"SKIP_WAITING"});else checkForAppUpdates();});
}
async function checkForAppUpdates(){
 const button=document.getElementById("checkAppUpdate");if(button){button.disabled=true;button.textContent="Checking…";}
 try{
  if(!("serviceWorker" in navigator)){showMessage("App updates are managed by your browser.");return;}
  appRegistration=await navigator.serviceWorker.getRegistration();
  if(!appRegistration){appRegistration=await navigator.serviceWorker.register("./service-worker.js");}
  await appRegistration.update();
  if(appRegistration.waiting){showAppUpdateNotice();if(button)button.textContent="Update available";}
  else{if(button)button.textContent="App is up to date";setTimeout(()=>{if(button)button.textContent="Check updates";},2500);}
 }catch(error){showMessage("Could not check for updates. Connect to the internet and try again.");}
 finally{if(button)button.disabled=false;}
}
async function setupAppUpdates(){
 if(!("serviceWorker" in navigator))return;
 try{
  appRegistration=await navigator.serviceWorker.ready;
  if(appRegistration.waiting)showAppUpdateNotice();
  appRegistration.addEventListener("updatefound",()=>{
   const installing=appRegistration.installing;if(!installing)return;
   installing.addEventListener("statechange",()=>{if(installing.state==="installed"&&navigator.serviceWorker.controller)showAppUpdateNotice();});
  });
  navigator.serviceWorker.addEventListener("controllerchange",()=>location.reload());
  appRegistration.update().catch(()=>{});
 }catch(error){console.warn("App update check unavailable",error);}
}
function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function showMessage(message){let el=document.getElementById("appMessage");if(!el){el=document.createElement("div");el.id="appMessage";el.className="app-message";document.querySelector(".content").prepend(el);}el.textContent=message;el.hidden=false;}
function addWorkspaceControls(){
  const actions=document.querySelector(".top-actions");
  actions.innerHTML=`<select id="orgSelect" aria-label="Organization" class="org-select"><option value="">Select organization</option></select><span class="status-dot"></span><span class="status-text">Connected</span><button id="profileButton" class="profile-button" title="Account">${escapeHtml((currentUser.email||"U").slice(0,1).toUpperCase())}</button><button id="signOutButton" class="signout-button">Sign out</button>`;
  document.getElementById("profileButton").title=currentUser.email||"Account";

  document.getElementById("signOutButton").addEventListener("click",async()=>{await supabase.auth.signOut();location.href="./login.html";});
  const select=document.getElementById("orgSelect");
  organizations.forEach(o=>{const option=document.createElement("option");option.value=o.id;option.textContent=o.name;select.append(option);});
  select.value=currentOrg?.id||"";
  select.addEventListener("change",()=>{currentOrg=organizations.find(o=>o.id===select.value)||null;renderOverview();});
}
async function loadOrganizations(){
  const {data,error}=await supabase.from("organizations").select("id,name,slug").order("name");
  if(error)throw error;
  organizations=data||[];
  if(!currentOrg||!organizations.some(o=>o.id===currentOrg.id))currentOrg=organizations[0]||null;
}
function renderOnboarding(){
  title.textContent="Create workspace";
  content.innerHTML=`<div class="empty-page onboarding"><span class="module-icon">✦</span><h2>Set up your first office workspace</h2><p>Create your organization. Your account will automatically become its owner. You can add departments and invite staff in the next setup stage.</p><form id="orgForm" class="org-form"><label>Organization / Office name<input name="name" required minlength="2" maxlength="160" placeholder="e.g. Digital Fox Office"></label><label>Workspace address ID<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="digital-fox-office"><small>Lowercase letters, numbers and hyphens only.</small></label><button class="primary-button" type="submit">Create workspace</button><p id="orgError" class="form-error" role="alert"></p></form></div>`;
  document.getElementById("orgForm").addEventListener("submit",async e=>{
    e.preventDefault();const form=e.currentTarget;const button=form.querySelector("button");button.disabled=true;button.textContent="Creating…";
    const fd=new FormData(form);const {error}=await supabase.from("organizations").insert({name:String(fd.get("name")).trim(),slug:String(fd.get("slug")).trim(),created_by:currentUser.id});
    if(error){document.getElementById("orgError").textContent=error.message;button.disabled=false;button.textContent="Create workspace";return;}
    await loadOrganizations();addWorkspaceControls();renderOverview();
  });
}
async function countFor(table){
  if(!currentOrg)return null;
  const {count,error}=await supabase.from(table).select("id",{count:"exact",head:true}).eq("organization_id",currentOrg.id);
  return error?null:count;
}
async function renderOverview(){
  title.textContent="Overview";
  if(!currentOrg){renderOnboarding();return;}
  content.innerHTML=`<div class="welcome"><div><span class="eyebrow">CENTRAL OFFICE DASHBOARD</span><h2>Welcome to Biz FOX ERP</h2><p>${escapeHtml(currentOrg.name)} · Your centralized office workspace</p></div><span class="welcome-icon">✦</span></div>
  <div class="stats-grid"><article class="stat-card"><span class="stat-icon blue">▤</span><p>Open files</p><strong id="filesCount">…</strong><small>Registered office files</small></article><article class="stat-card"><span class="stat-icon green">✓</span><p>Pending tasks</p><strong id="tasksCount">…</strong><small>Tasks awaiting completion</small></article><article class="stat-card"><span class="stat-icon amber">₹</span><p>Projects</p><strong id="projectsCount">…</strong><small>Project records</small></article><article class="stat-card"><span class="stat-icon violet">♙</span><p>Employees</p><strong id="employeesCount">…</strong><small>Staff directory records</small></article></div>
  <div class="section-heading"><div><h3>Office modules</h3><p>Choose a module to open its workspace.</p></div></div><div class="module-grid" id="moduleGrid"></div>
  <div class="notice"><strong>Connected workspace</strong><p>Dashboard totals are read from your secured Supabase workspace. Modules are being implemented in phases; unfinished modules are clearly marked.</p></div>`;
  document.getElementById("moduleGrid").innerHTML=modules.map(m=>`<button class="module-card" data-page="${m.id}"><span class="module-icon">${m.icon}</span><strong>${m.name}</strong><small>${m.desc}</small></button>`).join("");
  const [files,tasks,projects,employees]=await Promise.all([countFor("office_files"),countFor("tasks"),countFor("projects"),countFor("employees")]);
  [["filesCount",files],["tasksCount",tasks],["projectsCount",projects],["employeesCount",employees]].forEach(([id,n])=>{const el=document.getElementById(id);if(el)el.textContent=n===null?"—":n;});
}
const dataModules = {
  administration:{table:"employees",title:"Employee directory",fields:[["employee_code","Employee code","text",1],["full_name","Full name","text",1],["department_id","Department","select",0,[]],["designation","Designation","text"],["email","Email","email"],["phone","Phone","tel"],["date_of_joining","Date of joining","date"],["notes","Notes","textarea"]],columns:["employee_code","full_name","designation","employment_status","phone"],extras:[["attendance_records","Attendance register"],["leave_requests","Leave requests"]]},
  departments:{table:"departments",title:"Departments",fields:[["name","Department name","text",1],["code","Department code","text"],["description","Description","textarea"]],columns:["name","code","description","is_active"]},
  documents:{table:"office_files",title:"Office files",fields:[["file_number","File number","text",1],["subject","Subject","text",1],["description","Description","textarea"],["priority","Priority","select",0,["low","normal","high","urgent"]],["attachment","Attach document (max 25 MB)","file"]],columns:["file_number","subject","priority","status","storage_path","created_at"],extras:[["file_movements","File movement register"]]},
  correspondence:{table:"correspondence",title:"Inward / outward correspondence",fields:[["direction","Direction","select",1,["inward","outward"]],["reference_number","Reference number","text",1],["subject","Subject","text",1],["sender_name","Sender","text"],["recipient_name","Recipient","text"],["received_or_sent_on","Date","date"],["status","Status","select",0,["registered","under_process","replied","dispatched","closed"]]],columns:["direction","reference_number","subject","received_or_sent_on","status"]},
  finance:{table:"bills",title:"Bills register",fields:[["bill_number","Bill number","text",1],["payee_name","Payee","text",1],["purpose","Purpose","textarea",1],["bill_date","Bill date","date"],["amount","Amount (INR)","number",1]],columns:["bill_number","payee_name","purpose","amount","bill_date","status"],extras:[["budgets","Budgets"],["vouchers","Vouchers"],["financial_transactions","Transactions"],["finance_accounts","Accounts"]]},
  meetings:{table:"meetings",title:"Meetings & calendar",fields:[["title","Meeting title","text",1],["starts_at","Date and time","datetime-local",1],["location","Location","text"],["agenda","Agenda","textarea"],["status","Status","select",0,["scheduled","held","postponed","cancelled"]]],columns:["title","starts_at","location","status"]},
  tasks:{table:"tasks",title:"Tasks & work",fields:[["title","Task title","text",1],["description","Description","textarea"],["priority","Priority","select",0,["low","normal","high","urgent"]],["due_at","Due date and time","datetime-local"]],columns:["title","priority","status","due_at","created_at"]},
  inventory:{table:"assets",title:"Asset register",fields:[["asset_code","Asset code","text",1],["name","Asset name","text",1],["category","Category","text"],["location","Location","text"],["condition","Condition","select",0,["new","good","needs_repair","retired"]],["acquired_on","Acquired on","date"]],columns:["asset_code","name","category","location","condition"],extras:[["stock_items","Stock items"],["stock_movements","Stock movements"]]},
  projects:{table:"projects",title:"Projects & development works",fields:[["project_code","Project code","text",1],["name","Project name","text",1],["description","Description","textarea"],["status","Status","select",0,["planned","active","on_hold","completed","cancelled"]],["start_date","Start date","date"],["target_date","Target date","date"],["budget","Budget (INR)","number"]],columns:["project_code","name","status","start_date","target_date","budget"]},
  communication:{table:"announcements",title:"Circulars & announcements",fields:[["title","Title","text",1],["body","Message","textarea",1],["published_at","Publish date and time","datetime-local"],["expires_at","Expiry date and time","datetime-local"]],columns:["title","published_at","expires_at","created_at"]},
  services:{table:"applications",title:"Applications register",fields:[["application_number","Application number","text",1],["applicant_name","Applicant name","text",1],["service_name","Service requested","text",1],["submitted_on","Submission date","date"],["notes","Notes","textarea"]],columns:["application_number","applicant_name","service_name","submitted_on","status"],extras:[["grievances","Grievances"]]},
  reports:{table:"audit_logs",title:"Audit trail",readOnly:true,fields:[],columns:["created_at","actor_user_id","action","entity_type","entity_id","details"]},
  security:{table:"organization_members",title:"Workspace members",readOnly:true,fields:[],columns:["user_id","role","status","created_at"]}
};
const extraConfigs = {
 attendance_records:{table:"attendance_records",title:"Attendance register",fields:[["employee_id","Employee","select",1,[]],["attendance_date","Attendance date","date"],["check_in","Check-in","datetime-local"],["check_out","Check-out","datetime-local"],["status","Status","select",0,["present","absent","half_day","holiday","leave"]],["remarks","Remarks","textarea"]],columns:["employee_id","attendance_date","check_in","check_out","status","remarks"]},
 leave_requests:{table:"leave_requests",title:"Leave requests",fields:[["employee_id","Employee","select",1,[]],["leave_type","Leave type","text",1],["start_date","Start date","date",1],["end_date","End date","date",1],["reason","Reason","textarea"], ],columns:["employee_id","leave_type","start_date","end_date","status"]},
 file_movements:{table:"file_movements",title:"File movement register",readOnly:true,orderBy:"moved_at",fields:[],columns:["office_file_id","from_user_id","to_user_id","action","movement_note","moved_at"]},
 budgets:{table:"budgets",title:"Budget register",fields:[["fiscal_year","Financial year","text",1],["budget_head","Budget head","text",1],["allocated_amount","Allocated amount (INR)","number",1],["revised_amount","Revised amount (INR)","number"],["notes","Notes","textarea"]],columns:["fiscal_year","budget_head","allocated_amount","revised_amount"]},
 vouchers:{table:"vouchers",title:"Vouchers",fields:[["voucher_number","Voucher number","text",1],["voucher_type","Voucher type","select",1,["payment","receipt","journal"]],["voucher_date","Voucher date","date"],["amount","Amount (INR)","number",1],["narration","Narration","textarea",1]],columns:["voucher_number","voucher_type","voucher_date","amount","status"]},
 financial_transactions:{table:"financial_transactions",title:"Financial transactions",fields:[["transaction_date","Date","date"],["transaction_type","Type","select",1,["income","expense","transfer"]],["amount","Amount (INR)","number",1],["reference_number","Reference number","text"],["description","Description","textarea",1]],columns:["transaction_date","transaction_type","amount","reference_number","description"]},
 finance_accounts:{table:"finance_accounts",title:"Finance accounts",fields:[["account_code","Account code","text",1],["account_name","Account name","text",1],["account_type","Account type","select",1,["cash","bank","income","expense","liability","asset","equity"]]],columns:["account_code","account_name","account_type","is_active"]},
 stock_items:{table:"stock_items",title:"Stock items",fields:[["item_code","Item code","text",1],["item_name","Item name","text",1],["unit","Unit","text"],["quantity","Opening quantity","number"],["reorder_level","Reorder level","number"],["location","Storage location","text"]],columns:["item_code","item_name","unit","quantity","reorder_level","location"]},
 stock_movements:{table:"stock_movements",title:"Stock movement register",readOnly:true,orderBy:"moved_at",fields:[],columns:["stock_item_id","movement_type","quantity","reference_number","moved_at"]},
 grievances:{table:"grievances",title:"Grievance register",fields:[["tracking_number","Tracking number","text",1],["applicant_name","Applicant name","text",1],["contact","Contact","tel"],["subject","Subject","text",1],["description","Description","textarea",1],],columns:["tracking_number","applicant_name","subject","status","created_at"]}
};
function fieldMarkup(field){
 const [key,label,type,required,options]=field;const req=required?"required":"";
 if(type==="select")return `<label>${label}<select name="${key}" ${req}><option value="">Select ${label}</option>${(options||[]).map(x=>`<option value="${x}">${x.replaceAll("_"," ")}</option>`).join("")}</select></label>`;
 if(type==="file")return `<label class="wide-field">${label}<input name="${key}" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx"></label>`;
 if(type==="textarea")return `<label class="wide-field">${label}<textarea name="${key}" rows="2" ${req}></textarea></label>`;
 return `<label>${label}<input name="${key}" type="${type}" ${type==="number"?'step="0.01" min="0"':""} ${req}></label>`;
}
function formatCell(value){
 if(value===null||value===undefined||value==="")return "—";
 if(typeof value==="object")return escapeHtml(JSON.stringify(value));
 return escapeHtml(String(value).replaceAll("_"," "));
}
async function renderDataTable(config){
 const {data,error}=await supabase.from(config.table).select("*").eq("organization_id",currentOrg.id).order(config.orderBy||"created_at",{ascending:false}).limit(100);
 const table=document.getElementById("recordsTable");if(!table)return;
 if(error){table.innerHTML=`<p class="form-error">${escapeHtml(error.message)}</p>`;return;}
 if(!data?.length){table.innerHTML='<div class="empty-records">No records yet. Use the form above to add the first record.</div>';return;}
 const signedFiles={};
 if(config.table==="office_files"){await Promise.all(data.filter(row=>row.storage_path).map(async row=>{const {data:link}=await supabase.storage.from("office-documents").createSignedUrl(row.storage_path,3600);if(link?.signedUrl)signedFiles[row.id]=link.signedUrl;}));}
 const canManage=!config.readOnly;
 table.innerHTML=`<div class="table-scroll"><table><thead><tr>${config.columns.map(c=>`<th>${escapeHtml(c.replaceAll("_"," "))}</th>`).join("")}${canManage?"<th>Actions</th>":""}</tr></thead><tbody>${data.map(row=>`<tr>${config.columns.map(c=>`<td>${c==="storage_path"&&signedFiles[row.id]?`<a href="${escapeHtml(signedFiles[row.id])}" target="_blank" rel="noopener">Download</a>`:formatCell(row[c])}</td>`).join("")}${canManage?`<td><button type="button" class="secondary-button" data-edit-record="${row.id}">Edit</button> <button type="button" class="secondary-button" data-delete-record="${row.id}">Delete</button></td>`:""}</tr>`).join("")}</tbody></table></div>`;
 if(canManage){
  table.querySelectorAll("[data-edit-record]").forEach(button=>button.addEventListener("click",()=>{
   const row=data.find(item=>item.id===button.dataset.editRecord);const form=document.getElementById("recordForm");if(!row||!form)return;
   for(const field of config.fields){const input=form.elements[field[0]];if(!input||field[2]==="file")continue;input.value=row[field[0]]??"";}
   form.dataset.editId=row.id;form.querySelector('button[type="submit"]').textContent="Update record";
   document.getElementById("recordMessage").textContent="Editing selected record. Save to apply changes.";
   form.scrollIntoView({behavior:"smooth",block:"start"});
  }));
  table.querySelectorAll("[data-delete-record]").forEach(button=>button.addEventListener("click",async()=>{
   const row=data.find(item=>item.id===button.dataset.deleteRecord);if(!row||!confirm("Delete this record permanently? This cannot be undone."))return;
   button.disabled=true;const {error}=await supabase.from(config.table).delete().eq("id",row.id).eq("organization_id",currentOrg.id);
   if(error){showMessage("Delete failed: "+error.message);button.disabled=false;return;}
   await renderDataTable(config);
  }));
 }
}
async function openDataConfig(config){
 title.textContent=config.title;
 const canWrite=!config.readOnly;
 content.innerHTML=`<div class="data-page"><div class="data-page-head"><div><span class="tag">${config.readOnly?"Read only":"Workspace records"}</span><h2>${escapeHtml(config.title)}</h2><p>Organization: ${escapeHtml(currentOrg.name)}</p></div><button id="refreshRecords" class="secondary-button">Refresh</button></div>
 ${config.extras?.length?`<div class="submodule-links">${config.extras.map(([id,label])=>`<button data-submodule="${id}">${label}</button>`).join("")}</div>`:""}
 ${canWrite?`<form id="recordForm" class="record-form"><div class="form-grid">${config.fields.map(fieldMarkup).join("")}</div><button class="primary-button" type="submit">Save record</button><p id="recordMessage" class="form-message" role="status"></p></form>`:""}
 <div class="records-heading"><h3>Records</h3><span>Latest 100</span></div><div id="recordsTable" class="records-table">Loading records…</div></div>`;
 const needsEmployees=config.fields.some(field=>field[0]==="employee_id");
 const needsDepartments=config.fields.some(field=>field[0]==="department_id");
 if(needsEmployees||needsDepartments){
  const [employeeResult,departmentResult]=await Promise.all([
   needsEmployees?supabase.from("employees").select("id,employee_code,full_name").eq("organization_id",currentOrg.id).order("full_name"):Promise.resolve({data:[]}),
   needsDepartments?supabase.from("departments").select("id,name,code").eq("organization_id",currentOrg.id).eq("is_active",true).order("name"):Promise.resolve({data:[]})
  ]);
  const employeeSelect=content.querySelector('[name="employee_id"]');
  (employeeResult.data||[]).forEach(emp=>{const option=document.createElement("option");option.value=emp.id;option.textContent=[emp.employee_code,emp.full_name].filter(Boolean).join(" · ");employeeSelect?.append(option);});
  const departmentSelect=content.querySelector('[name="department_id"]');
  (departmentResult.data||[]).forEach(dep=>{const option=document.createElement("option");option.value=dep.id;option.textContent=dep.code?dep.code+" · "+dep.name:dep.name;departmentSelect?.append(option);});
 }
 document.getElementById("refreshRecords").addEventListener("click",()=>renderDataTable(config));
 content.querySelectorAll("[data-submodule]").forEach(b=>b.addEventListener("click",()=>openDataConfig(extraConfigs[b.dataset.submodule])));
 if(canWrite)document.getElementById("recordForm").addEventListener("submit",async e=>{
  e.preventDefault();const form=e.currentTarget;const button=form.querySelector("button[type=submit]");button.disabled=true;button.textContent="Saving…";
  const payload={organization_id:currentOrg.id};
  for(const f of config.fields){if(f[2]==="file")continue;const el=form.elements[f[0]];if(!el||el.value==="")continue;let value=el.value;if(f[2]==="number")value=Number(value);if(f[2]==="datetime-local")value=new Date(value).toISOString();payload[f[0]]=value;}
  const attachment=form.elements.attachment?.files?.[0];
  const editId=form.dataset.editId;const saveQuery=editId?supabase.from(config.table).update(payload).eq("id",editId).eq("organization_id",currentOrg.id):supabase.from(config.table).insert(payload);const {data:saved,error}=await saveQuery.select("id").single();
  let finalError=error;
  if(!finalError&&attachment&&config.table==="office_files"){
    const safeName=attachment.name.replace(/[^a-zA-Z0-9._-]+/g,"_");
    const path=currentOrg.id+"/"+saved.id+"/"+safeName;
    const {error:uploadError}=await supabase.storage.from("office-documents").upload(path,attachment,{contentType:attachment.type||"application/octet-stream",upsert:false});
    if(uploadError)finalError=uploadError;
    else {const {error:updateError}=await supabase.from("office_files").update({storage_path:path}).eq("id",saved.id);if(updateError)finalError=updateError;}
  }
  const msg=document.getElementById("recordMessage");msg.textContent=finalError?("Record saved, but an operation failed: "+finalError.message):"Record saved successfully.";msg.className="form-message "+(finalError?"error":"success");
  button.disabled=false;button.textContent="Save record";if(!finalError){form.reset();delete form.dataset.editId;button.textContent="Save record";await renderDataTable(config);}
 });
 await renderDataTable(config);
}
async function openPage(id){
 const m=modules.find(x=>x.id===id);if(!m){renderOverview();return;}
 const config=dataModules[id];
 if(config){await openDataConfig(config);return;}
 title.textContent=m.name;
 content.innerHTML=`<div class="empty-page"><span class="module-icon">${m.icon}</span><h2>${m.name}</h2><span class="tag">Under development</span><p>${m.desc}. This module is on the implementation roadmap and will be connected to the workspace in a later phase.</p></div>`;
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(!b)return;const id=b.dataset.page;if(id==="overview")renderOverview();else openPage(id);document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.page===id));document.getElementById("sidebar").classList.remove("open");});
document.getElementById("menuToggle").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("sidebarAppUpdate").addEventListener("click",()=>{
 const item=document.getElementById("sidebarAppUpdate");
 document.getElementById("sidebar").classList.remove("open");
 item.disabled=true;
 const label=item.querySelector("span:nth-child(2)");
 const original=label.textContent;
 label.textContent="Checking for updates…";
 if(window.BizFoxAndroid?.checkForUpdates){
   window.BizFoxAndroid.checkForUpdates();
   setTimeout(()=>{item.disabled=false;label.textContent=original;},1800);
   return;
 }
 item.disabled=false;label.textContent=original;
 window.open("https://github.com/digitalfoxstudios/biz-fox-erp/releases/latest","_blank","noopener");
});
document.getElementById("year").textContent=new Date().getFullYear();

const {data:{session},error:sessionError}=await supabase.auth.getSession();
if(sessionError||!session){location.replace("./login.html");}
else{
  currentUser=session.user;
  setupAppUpdates();
  try{await loadOrganizations();addWorkspaceControls();if(organizations.length)renderOverview();else renderOnboarding();}
  catch(error){content.innerHTML=`<div class="empty-page"><h2>Workspace connection issue</h2><p>${escapeHtml(error.message)}</p></div>`;}
  supabase.auth.onAuthStateChange((_event,newSession)=>{if(!newSession)location.href="./login.html";});
}
