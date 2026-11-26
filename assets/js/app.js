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
  actions.innerHTML='<span class="status-dot"></span><span class="status-text">Company workspace</span>';
}
async function renderProfile(){
  title.textContent="My Profile";
  const meta=currentUser.user_metadata||{};
  const displayName=meta.full_name||meta.name||meta.display_name||"Account holder";
  let role="Member";
  if(currentOrg){
    const {data}=await supabase.from("organization_members").select("role").eq("organization_id",currentOrg.id).eq("user_id",currentUser.id).eq("status","active").maybeSingle();
    if(data?.role)role=data.role;
  }
  const initial=escapeHtml((displayName!=="Account holder"?displayName:currentUser.email||"U").slice(0,1).toUpperCase());
  content.innerHTML=`<section class="profile-page">
    <div class="profile-hero"><div class="profile-avatar">${initial}</div><div><span class="eyebrow">ACCOUNT SETTINGS</span><h2>${escapeHtml(displayName)}</h2><p>Signed in to Biz FOX ERP</p></div></div>
    <div class="profile-details">
      <div class="profile-detail"><small>Full name</small><strong>${escapeHtml(displayName)}</strong></div>
      <div class="profile-detail"><small>Email / login</small><strong>${escapeHtml(currentUser.email||"Not available")}</strong></div>
      <div class="profile-detail"><small>Company</small><strong>${escapeHtml(currentOrg?.name||"No company linked")}</strong></div>
      <div class="profile-detail"><small>Access role</small><strong>${escapeHtml(role.replaceAll("_"," "))}</strong></div>
      <div class="profile-detail"><small>Account ID</small><strong class="profile-id">${escapeHtml(currentUser.id)}</strong></div>
    </div>
    <div class="profile-actions"><button class="signout-button profile-signout" id="profileSignOut" type="button">Sign out of Biz FOX ERP</button></div>
  </section>`;
  document.getElementById("profileSignOut").addEventListener("click",async()=>{
    const button=document.getElementById("profileSignOut");button.disabled=true;button.textContent="Signing out…";
    const {error}=await supabase.auth.signOut();
    if(error){button.disabled=false;button.textContent="Sign out of Biz FOX ERP";showMessage("Sign out failed: "+error.message);return;}
    location.replace("./login.html");
  });
}
async function loadOrganizations(){
  const {data,error}=await supabase.from("organizations").select("id,name,slug").order("name");
  if(error)throw error;
  organizations=data||[];
  if(!currentOrg||!organizations.some(o=>o.id===currentOrg.id))currentOrg=organizations[0]||null;
}
function renderOnboarding(){
  title.textContent="Company access";
  content.innerHTML=`<div class="empty-page"><span class="module-icon">▣</span><h2>Company workspace access required</h2><p>This Biz FOX ERP installation is configured for one company. Your account does not have access to the company workspace.</p><p>Contact the company administrator to activate your account. New company workspaces cannot be created from this portal.</p><button class="primary-button" id="companySignOut" type="button">Sign out</button></div>`;
  document.getElementById("companySignOut").addEventListener("click",async()=>{await supabase.auth.signOut();location.href="./login.html";});
}
async function countFor(table){
  if(!currentOrg)return null;
  const {count,error}=await supabase.from(table).select("id",{count:"exact",head:true}).eq("organization_id",currentOrg.id);
  return error?null:count;
}
async function renderOverview(){
 title.textContent="Overview";
 if(!currentOrg){renderOnboarding();return;}
 content.innerHTML=`<section class="welcome"><div><span class="eyebrow">CENTRAL OFFICE DASHBOARD</span><h2>Welcome to Biz FOX ERP</h2><p>${escapeHtml(currentOrg.name)} · Your business at a glance</p><div class="welcome-meta"><span><i></i> Secure workspace connected</span><span id="dashboardDate"></span></div></div><span class="welcome-icon">✦</span></section>
 <div class="dashboard-section-title"><div><span class="eyebrow">LIVE WORKSPACE</span><h3>Business overview</h3><p>Live totals from your company records</p></div><button class="secondary-button" id="dashboardRefresh" type="button">↻ Refresh</button></div>
 <div class="stats-grid dashboard-stats">
 <article class="stat-card"><span class="stat-icon blue">▤</span><p>Office files</p><strong id="filesCount">—</strong><small>Registered documents</small></article>
 <article class="stat-card"><span class="stat-icon green">✓</span><p>Active tasks</p><strong id="tasksCount">—</strong><small>Work not yet completed</small></article>
 <article class="stat-card"><span class="stat-icon amber">⌂</span><p>Projects</p><strong id="projectsCount">—</strong><small>Company projects</small></article>
 <article class="stat-card"><span class="stat-icon violet">♙</span><p>Employees</p><strong id="employeesCount">—</strong><small>Active staff members</small></article>
 </div>
 <div class="dashboard-panels">
 <section class="dashboard-panel"><div class="panel-heading"><div><h3>Work status</h3><p>Distribution of assigned tasks</p></div><span class="panel-symbol">◷</span></div><div id="taskStatusChart" class="task-status-chart"><div class="chart-loading">Loading task status…</div></div></section>
 <section class="dashboard-panel"><div class="panel-heading"><div><h3>Quick actions</h3><p>Jump straight into daily work</p></div><span class="panel-symbol">✦</span></div><div class="quick-action-grid">
 <button data-page="tasks"><span>＋</span><b>Assign work</b><small>Create a staff task</small></button>
 <button data-page="administration"><span>♙</span><b>Add employee</b><small>Manage staff accounts</small></button>
 <button data-page="documents"><span>▤</span><b>Register file</b><small>Start an e-Office file</small></button>
 <button data-page="finance"><span>₹</span><b>Add bill</b><small>Record an expense</small></button>
 </div></section>
 </div>
 <section class="dashboard-panel dashboard-recent"><div class="panel-heading"><div><h3>Recent work</h3><p>Latest assignments and their current status</p></div><button class="text-action" data-page="tasks">View all work →</button></div><div id="recentWorkList" class="recent-work-list"><div class="chart-loading">Loading recent work…</div></div></section>
 <div class="section-heading"><div><h3>Office modules</h3><p>Choose a module to open its workspace.</p></div></div><div class="module-grid" id="moduleGrid"></div>`;
 document.getElementById("dashboardDate").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
 document.getElementById("moduleGrid").innerHTML=modules.map(m=>`<button class="module-card" data-page="${m.id}"><span class="module-icon">${m.icon}</span><strong>${escapeHtml(m.name)}</strong><small>${escapeHtml(m.desc)}</small></button>`).join("");
 document.getElementById("dashboardRefresh").addEventListener("click",renderOverview);
 const org=currentOrg.id;
 const [files,tasks,activeTasks,projects,employees,recent]=await Promise.all([
  supabase.from("office_files").select("id",{count:"exact",head:true}).eq("organization_id",org),
  supabase.from("tasks").select("id,status,title,priority,due_at,created_at").eq("organization_id",org).order("created_at",{ascending:false}).limit(100),
  supabase.from("tasks").select("id",{count:"exact",head:true}).eq("organization_id",org).in("status",["pending","in_progress","blocked"]),
  supabase.from("projects").select("id",{count:"exact",head:true}).eq("organization_id",org),
  supabase.from("employees").select("id",{count:"exact",head:true}).eq("organization_id",org).eq("employment_status","active"),
  supabase.from("office_files").select("id,subject,file_number,status,created_at").eq("organization_id",org).order("created_at",{ascending:false}).limit(4)
 ]);
 const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
 set("filesCount",files.error?"—":files.count??0);
 set("tasksCount",activeTasks.error?"—":activeTasks.count??0);
 set("projectsCount",projects.error?"—":projects.count??0);
 set("employeesCount",employees.error?"—":employees.count??0);
 const taskRows=tasks.data||[],total=taskRows.length;
 const counts={pending:0,in_progress:0,completed:0,other:0};
 taskRows.forEach(t=>{if(t.status==="pending")counts.pending++;else if(t.status==="in_progress")counts.in_progress++;else if(t.status==="completed")counts.completed++;else counts.other++;});
 const chart=document.getElementById("taskStatusChart");
 chart.innerHTML=total?`<div class="task-chart-total"><strong>${total}</strong><span>Total assignments</span></div><div class="task-chart-bars">${[["Pending",counts.pending,"pending"],["In progress",counts.in_progress,"progress"],["Completed",counts.completed,"complete"],["Other",counts.other,"other"]].map(([label,count,kind])=>`<div class="task-chart-row"><div><span>${label}</span><b>${count}</b></div><div class="task-chart-track"><i class="chart-${kind}" style="width:${Math.round(count/total*100)}%"></i></div></div>`).join("")}</div>`:'<div class="dashboard-empty">No assignments yet. Use Quick actions to create your first task.</div>';
 const recentBox=document.getElementById("recentWorkList");
 const recentTasks=taskRows.slice(0,5);
 recentBox.innerHTML=recentTasks.length?recentTasks.map(t=>`<article class="recent-work-item"><span class="recent-work-icon">✓</span><div><b>${escapeHtml(t.title||"Untitled task")}</b><small>${t.created_at?new Date(t.created_at).toLocaleDateString():"Recently created"} · ${escapeHtml(t.priority||"normal")} priority</small></div><span class="task-state state-${escapeHtml(t.status||"pending")}">${escapeHtml((t.status||"pending").replaceAll("_"," "))}</span></article>`).join(""):((recent.data||[]).length?(recent.data||[]).map(file=>`<article class="recent-work-item"><span class="recent-work-icon">▤</span><div><b>${escapeHtml(file.subject||file.file_number||"Office file")}</b><small>File registered · ${file.created_at?new Date(file.created_at).toLocaleDateString():""}</small></div><span class="task-state state-pending">${escapeHtml(file.status||"registered")}</span></article>`).join(""):'<div class="dashboard-empty">No recent work or files yet. Your latest records will appear here.</div>');
}

const dataModules = {
  administration:{table:"employees",title:"Employee directory",fields:[["employee_code","Employee code","text",1],["full_name","Full name","text",1],["department_id","Department","select",0,[]],["designation","Designation","text"],["email","Work email (optional)","email"],["phone","Phone","tel"],["employment_status","Employment status","select",1,["active","inactive"]],["date_of_joining","Date of joining","date"],["notes","Notes","textarea"]],columns:["employee_code","full_name","designation","email","employment_status","phone"],extras:[["attendance_records","Attendance register"],["leave_requests","Leave requests"]]},
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
 if(type==="select")return `<label>${label}<select name="${key}" ${req}><option value="">Select ${label}</option>${(options||[]).map(x=>`<option value="${x}" ${key==="employment_status"&&x==="active"?"selected":""}>${x.replaceAll("_"," ")}</option>`).join("")}</select></label>`;
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
 if(!data?.length){table.innerHTML='<div class="empty-records">No records yet. Select <b>Add new</b> when you are ready to create the first record.</div>';return;}
 const signedFiles={};
 if(config.table==="office_files"){await Promise.all(data.filter(row=>row.storage_path).map(async row=>{const {data:link}=await supabase.storage.from("office-documents").createSignedUrl(row.storage_path,3600);if(link?.signedUrl)signedFiles[row.id]=link.signedUrl;}));}
 const canManage=!config.readOnly;
 table.innerHTML=`<div class="table-scroll"><table><thead><tr>${config.columns.map(c=>`<th>${escapeHtml(c.replaceAll("_"," "))}</th>`).join("")}${config.table==="employees"?"<th>Staff login</th>":""}${canManage?"<th>Actions</th>":""}</tr></thead><tbody>${data.map(row=>`<tr>${config.columns.map(c=>`<td>${c==="storage_path"&&signedFiles[row.id]?`<a href="${escapeHtml(signedFiles[row.id])}" target="_blank" rel="noopener">Download</a>`:formatCell(row[c])}</td>`).join("")}${config.table==="employees"?`<td>${row.employment_status==="active"?`<button type="button" class="secondary-button" data-create-staff-login="${row.id}">${row.user_id?"Set / Reset credentials":"Create username & password"}</button>`:"Set status to Active"}</td>`:""}${canManage?`<td><button type="button" class="secondary-button" data-edit-record="${row.id}">Edit</button> <button type="button" class="secondary-button" data-delete-record="${row.id}">Delete</button></td>`:""}</tr>`).join("")}</tbody></table></div>`;
 if(canManage){
  table.querySelectorAll("[data-create-staff-login]").forEach(button=>button.addEventListener("click",async()=>{
   const employee=data.find(item=>item.id===button.dataset.createStaffLogin);if(!employee)return;
   const username=prompt("Create a username for "+employee.full_name+":");if(username===null)return;
   const password=prompt("Set an 8-digit numeric password for "+employee.full_name+":");if(password===null)return;
   if(!/^[a-zA-Z0-9._-]{3,32}$/.test(username.trim())){showMessage("Username must be 3-32 characters using letters, numbers, dot, underscore or hyphen.");return;}
   if(!/^[0-9]{8}$/.test(password)){showMessage("Password must contain exactly 8 digits.");return;}
   if(!confirm("Save credentials for "+employee.full_name+"? Share the password securely."))return;
   button.disabled=true;button.textContent="Saving credentials...";
   const {data:result,error}=await supabase.functions.invoke("admin-create-staff",{body:{organization_id:currentOrg.id,employee_id:employee.id,username:username.trim().toLowerCase(),password}});
   if(error||result?.error){showMessage("Staff credentials could not be saved: "+(result?.error||error?.message||"Unknown error"));button.disabled=false;button.textContent="Create username & password";return;}
   showMessage("Staff login created. Username: "+result.username+". Give the employee their 8-digit password securely.");
   await renderDataTable(config);
  }));
  table.querySelectorAll("[data-edit-record]").forEach(button=>button.addEventListener("click",()=>{
   const row=data.find(item=>item.id===button.dataset.editRecord);const form=document.getElementById("recordForm");if(!row||!form)return;
   for(const field of config.fields){const input=form.elements[field[0]];if(!input||field[2]==="file")continue;input.value=row[field[0]]??"";}
   form.dataset.editId=row.id;form.hidden=false;document.getElementById("addRecordButton")?.setAttribute("hidden","");form.querySelector("[data-cancel-form]").hidden=false;form.querySelector('button[type="submit"]').textContent="Update record";
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
 content.innerHTML=`<div class="data-page"><div class="data-page-head"><div><span class="tag">${config.readOnly?"Read only":"Workspace records"}</span><h2>${escapeHtml(config.title)}</h2><p>Organization: ${escapeHtml(currentOrg.name)}</p></div><div class="data-page-actions">${canWrite?'<button id="addRecordButton" class="primary-button" type="button">+ Add new</button>':""}<button id="refreshRecords" class="secondary-button">Refresh</button></div></div>
 ${config.extras?.length?`<div class="submodule-links">${config.extras.map(([id,label])=>`<button data-submodule="${id}">${label}</button>`).join("")}</div>`:""}
 ${canWrite?`<form id="recordForm" class="record-form" hidden><div class="form-grid">${config.fields.map(fieldMarkup).join("")}</div><div class="record-form-actions"><button class="primary-button" type="submit">Save record</button><button class="secondary-button" type="button" data-cancel-form hidden>Cancel</button></div><p id="recordMessage" class="form-message" role="status"></p></form>`:""}
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
  const recordForm=document.getElementById("recordForm");
  document.getElementById("addRecordButton")?.addEventListener("click",()=>{recordForm.hidden=false;recordForm.reset();delete recordForm.dataset.editId;recordForm.querySelector("button[type=submit]").textContent="Save record";recordForm.querySelector("[data-cancel-form]").hidden=false;recordForm.scrollIntoView({behavior:"smooth",block:"start"});});
  recordForm?.querySelector("[data-cancel-form]")?.addEventListener("click",()=>{recordForm.reset();delete recordForm.dataset.editId;recordForm.hidden=true;document.getElementById("addRecordButton")?.removeAttribute("hidden");recordForm.querySelector("[data-cancel-form]").hidden=true;recordForm.querySelector("button[type=submit]").textContent="Save record";});
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
  button.disabled=false;button.textContent="Save record";if(!finalError){form.reset();delete form.dataset.editId;form.hidden=true;form.querySelector("[data-cancel-form]").hidden=true;document.getElementById("addRecordButton")?.removeAttribute("hidden");button.textContent="Save record";await renderDataTable(config);}
 });
 await renderDataTable(config);
}

async function openTaskWorkspace(){
 title.textContent="Tasks & Work";
 const {data:member}=await supabase.from("organization_members").select("role").eq("organization_id",currentOrg.id).eq("user_id",currentUser.id).eq("status","active").maybeSingle();
 const manager=member&&["owner","admin","manager"].includes(member.role);
 if(!manager){
  content.innerHTML='<div class="empty-page"><span class="module-icon">✓</span><h2>Staff work portal</h2><p>Assignments and work reports are available in the dedicated staff app.</p><a class="primary-button" href="./staff.html">Open Staff App</a></div>';
  return;
 }
 content.innerHTML=`<div class="data-page">
  <div class="data-page-head"><div><span class="tag">Manager workspace</span><h2>Assign and monitor staff work</h2><p>Assign work to linked staff accounts, track progress and review submitted reports.</p></div><a class="secondary-button" href="./staff.html" target="_blank" rel="noopener">Staff app preview</a></div>
  <div class="data-page-actions task-add-action"><button id="addAssignmentButton" class="primary-button" type="button">+ New assignment</button></div><form id="assignmentForm" class="record-form" hidden><h3>New work assignment</h3><div class="form-grid">
   <label>Work / assignment title<input name="title" required maxlength="180" placeholder="Enter work title"></label>
   <label>Assign to staff member<select name="assigned_to" required><option value="">Loading staff…</option></select></label>
   <label>Priority<select name="priority"><option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
   <label>Deadline<input name="due_at" type="datetime-local"></label>
   <label class="wide-field">Instructions / work details<textarea name="description" rows="3" placeholder="Describe the expected work and deliverables"></textarea></label>
  </div><div class="record-form-actions"><button class="primary-button" type="submit">Assign work</button><button class="secondary-button" type="button" id="cancelAssignment">Cancel</button></div><p id="assignmentMessage" class="form-message" role="status"></p></form>
  <div class="records-heading"><h3>Assigned work</h3><span id="taskCount">Loading…</span></div><div id="managerTaskList" class="task-work-list">Loading assignments…</div>
  <div class="records-heading"><h3>Staff work reports</h3><span>Review and respond</span></div><div id="managerReportList" class="task-report-list">Loading reports…</div>
 </div>`;
 const assignmentForm=document.getElementById("assignmentForm");
  document.getElementById("addAssignmentButton").addEventListener("click",()=>{assignmentForm.hidden=false;assignmentForm.scrollIntoView({behavior:"smooth",block:"start"});});
  document.getElementById("cancelAssignment").addEventListener("click",()=>{assignmentForm.reset();assignmentForm.hidden=true;});
  const staffSelect=document.querySelector('#assignmentForm [name="assigned_to"]');
 const {data:staff,error:staffError}=await supabase.from("employees").select("user_id,full_name,employee_code,designation").eq("organization_id",currentOrg.id).eq("employment_status","active").not("user_id","is",null).order("full_name");
 if(staffError){staffSelect.innerHTML='<option value="">Could not load staff</option>';document.getElementById("assignmentMessage").textContent=staffError.message;}
 else if(!staff?.length){staffSelect.innerHTML='<option value="">No linked staff accounts yet</option>';document.getElementById("assignmentMessage").textContent="Add the employee in Administration & HR, then use Create username & password in the employee list. Give the employee those credentials to sign in to the unified app.";}
 else{staffSelect.innerHTML='<option value="">Choose staff member</option>'+staff.map(x=>'<option value="'+escapeHtml(x.user_id)+'">'+escapeHtml([x.employee_code,x.full_name,x.designation].filter(Boolean).join(" · "))+'</option>').join("");}
 document.getElementById("assignmentForm").addEventListener("submit",async e=>{
  e.preventDefault();const form=e.currentTarget;const button=form.querySelector('button[type="submit"]');const fd=new FormData(form);
  if(!fd.get("assigned_to")){document.getElementById("assignmentMessage").textContent="Please select a linked staff member.";return;}
  button.disabled=true;button.textContent="Assigning…";
  const payload={organization_id:currentOrg.id,title:String(fd.get("title")).trim(),description:String(fd.get("description")||"").trim()||null,priority:String(fd.get("priority")||"normal"),assigned_to:String(fd.get("assigned_to")),created_by:currentUser.id,due_at:fd.get("due_at")?new Date(String(fd.get("due_at"))).toISOString():null};
  const {error}=await supabase.from("tasks").insert(payload);
  document.getElementById("assignmentMessage").textContent=error?"Assignment failed: "+error.message:"Work assigned successfully.";
  document.getElementById("assignmentMessage").className="form-message "+(error?"error":"success");
  button.disabled=false;button.textContent="Assign work";
  if(!error){form.reset();form.hidden=true;await refreshManagerWork(staff);}
 });
 await refreshManagerWork(staff||[]);
}
async function refreshManagerWork(staff){
 const [taskResult,reportResult]=await Promise.all([
  supabase.from("tasks").select("*").eq("organization_id",currentOrg.id).order("created_at",{ascending:false}).limit(100),
  supabase.from("task_reports").select("*").eq("organization_id",currentOrg.id).order("created_at",{ascending:false}).limit(100)
 ]);
 const taskBox=document.getElementById("managerTaskList"),reportBox=document.getElementById("managerReportList");if(!taskBox||!reportBox)return;
 if(taskResult.error){taskBox.innerHTML='<p class="form-error">'+escapeHtml(taskResult.error.message)+'</p>';return;}
 const staffMap=Object.fromEntries((staff||[]).map(x=>[x.user_id,x.full_name]));
 const tasks=taskResult.data||[];document.getElementById("taskCount").textContent=tasks.length+" assignments";
 taskBox.innerHTML=tasks.length?tasks.map(t=>`<article class="task-work-card"><div class="task-work-main"><div><span class="task-priority priority-${escapeHtml(t.priority)}">${escapeHtml(t.priority)}</span><span class="task-state state-${escapeHtml(t.status)}">${escapeHtml(t.status.replaceAll("_"," "))}</span></div><h3>${escapeHtml(t.title)}</h3><p>${escapeHtml(t.description||"No extra instructions")}</p><small>Assigned to: ${escapeHtml(staffMap[t.assigned_to]||"Staff account")} · Due: ${t.due_at?escapeHtml(new Date(t.due_at).toLocaleString()):"No deadline"}</small><div class="task-manager-actions"><button type="button" data-task-status="${t.id}" data-next-status="in_progress" ${t.status==="in_progress"?"disabled":""}>Mark in progress</button><button type="button" data-task-status="${t.id}" data-next-status="completed" ${t.status==="completed"?"disabled":""}>Mark completed</button></div></div></article>`).join(""):'<div class="empty-records">No assignments yet. Create the first assignment above.</div>';
taskBox.querySelectorAll("[data-task-status]").forEach(button=>button.addEventListener("click",async()=>{
  const id=button.dataset.taskStatus,status=button.dataset.nextStatus;
  button.disabled=true;button.textContent="Saving…";
  const {error}=await supabase.from("tasks").update({status}).eq("id",id).eq("organization_id",currentOrg.id);
  if(error){showMessage("Task status could not be updated: "+error.message);button.disabled=false;button.textContent=status==="completed"?"Mark completed":"Mark in progress";return;}
  await refreshManagerWork(staff);
 }));
  if(reportResult.error){reportBox.innerHTML='<p class="form-error">'+escapeHtml(reportResult.error.message)+'</p>';return;}
 const taskMap=Object.fromEntries(tasks.map(t=>[t.id,t.title]));
 const reports=reportResult.data||[];
 const reportPhotoLinks={};await Promise.all(reports.flatMap(r=>(r.photo_paths||[]).map(async path=>{const {data}=await supabase.storage.from("task-reports").createSignedUrl(path,3600);if(data?.signedUrl)reportPhotoLinks[path]=data.signedUrl;})));
 reportBox.innerHTML=reports.length?reports.map(r=>`<article class="task-report-card"><div class="report-card-head"><div><strong>${escapeHtml(taskMap[r.task_id]||"Work assignment")}</strong><small>${escapeHtml(staffMap[r.submitted_by]||"Staff member")} · ${escapeHtml(r.report_date)}</small></div><span class="task-state state-${escapeHtml(r.report_status)}">${escapeHtml(r.report_status.replaceAll("_"," "))}</span></div><p><b>Work completed:</b> ${escapeHtml(r.work_done)}</p>${r.challenges?'<p><b>Challenges:</b> '+escapeHtml(r.challenges)+'</p>':''}${r.next_steps?'<p><b>Next steps:</b> '+escapeHtml(r.next_steps)+'</p>':''}<small>Hours spent: ${r.hours_spent??"—"} · Work status: ${escapeHtml(r.task_status.replaceAll("_"," "))}</small>${(r.photo_paths||[]).length?'<div class="task-report-photos">'+r.photo_paths.map(path=>reportPhotoLinks[path]?'<a href="'+escapeHtml(reportPhotoLinks[path])+'" target="_blank" rel="noopener"><img src="'+escapeHtml(reportPhotoLinks[path])+'" alt="Work site photo"></a>':'').join('')+'</div>':''}${r.geo_status==="captured"&&r.geo_latitude!==null?'<p class="task-report-location">GPS location: '+Number(r.geo_latitude).toFixed(6)+', '+Number(r.geo_longitude).toFixed(6)+' · Accuracy ±'+Math.round(r.geo_accuracy_m||0)+' m · <a target="_blank" rel="noopener" href="https://www.google.com/maps?q='+r.geo_latitude+','+r.geo_longitude+'">Open map</a></p>':''}<label>Manager feedback<textarea id="feedback-${r.id}" rows="2" placeholder="Add feedback or revision instructions">${escapeHtml(r.manager_feedback||"")}</textarea></label><div class="report-actions"><button class="secondary-button" data-review-report="${r.id}" data-status="approved">Approve report</button><button class="secondary-button" data-review-report="${r.id}" data-status="revision_requested">Request changes</button></div></article>`).join(""):'<div class="empty-records">No work reports submitted yet.</div>';
 reportBox.querySelectorAll("[data-review-report]").forEach(button=>button.addEventListener("click",async()=>{
  const id=button.dataset.reviewReport,status=button.dataset.status,feedback=document.getElementById("feedback-"+id).value.trim();
  button.disabled=true;const {error}=await supabase.from("task_reports").update({report_status:status,manager_feedback:feedback||null}).eq("id",id).eq("organization_id",currentOrg.id);
  if(error){showMessage("Could not update report: "+error.message);button.disabled=false;return;}
  await refreshManagerWork(staff);
 }));
}

async function openReportsWorkspace(){
 title.textContent="Reports & Audit";
 content.innerHTML=`<div class="data-page"><div class="data-page-head"><div><span class="tag">Management intelligence</span><h2>Reports & Audit Centre</h2><p>Operational overview and traceable activity from your company workspace.</p></div><div class="data-page-actions"><button id="exportAuditCsv" class="secondary-button" type="button">Export audit CSV</button><button id="printReports" class="primary-button" type="button">Print report</button></div></div>
 <div class="report-kpi-grid" id="reportKpis"><div class="chart-loading">Loading report data…</div></div>
 <div class="dashboard-panels"><section class="dashboard-panel"><div class="panel-heading"><div><h3>Task performance</h3><p>Current task status distribution</p></div></div><div id="reportTaskChart" class="task-status-chart"></div></section><section class="dashboard-panel"><div class="panel-heading"><div><h3>Work report review</h3><p>Employee submissions awaiting manager action</p></div></div><div id="reportReviewSummary" class="report-review-summary"></div></section></div>
 <section class="dashboard-panel"><div class="panel-heading"><div><h3>Recent audit activity</h3><p>Latest recorded changes in this workspace</p></div><span class="tag">Latest 30</span></div><div id="auditRecords" class="records-table">Loading audit history…</div></section></div>`;
 const org=currentOrg.id;
 const [tasks,reports,employees,projects,audit]=await Promise.all([
  supabase.from("tasks").select("id,status,priority").eq("organization_id",org).limit(500),
  supabase.from("task_reports").select("id,report_status,created_at,submitted_by").eq("organization_id",org).order("created_at",{ascending:false}).limit(500),
  supabase.from("employees").select("id,employment_status").eq("organization_id",org).limit(500),
  supabase.from("projects").select("id,status").eq("organization_id",org).limit(500),
  supabase.from("audit_logs").select("created_at,actor_user_id,action,entity_type,entity_id,details").eq("organization_id",org).order("created_at",{ascending:false}).limit(30)
 ]);
 const t=tasks.data||[],r=reports.data||[],e=employees.data||[],p=projects.data||[],logs=audit.data||[];
 document.getElementById("reportKpis").innerHTML=[
  ["Total assignments",t.length,"All recorded tasks"],
  ["Completed tasks",t.filter(x=>x.status==="completed").length,"Marked as completed"],
  ["Active employees",e.filter(x=>x.employment_status==="active").length,"Currently active"],
  ["Active projects",p.filter(x=>["active","in_progress"].includes(x.status)).length,"Under execution"]
 ].map(([label,value,desc])=>`<article class="report-kpi"><small>${label}</small><strong>${value}</strong><span>${desc}</span></article>`).join("");
 const statuses=[["Pending",t.filter(x=>x.status==="pending").length,"pending"],["In progress",t.filter(x=>x.status==="in_progress").length,"progress"],["Completed",t.filter(x=>x.status==="completed").length,"complete"],["Blocked",t.filter(x=>x.status==="blocked").length,"other"]];
 const total=t.length,chart=document.getElementById("reportTaskChart");
 chart.innerHTML=total?'<div class="task-chart-total"><strong>'+total+'</strong><span>Tasks recorded</span></div><div class="task-chart-bars">'+statuses.map(([label,count,kind])=>'<div class="task-chart-row"><div><span>'+label+'</span><b>'+count+'</b></div><div class="task-chart-track"><i class="chart-'+kind+'" style="width:'+Math.round(count/total*100)+'%"></i></div></div>').join("")+'</div>':'<div class="dashboard-empty">No task records are available yet.</div>';
 const pending=r.filter(x=>!["approved","rejected"].includes(x.report_status)).length,approved=r.filter(x=>x.report_status==="approved").length;
 document.getElementById("reportReviewSummary").innerHTML='<div class="review-big"><strong>'+pending+'</strong><span>Awaiting review</span></div><div class="review-small"><span>Approved reports</span><b>'+approved+'</b></div><div class="review-small"><span>Total submissions</span><b>'+r.length+'</b></div><button class="secondary-button" type="button" data-page="tasks">Open task review →</button>';
 const auditBox=document.getElementById("auditRecords");
 auditBox.innerHTML=audit.error?'<p class="form-error">'+escapeHtml(audit.error.message)+'</p>':logs.length?'<div class="table-scroll"><table><thead><tr><th>Date & time</th><th>Action</th><th>Record type</th><th>Actor</th><th>Details</th></tr></thead><tbody>'+logs.map(x=>'<tr><td>'+escapeHtml(x.created_at?new Date(x.created_at).toLocaleString():"—")+'</td><td>'+escapeHtml(x.action||"—")+'</td><td>'+escapeHtml(x.entity_type||"—")+'</td><td>'+escapeHtml(x.actor_user_id||"—")+'</td><td>'+escapeHtml(typeof x.details==="string"?x.details:JSON.stringify(x.details||{}))+'</td></tr>').join("")+'</tbody></table></div>':'<div class="empty-records">No audit activity is recorded yet.</div>';
 document.getElementById("exportAuditCsv").addEventListener("click",()=>{
  if(!logs.length){showMessage("There are no audit records to export.");return;}
  const cols=["created_at","actor_user_id","action","entity_type","entity_id","details"];
  const quote=v=>'"'+String(typeof v==="object"?JSON.stringify(v??{}):v??"").replace(/"/g,'""')+'"';
  const csv=[cols.join(","),...logs.map(row=>cols.map(col=>quote(row[col])).join(","))].join("\r\n");
  const url=URL.createObjectURL(new Blob(["\\uFEFF",csv],{type:"text/csv;charset=utf-8"})),link=document.createElement("a");
  link.href=url;link.download="biz-fox-audit-report-"+new Date().toISOString().slice(0,10)+".csv";link.click();URL.revokeObjectURL(url);
 });
 document.getElementById("printReports").addEventListener("click",()=>window.print());
}
async function openPage(id){
 if(id==="profile"){await renderProfile();return;}
 if(id==="tasks"){await openTaskWorkspace();return;}
 if(id==="reports"){await openReportsWorkspace();return;}
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
  const {data:activeMemberships}=await supabase.from("organization_members").select("role").eq("user_id",currentUser.id).eq("status","active");
  const activeRoles=(activeMemberships||[]).map(item=>item.role);
  if(activeRoles.includes("staff")&&!activeRoles.some(role=>["owner","admin","manager"].includes(role))){location.replace("./staff.html");}
  else{
    setupAppUpdates();
    try{await loadOrganizations();addWorkspaceControls();if(organizations.length)renderOverview();else renderOnboarding();}
    catch(error){content.innerHTML=`<div class="empty-page"><h2>Workspace connection issue</h2><p>${escapeHtml(error.message)}</p></div>`;}
  }
  supabase.auth.onAuthStateChange((_event,newSession)=>{if(!newSession)location.href="./login.html";});
}
