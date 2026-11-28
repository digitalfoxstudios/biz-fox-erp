import { supabase } from "./supabase.js";
import { initNotificationCenter } from "./notifications.js";
import { initMessaging } from "./messaging.js";

const defaultDocumentTerms={
  quotation:"1. This quotation is valid for 15 days from the date of issue unless stated otherwise.\n2. Prices are based on the scope and quantities mentioned; changes may affect the price and delivery schedule.\n3. Work will begin after written acceptance and any agreed advance payment.\n4. Applicable taxes will be charged as per law.\n5. Payment is due as per the agreed payment schedule.\n6. This quotation is subject to final written confirmation by the company.",
  invoice:"1. Payment is due by the due date shown on this invoice.\n2. Please quote the invoice number when making payment.\n3. Applicable taxes are charged as per prevailing law.\n4. Any discrepancy must be reported in writing within 7 days of receipt.\n5. Late payment may result in suspension of further services, subject to the agreement and applicable law.",
  receipt:"1. This receipt acknowledges only the amount and payment method recorded above.\n2. The receipt is subject to successful clearance of cheque or other reversible payment instruments.\n3. Please retain this receipt for your records.",
  work_order:"1. Work will be performed according to the approved scope, specifications and schedule.\n2. Any change in scope, materials, price or timeline requires written approval.\n3. The customer will provide safe and reasonable site access and required utilities.\n4. Delays caused by site conditions or customer dependencies may affect the completion date.\n5. Additional work will be charged separately after approval.",
  delivery_challan:"1. Goods are delivered in the quantities and condition recorded in this challan.\n2. The receiver should verify the goods at delivery and record any shortage or damage before signing.\n3. This challan is proof of delivery and is not, by itself, proof of payment.\n4. Ownership and risk are governed by the applicable sale or supply agreement.",
  service_report:"1. This report records the service activity and observations on the visit date.\n2. Recommendations are based on the condition observed at the time of service.\n3. Parts, materials or additional work not listed in the approved scope may be charged separately.\n4. The customer should report any issue related to the service within 7 days.",
  installation_report:"1. Installation is recorded as completed only for the equipment and locations listed in this report.\n2. The customer should verify the installation and retain the configuration and warranty information supplied.\n3. Customer-provided power, network, civil work and other dependencies remain the customer's responsibility unless agreed otherwise.\n4. Warranty is subject to the manufacturer's and company's applicable warranty terms.",
  amc_agreement:"1. The agreement period, covered equipment, visit frequency and fees are as specified in this document.\n2. Services are limited to the listed equipment and agreed scope.\n3. Consumables, replacement parts, physical damage, misuse and work outside scope are excluded unless expressly included.\n4. The customer must provide access to the site and equipment during agreed service hours.\n5. Renewal, termination and payment shall follow the written agreement accepted by both parties.",
  purchase_order:"1. The supplier shall provide goods or services according to the specifications, quantities and delivery schedule in this purchase order.\n2. Substitutions or changes require prior written approval.\n3. Goods must be accompanied by applicable invoices, warranty documents and delivery records.\n4. Payment will be processed according to the approved payment terms after verification.\n5. The company may reject goods that do not meet the agreed specifications.",
  expense_voucher:"1. This voucher records the expense and payment details entered by the company.\n2. Original bills, invoices or supporting evidence must be retained wherever applicable.\n3. Reimbursement or accounting approval is subject to company policy and verification.\n4. Any incorrect entry must be reported to the accounts administrator."
 }

const modules = [
  {id:"administration",icon:"▣",name:"Administration & HR",desc:"Employees, attendance, leave and duty rosters",table:"employees"},
  {id:"documents",icon:"▤",name:"Files & e-Office",desc:"Digital files, noting, approvals and movement",table:"office_files"},
  {id:"correspondence",icon:"✉",name:"Correspondence",desc:"Inward, outward letters and dispatch register",table:"correspondence"},
  {id:"sales",icon:"◈",name:"Customers & Sales",desc:"Customer onboarding, quotations and invoices"},
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
let activePage="overview";
let activeDataConfig=null;
const pageBackStack=[];
function updateBackButton(){const b=document.getElementById("workspaceBackButton");if(b)b.disabled=pageBackStack.length===0;}
function rememberCurrentPage(){pageBackStack.push({page:activePage,config:activeDataConfig});if(pageBackStack.length>30)pageBackStack.shift();}
async function goBack(){const p=pageBackStack.pop();if(!p){updateBackButton();return;}if(p.config){activePage=p.page;await openDataConfig(p.config);}else{activeDataConfig=null;if(p.page==="overview")await renderOverview();else await openPage(p.page);}document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.page===activePage));updateBackButton();}

window.bizFoxHandleBack=async function(){
 const sidebar=document.getElementById("sidebar");
 if(sidebar?.classList.contains("open")){sidebar.classList.remove("open");return true;}
 const dialog=document.querySelector("dialog[open]");
 if(dialog){dialog.close();return true;}
 const modal=document.querySelector(".modal-overlay:not([hidden]),.modal:not([hidden])");
 if(modal){modal.remove();return true;}
 if(pageBackStack.length){await goBack();return true;}
 if(activePage!=="overview"){
  activeDataConfig=null;activePage="overview";await renderOverview();
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.page==="overview"));
  updateBackButton();return true;
 }
 return false;
};


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
  actions.innerHTML='<span class="status-dot" id="networkDot"></span><span class="status-text" id="networkStatus">Checking connection…</span><button type="button" class="notify-enable" id="enableNotifications">Allow alerts</button>';
  const update=()=>{const state=window.BizFoxOfflineState||{online:navigator.onLine,pending:0};const label=document.getElementById("networkStatus"),dot=document.getElementById("networkDot");if(label)label.textContent=!state.online?("Offline · "+state.pending+" waiting"):state.failed?("Sync failed · "+state.failed):state.pending?("Syncing · "+state.pending+" pending"):"Online · Synced";if(dot)dot.classList.toggle("offline",!state.online);};
  window.addEventListener("bizfox:syncstate",update);window.addEventListener("online",update);window.addEventListener("offline",update);update();
  window.addEventListener("bizfox:synccomplete",()=>{update();window.BizFoxOffline?.notify("Biz FOX ERP","Your saved changes are synced.");});
  document.getElementById("enableNotifications").addEventListener("click",async()=>{const enabled=await window.BizFoxOffline?.enableNotifications();if(enabled)window.BizFoxOffline?.notify("Biz FOX ERP","Notifications are enabled.");else showMessage("Please allow notifications in Android or browser settings.");});
}
let taskAlertChannel=null;
function setupTaskNotifications(){
 if(taskAlertChannel||!currentUser)return;
 try{taskAlertChannel=supabase.channel("bizfox-task-alerts-"+currentUser.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"tasks",filter:"assigned_to=eq."+currentUser.id},payload=>{const task=payload.new||{};window.BizFoxOffline?.notify("New work assigned",task.title||"A new task has been assigned to you.");}).on("postgres_changes",{event:"UPDATE",schema:"public",table:"tasks",filter:"assigned_to=eq."+currentUser.id},payload=>{const task=payload.new||{};window.BizFoxOffline?.notify("Work status updated",task.title||"Your assignment was updated.");}).subscribe();}catch(error){console.warn("Task notifications are unavailable",error);}
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
 activePage="overview";
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
 activeDataConfig=config;
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
 content.querySelectorAll("[data-submodule]").forEach(b=>b.addEventListener("click",()=>{rememberCurrentPage();openDataConfig(extraConfigs[b.dataset.submodule]);updateBackButton();}));
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
   <label>Customer<select name="customer_id"><option value="">No customer linked</option></select></label>
   <label>Site contact name<input name="site_contact_name" placeholder="Optional site contact"></label>
   <label>Site contact phone<input name="site_contact_phone" type="tel" placeholder="Optional contact number"></label>
   <label class="wide-field">Work site address<input name="site_address" placeholder="Leave blank to use customer address"></label>
   <label>Site latitude<input name="site_latitude" type="number" step="any" placeholder="Optional"></label>
   <label>Site longitude<input name="site_longitude" type="number" step="any" placeholder="Optional"></label>
   <label>Priority<select name="priority"><option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
   <label>Deadline<input name="due_at" type="datetime-local"></label>
   <label class="wide-field">Instructions / work details<textarea name="description" rows="3" placeholder="Describe the expected work and deliverables"></textarea></label>
  </div><div class="assignment-checklist-editor"><div class="assignment-checklist-heading"><div><b>Employee must-do checklist</b><small>Add the steps or items the employee must complete. At least one item is required.</small></div><button type="button" class="secondary-button" id="addAssignmentChecklistItem">+ Add item</button></div><div id="assignmentChecklistRows"></div></div><div class="record-form-actions"><button class="primary-button" type="submit">Assign work</button><button class="secondary-button" type="button" id="cancelAssignment">Cancel</button></div><p id="assignmentMessage" class="form-message" role="status"></p></form>
  <div class="records-heading"><h3>Assigned work</h3><span id="taskCount">Loading…</span></div><div id="managerTaskList" class="task-work-list">Loading assignments…</div>
  <div class="records-heading"><h3>Staff work reports</h3><span>Review and respond</span></div><div id="managerReportList" class="task-report-list">Loading reports…</div>\n   <div class="records-heading"><h3>Travel & material expense claims</h3><span>Review employee purchases and travel costs</span></div><div id="managerExpenseList" class="task-report-list">Loading expense claims…</div>
 </div>`;
 const assignmentForm=document.getElementById("assignmentForm");
  document.getElementById("addAssignmentButton").addEventListener("click",()=>{assignmentForm.hidden=false;assignmentForm.scrollIntoView({behavior:"smooth",block:"start"});});
  document.getElementById("cancelAssignment").addEventListener("click",()=>{assignmentForm.reset();assignmentForm.hidden=true;});
  const checklistRows=document.getElementById("assignmentChecklistRows");
 const addChecklistRow=(value="")=>{const row=document.createElement("div");row.className="assignment-checklist-row";row.innerHTML='<span class="assignment-check-number"></span><input type="text" maxlength="300" required data-checklist-input placeholder="e.g. Confirm customer requirements and site access"><button type="button" class="secondary-button" aria-label="Remove checklist item">Remove</button>';row.querySelector("input").value=value;row.querySelector("button").addEventListener("click",()=>{if(checklistRows.children.length===1){row.querySelector("input").value="";return;}row.remove();[...checklistRows.children].forEach((x,i)=>x.querySelector(".assignment-check-number").textContent=(i+1)+".");});checklistRows.append(row);row.querySelector(".assignment-check-number").textContent=checklistRows.children.length+".";};
 addChecklistRow();document.getElementById("addAssignmentChecklistItem").addEventListener("click",()=>addChecklistRow());
 const staffSelect=document.querySelector('#assignmentForm [name="assigned_to"]');
 const {data:staff,error:staffError}=await supabase.from("employees").select("user_id,full_name,employee_code,designation").eq("organization_id",currentOrg.id).eq("employment_status","active").not("user_id","is",null).order("full_name");
 if(staffError){staffSelect.innerHTML='<option value="">Could not load staff</option>';document.getElementById("assignmentMessage").textContent=staffError.message;}
 else if(!staff?.length){staffSelect.innerHTML='<option value="">No linked staff accounts yet</option>';document.getElementById("assignmentMessage").textContent="Add the employee in Administration & HR, then use Create username & password in the employee list. Give the employee those credentials to sign in to the unified app.";}
 else{staffSelect.innerHTML='<option value="">Choose staff member</option>'+staff.map(x=>'<option value="'+escapeHtml(x.user_id)+'">'+escapeHtml([x.employee_code,x.full_name,x.designation].filter(Boolean).join(" · "))+'</option>').join("");}
 const customerSelect=document.querySelector('#assignmentForm [name="customer_id"]');
 const {data:customers,error:customerError}=await supabase.from("customers").select("id,customer_name,customer_code").eq("organization_id",currentOrg.id).eq("status","active").order("customer_name");
 customerSelect.innerHTML=customerError?'<option value="">Customer list unavailable</option>':'<option value="">No customer linked</option>'+(customers||[]).map(c=>'<option value="'+escapeHtml(c.id)+'">'+escapeHtml([c.customer_code,c.customer_name].filter(Boolean).join(" · "))+'</option>').join("");
 document.getElementById("assignmentForm").addEventListener("submit",async e=>{
  e.preventDefault();const form=e.currentTarget;const button=form.querySelector('button[type="submit"]');const fd=new FormData(form);
  if(!fd.get("assigned_to")){document.getElementById("assignmentMessage").textContent="Please select a linked staff member.";return;}
  button.disabled=true;button.textContent="Assigning…";
  const payload={organization_id:currentOrg.id,title:String(fd.get("title")).trim(),description:String(fd.get("description")||"").trim()||null,priority:String(fd.get("priority")||"normal"),assigned_to:String(fd.get("assigned_to")),created_by:currentUser.id,customer_id:String(fd.get("customer_id")||"")||null,site_address:String(fd.get("site_address")||"").trim()||null,site_contact_name:String(fd.get("site_contact_name")||"").trim()||null,site_contact_phone:String(fd.get("site_contact_phone")||"").trim()||null,site_latitude:fd.get("site_latitude")?Number(fd.get("site_latitude")):null,site_longitude:fd.get("site_longitude")?Number(fd.get("site_longitude")):null,due_at:fd.get("due_at")?new Date(String(fd.get("due_at"))).toISOString():null};
  const {data:createdTask,error}=await supabase.from("tasks").insert(payload).select("id").single();
  if(!error){const items=[...form.querySelectorAll("[data-checklist-input]")].map(x=>x.value.trim()).filter(Boolean);if(!items.length){document.getElementById("assignmentMessage").textContent="Add at least one checklist item.";button.disabled=false;button.textContent="Assign work";return;}const {error:checkError}=await supabase.from("task_checklist_items").insert(items.map((item_text,index)=>({organization_id:currentOrg.id,task_id:createdTask.id,item_text,sort_order:index+1})));if(checkError){document.getElementById("assignmentMessage").textContent="Work assigned, but checklist could not be saved: "+checkError.message;document.getElementById("assignmentMessage").className="form-message error";button.disabled=false;button.textContent="Assign work";await refreshManagerWork(staff||[]);return;}}
  document.getElementById("assignmentMessage").textContent=error?"Assignment failed: "+error.message:"Work assigned successfully with employee checklist.";
  document.getElementById("assignmentMessage").className="form-message "+(error?"error":"success");
  button.disabled=false;button.textContent="Assign work";
  if(!error){form.reset();checklistRows.innerHTML="";addChecklistRow();form.hidden=true;await refreshManagerWork(staff);}
 });
 await refreshManagerWork(staff||[]);
}
async function refreshManagerWork(staff){
 const [taskResult,reportResult,expenseResult,customerResult]=await Promise.all([
  supabase.from("tasks").select("*").eq("organization_id",currentOrg.id).order("created_at",{ascending:false}).limit(100),
  supabase.from("task_reports").select("*").eq("organization_id",currentOrg.id).order("created_at",{ascending:false}).limit(100),
  supabase.from("task_expenses").select("*").eq("organization_id",currentOrg.id).order("created_at",{ascending:false}).limit(200),
  supabase.from("customers").select("id,customer_name,phone,contact_person,shipping_address,billing_address,city,state,pincode").eq("organization_id",currentOrg.id)
 ]);
 const taskBox=document.getElementById("managerTaskList"),reportBox=document.getElementById("managerReportList"),expenseBox=document.getElementById("managerExpenseList");if(!taskBox||!reportBox||!expenseBox)return;
 if(taskResult.error){taskBox.innerHTML='<p class="form-error">'+escapeHtml(taskResult.error.message)+'</p>';return;}
 const staffMap=Object.fromEntries((staff||[]).map(x=>[x.user_id,x.full_name]));
 const checklistResult=await supabase.from("task_checklist_items").select("*").eq("organization_id",currentOrg.id).order("sort_order");const checklistByTask={};(checklistResult.data||[]).forEach(item=>(checklistByTask[item.task_id]??=[]).push(item));
 const tasks=taskResult.data||[],customerMap=Object.fromEntries((customerResult.data||[]).map(c=>[c.id,c]));document.getElementById("taskCount").textContent=tasks.length+" assignments";
 const taskCustomerBlock=(t)=>{const c=customerMap[t.customer_id]||{};const address=t.site_address||c.shipping_address||c.billing_address||[c.city,c.state,c.pincode].filter(Boolean).join(", ");const contact=t.site_contact_name||c.contact_person;const phone=t.site_contact_phone||c.phone;const hasSite=t.customer_id||address||contact||phone||t.site_latitude!=null;return hasSite?`<div class="task-customer-details"><b>Customer / site details</b>${c.customer_name?`<p>${escapeHtml(c.customer_name)}</p>`:""}${address?`<p>Address: ${escapeHtml(address)}</p>`:""}${contact?`<p>Contact: ${escapeHtml(contact)}</p>`:""}${phone?`<p>Phone: <a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></p>`:""}${t.site_latitude!=null&&t.site_longitude!=null?`<p><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${t.site_latitude},${t.site_longitude}">Open site map</a></p>`:address?`<p><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}">Find address on map</a></p>`:""}</div>`:"";};
 const checklistMarkup=(t)=>{const items=checklistByTask[t.id]||[],done=items.filter(x=>x.is_checked).length;return items.length?`<div class="manager-task-checklist"><b>Employee checklist · ${done}/${items.length} completed</b><div class="manager-task-checklist-items">${items.map(x=>`<div class="manager-checklist-item ${x.is_checked?"is-checked":""}"><span>${x.is_checked?"✓":"○"}</span>${escapeHtml(x.item_text)}</div>`).join("")}</div></div>`:"<div class=\"manager-task-checklist\">No checklist items</div>";};
 taskBox.innerHTML=tasks.length?tasks.map(t=>`<article class="task-work-card"><div class="task-work-main"><div><span class="task-priority priority-${escapeHtml(t.priority)}">${escapeHtml(t.priority)}</span><span class="task-state state-${escapeHtml(t.status)}">${escapeHtml(t.status.replaceAll("_"," "))}</span></div><h3>${escapeHtml(t.title)}</h3><p>${escapeHtml(t.description||"No extra instructions")}</p>${taskCustomerBlock(t)}${checklistMarkup(t)}<small>Assigned to: ${escapeHtml(staffMap[t.assigned_to]||"Staff account")} · Due: ${t.due_at?escapeHtml(new Date(t.due_at).toLocaleString()):"No deadline"}</small><div class="task-manager-actions"><button type="button" data-task-status="${t.id}" data-next-status="in_progress" ${t.status==="in_progress"?"disabled":""}>Mark in progress</button><button type="button" data-task-status="${t.id}" data-next-status="completed" ${(t.status==="completed"||(checklistByTask[t.id]||[]).some(x=>!x.is_checked))?"disabled":""} title="${(checklistByTask[t.id]||[]).some(x=>!x.is_checked)?"Complete the employee checklist first":""}">Mark completed</button></div></div></article>`).join(""):'<div class="empty-records">No assignments yet. Create the first assignment above.</div>';
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
 reportBox.innerHTML=reports.length?reports.map(r=>`<article class="task-report-card"><div class="report-card-head"><div><strong>${escapeHtml(taskMap[r.task_id]||"Work assignment")}</strong><small>${escapeHtml(staffMap[r.submitted_by]||"Staff member")} · ${escapeHtml(r.report_date)}</small></div><span class="task-state state-${escapeHtml(r.report_status)}">${escapeHtml(r.report_status.replaceAll("_"," "))}</span></div><p><b>Work completed:</b> ${escapeHtml(r.work_done)}</p>${r.challenges?'<p><b>Challenges:</b> '+escapeHtml(r.challenges)+'</p>':''}${r.next_steps?'<p><b>Next steps:</b> '+escapeHtml(r.next_steps)+'</p>':''}<small>Hours spent: ${r.hours_spent??"—"} · Work status: ${escapeHtml(r.task_status.replaceAll("_"," "))}</small>${(r.photo_paths||[]).length?'<div class="task-report-photos">'+r.photo_paths.map(path=>reportPhotoLinks[path]?'<a href="'+escapeHtml(reportPhotoLinks[path])+'" target="_blank" rel="noopener"><img src="'+escapeHtml(reportPhotoLinks[path])+'" alt="Work site photo"></a>':'').join('')+'</div>':''}${r.geo_status==="captured"&&r.geo_latitude!==null?'<p class="task-report-location">GPS location: '+Number(r.geo_latitude).toFixed(6)+', '+Number(r.geo_longitude).toFixed(6)+' · Accuracy ±'+Math.round(r.geo_accuracy_m||0)+' m · <button type="button" class="task-map-open" data-map-lat="'+Number(r.geo_latitude)+'" data-map-lng="'+Number(r.geo_longitude)+'">Open map</button></p>':''}<label>Manager feedback<textarea id="feedback-${r.id}" rows="2" placeholder="Add feedback or revision instructions">${escapeHtml(r.manager_feedback||"")}</textarea></label><div class="report-actions"><button class="secondary-button" data-review-report="${r.id}" data-status="approved">Approve report</button><button class="secondary-button" data-review-report="${r.id}" data-status="revision_requested">Request changes</button></div></article>`).join(""):'<div class="empty-records">No work reports submitted yet.</div>';
 reportBox.querySelectorAll("[data-map-lat][data-map-lng]").forEach(button=>button.addEventListener("click",()=>{
  const lat=Number(button.dataset.mapLat),lng=Number(button.dataset.mapLng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){showMessage("This report does not contain a valid GPS location.");return;}
  let modal=document.getElementById("taskLocationMapModal");
  if(!modal){modal=document.createElement("div");modal.id="taskLocationMapModal";modal.className="task-map-modal";modal.innerHTML='<div class="task-map-dialog" role="dialog" aria-modal="true" aria-label="Work site location"><div class="task-map-heading"><div><b>Work site location</b><small id="taskMapCoordinates"></small></div><button type="button" id="taskMapClose" aria-label="Close map">×</button></div><iframe id="taskMapFrame" title="Work site map" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe><div class="task-map-footer"><a id="taskMapExternal" target="_blank" rel="noopener">Open in Google Maps</a></div></div>';document.body.append(modal);modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("open");});modal.querySelector("#taskMapClose").addEventListener("click",()=>modal.classList.remove("open"));document.addEventListener("keydown",e=>{if(e.key==="Escape")modal.classList.remove("open");});}
  const coords=lat.toFixed(6)+", "+lng.toFixed(6),query=encodeURIComponent(lat+","+lng);
  modal.querySelector("#taskMapCoordinates").textContent=coords;
  modal.querySelector("#taskMapFrame").src="https://maps.google.com/maps?q="+query+"&z=17&output=embed";
  modal.querySelector("#taskMapExternal").href="https://www.google.com/maps/search/?api=1&query="+query;
  modal.classList.add("open");
 }));
 if(expenseResult.error){expenseBox.innerHTML='<p class="form-error">'+escapeHtml(expenseResult.error.message)+'</p>';return;}
 const expenses=expenseResult.data||[],expenseReceipts={};
 await Promise.all(expenses.flatMap(e=>(e.receipt_paths||[]).map(async path=>{const {data}=await supabase.storage.from("task-expenses").createSignedUrl(path,3600);if(data?.signedUrl)expenseReceipts[path]=data.signedUrl;})));
 expenseBox.innerHTML=expenses.length?expenses.map(e=>`<article class="task-report-card"><div class="report-card-head"><div><strong>${escapeHtml(taskMap[e.task_id]||"Work assignment")}</strong><small>${escapeHtml(staffMap[e.submitted_by]||"Staff member")} · ${escapeHtml(e.expense_date)}</small></div><span class="task-state state-${escapeHtml(e.status)}">${escapeHtml(e.status.replaceAll("_"," "))}</span></div><p><b>${escapeHtml(({travel:"Travel charges",material:"Sourced material",other:"Other task expense"})[e.expense_type]||e.expense_type)}:</b> ${escapeHtml(e.description)}</p><p><b>Claimed amount:</b> ₹${Number(e.amount).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}</p><small>Vendor: ${escapeHtml(e.vendor_name||"—")} · Quantity: ${escapeHtml(e.quantity??"—")} ${escapeHtml(e.unit||"")}</small>${(e.receipt_paths||[]).length?'<div class="task-report-photos">'+e.receipt_paths.map((p,i)=>expenseReceipts[p]?'<a href="'+escapeHtml(expenseReceipts[p])+'" target="_blank" rel="noopener">Receipt '+(i+1)+'</a>':'').join('')+'</div>':''}<label>Manager feedback<textarea id="expense-feedback-${e.id}" rows="2" placeholder="Add approval notes or correction instructions">${escapeHtml(e.manager_feedback||"")}</textarea></label><div class="report-actions"><button class="secondary-button" data-review-expense="${e.id}" data-status="approved">Approve claim</button><button class="secondary-button" data-review-expense="${e.id}" data-status="revision_requested">Request changes</button><button class="secondary-button" data-review-expense="${e.id}" data-status="rejected">Reject</button></div></article>`).join(""):'<div class="empty-records">No employee expense claims submitted yet.</div>';
 expenseBox.querySelectorAll("[data-review-expense]").forEach(button=>button.addEventListener("click",async()=>{
  const id=button.dataset.reviewExpense,status=button.dataset.status,feedback=document.getElementById("expense-feedback-"+id).value.trim();
  button.disabled=true;const {error}=await supabase.from("task_expenses").update({status,manager_feedback:feedback||null,reviewed_by:currentUser.id,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id).eq("organization_id",currentOrg.id);
  if(error){showMessage("Could not update expense claim: "+error.message);button.disabled=false;return;}
  await refreshManagerWork(staff);
 }));
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

async function openSalesWorkspace(initialTab="customers"){
 title.textContent="Customers & Sales";
 const member=await supabase.from("organization_members").select("role").eq("organization_id",currentOrg.id).eq("user_id",currentUser.id).eq("status","active").maybeSingle();
 const canManage=member.data&&["owner","admin","manager"].includes(member.data.role);
 if(!canManage){content.innerHTML='<div class="empty-page"><h2>Sales workspace restricted</h2><p>Customer, quotation and invoice records are available to managers and administrators.</p></div>';return;}
 content.innerHTML='<div class="data-page sales-page"><div class="data-page-head"><div><span class="tag">CUSTOMER RELATIONSHIP & BILLING</span><h2>Customer & Sales Centre</h2><p>Onboard customers, prepare professional quotations and manage invoices.</p></div><div class="sales-head-mark">₹</div></div><div class="sales-summary" id="salesSummary"><article><small>Customers</small><strong id="salesCustomerCount">—</strong></article><article><small>Open quotations</small><strong id="salesQuotationCount">—</strong></article><article><small>Outstanding invoices</small><strong id="salesOutstanding">—</strong></article></div><div class="sales-tabs"><button type="button" data-sales-tab="customers">Customers</button><button type="button" data-sales-tab="quotations">Quotations</button><button type="button" data-sales-tab="invoices">Invoices</button><button type="button" data-sales-tab="other">Other documents</button></div><div id="salesTabContent"></div></div>';
 const tabContent=document.getElementById("salesTabContent");
 async function refreshSummary(){
  const [cu,qu,iv]=await Promise.all([
   supabase.from("customers").select("id",{count:"exact",head:true}).eq("organization_id",currentOrg.id),
   supabase.from("quotations").select("id",{count:"exact",head:true}).eq("organization_id",currentOrg.id).in("status",["draft","sent"]),
   supabase.from("invoices").select("grand_total,amount_paid").eq("organization_id",currentOrg.id).not("payment_status","in","(paid,cancelled)")
  ]);
  document.getElementById("salesCustomerCount").textContent=cu.count??"—";
  document.getElementById("salesQuotationCount").textContent=qu.count??"—";
  document.getElementById("salesOutstanding").textContent="₹"+(iv.data||[]).reduce((s,x)=>s+Number(x.grand_total||0)-Number(x.amount_paid||0),0).toLocaleString("en-IN",{maximumFractionDigits:2});
 }
 const money=n=>"₹"+Number(n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
 const nextNo=(prefix,rows,key)=>prefix+"-"+new Date().getFullYear()+"-"+String((rows||[]).length+1).padStart(4,"0");
 async function renderCustomers(){
  const {data,error}=await supabase.from("customers").select("*").eq("organization_id",currentOrg.id).order("created_at",{ascending:false}).limit(500);
  if(error){tabContent.innerHTML='<p class="form-error">'+escapeHtml(error.message)+'</p>';return;}
  tabContent.innerHTML='<div class="sales-toolbar"><div><h3>Customer directory</h3><p>Keep customer contact, tax and billing details in one place.</p></div><button class="primary-button" id="addCustomer">＋ Onboard customer</button></div><div id="customerFormWrap"></div><div class="records-table">'+(data.length?'<div class="table-scroll"><table><thead><tr><th>Customer</th><th>Contact</th><th>GSTIN</th><th>Location</th><th>Type</th><th>Status</th><th>Portal access</th></tr></thead><tbody>'+data.map(x=>'<tr><td><b>'+escapeHtml(x.customer_name)+'</b><small class="table-subline">'+escapeHtml(x.customer_code)+'</small></td><td>'+escapeHtml(x.phone||"—")+'<small class="table-subline">'+escapeHtml(x.email||"")+'</small></td><td>'+escapeHtml(x.gstin||"—")+'</td><td>'+escapeHtml([x.city,x.state].filter(Boolean).join(", ")||"—")+'</td><td>'+escapeHtml(x.customer_type)+'</td><td><span class="task-state state-'+(x.status==="active"?"completed":"pending")+'">'+escapeHtml(x.status)+'</span></td><td>'+(x.status==="active"&&x.email?'<button type="button" class="secondary-button" data-customer-login="'+x.id+'">'+(x.user_id?"Reset portal password":"Create portal login")+'</button>':"—")+'</td></tr>').join("")+'</tbody></table></div>':'<div class="empty-records">No customers onboarded yet. Select “Onboard customer” to add the first customer.</div>')+'</div>';
  tabContent.querySelectorAll("[data-customer-login]").forEach(button=>button.addEventListener("click",async()=>{
   const customer=data.find(item=>item.id===button.dataset.customerLogin);if(!customer)return;
   const password=prompt("Set a temporary customer portal password (10–72 characters) for "+customer.customer_name+":");if(password===null)return;
   if(password.length<10||password.length>72){showMessage("Password must be between 10 and 72 characters.");return;}
   if(!confirm("Create customer portal access for "+customer.email+"? Share the temporary password securely."))return;
   button.disabled=true;button.textContent="Creating access…";
   const {data:result,error}=await supabase.functions.invoke("admin-create-customer",{body:{organization_id:currentOrg.id,customer_id:customer.id,password}});
   if(error||result?.error){showMessage("Customer access could not be created: "+(result?.error||error?.message||"Unknown error"));button.disabled=false;button.textContent=customer.user_id?"Reset portal password":"Create portal login";return;}
   showMessage("Customer portal access created for "+result.email+". Share the temporary password securely.");
   await renderCustomers();
  }));
  document.getElementById("addCustomer").addEventListener("click",()=>{
   const wrap=document.getElementById("customerFormWrap");
   wrap.innerHTML='<form id="customerForm" class="record-form"><h3>New customer onboarding</h3><div class="form-grid"><label>Customer / business name *<input name="customer_name" required maxlength="180"></label><label>Customer type<select name="customer_type"><option value="individual">Individual</option><option value="business">Business</option><option value="government">Government</option><option value="other">Other</option></select></label><label>Contact person<input name="contact_person"></label><label>Mobile number<input name="phone" type="tel"></label><label>Alternate phone<input name="alternate_phone" type="tel"></label><label>Email<input name="email" type="email"></label><label>GSTIN<input name="gstin" maxlength="15" placeholder="15-character GSTIN"></label><label>City<input name="city"></label><label>State<input name="state" value="Maharashtra"></label><label>PIN code<input name="pincode" inputmode="numeric" maxlength="6"></label><label class="wide-field">Billing address<textarea name="billing_address" rows="2"></textarea></label><label class="wide-field">Shipping address<textarea name="shipping_address" rows="2"></textarea></label><label>Status<select name="status"><option value="active">Active</option><option value="prospect">Prospect</option><option value="inactive">Inactive</option></select></label><label class="wide-field">Notes<textarea name="notes" rows="2"></textarea></label></div><div class="record-form-actions"><button class="primary-button" type="submit">Save customer</button><button class="secondary-button" type="button" id="cancelCustomer">Cancel</button></div><p class="form-message" id="customerFormMessage"></p></form>';
   document.getElementById("cancelCustomer").addEventListener("click",()=>wrap.innerHTML="");
   document.getElementById("customerForm").addEventListener("submit",async e=>{
    e.preventDefault();const f=e.currentTarget,fd=new FormData(f),btn=f.querySelector('[type=submit]');btn.disabled=true;btn.textContent="Saving…";
    const code=nextNo("CUS",data,"customer_code");
    const payload={organization_id:currentOrg.id,customer_code:code,created_by:currentUser.id};
    for(const [k,v] of fd.entries())payload[k]=String(v).trim()||null;
    if(payload.gstin){payload.gstin=payload.gstin.toUpperCase();if(!/^[0-9A-Z]{15}$/.test(payload.gstin)){document.getElementById("customerFormMessage").textContent="Please enter a valid 15-character GSTIN.";btn.disabled=false;btn.textContent="Save customer";return;}}
    const {error:saveError}=await supabase.from("customers").insert(payload);
    if(saveError){document.getElementById("customerFormMessage").textContent="Could not save customer: "+saveError.message;btn.disabled=false;btn.textContent="Save customer";return;}
    await renderCustomers();await refreshSummary();
   });
  });
 }
 async function renderDocuments(kind){
  const isQuote=kind==="quotations",table=isQuote?"quotations":"invoices",label=isQuote?"Quotation":"Invoice";
  const [{data:rows,error},{data:customers},{data:documentSettings}] = await Promise.all([
   supabase.from(table).select("*,customers(customer_name,phone,email,gstin,billing_address,city,state,pincode)").eq("organization_id",currentOrg.id).order("created_at",{ascending:false}).limit(500),
   supabase.from("customers").select("id,customer_name,gstin,phone,email,billing_address,city,state,pincode").eq("organization_id",currentOrg.id).eq("status","active").order("customer_name"),
   supabase.from("company_document_settings").select("settings").eq("organization_id",currentOrg.id).maybeSingle()
  ]);
  const companyDocumentTerms=documentSettings?.settings?.terms||{};
  if(error){tabContent.innerHTML='<p class="form-error">'+escapeHtml(error.message)+'</p>';return;}
  tabContent.innerHTML='<div class="sales-toolbar"><div><h3>'+label+' register</h3><p>'+(isQuote?"Prepare estimates and track customer decisions.":"Track billing, due dates and collections.")+'</p></div><button class="primary-button" id="addSalesDoc">＋ Create '+label.toLowerCase()+'</button></div><div id="salesDocFormWrap"></div><div class="records-table">'+(rows.length?'<div class="table-scroll"><table><thead><tr><th>Number</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+rows.map(x=>'<tr><td><b>'+escapeHtml(isQuote?x.quotation_number:x.invoice_number)+'</b><small class="table-subline">'+escapeHtml(x.subject||"")+'</small></td><td>'+escapeHtml(x.customers?.customer_name||"—")+'</td><td>'+escapeHtml(isQuote?x.quotation_date:x.invoice_date)+'</td><td>'+money(x.grand_total)+'</td><td><span class="task-state state-'+(isQuote?(x.status==="accepted"||x.status==="converted"?"completed":"pending"):(x.payment_status==="paid"?"completed":"pending"))+'">'+escapeHtml(isQuote?x.status:x.payment_status.replaceAll("_"," "))+'</span></td><td><button type="button" class="secondary-button" data-print-doc="'+x.id+'">View / Print</button>'+(isQuote?'<button type="button" class="secondary-button" data-quote-status="'+x.id+'" data-status="sent">Mark sent</button><button type="button" class="secondary-button" data-quote-status="'+x.id+'" data-status="accepted">Accept</button><button type="button" class="secondary-button" data-convert-quote="'+x.id+'">Create invoice</button>':'<button type="button" class="secondary-button" data-invoice-paid="'+x.id+'">Record payment</button>')+'</td></tr>').join("")+'</tbody></table></div>':'<div class="empty-records">No '+label.toLowerCase()+'s yet. Select “Create '+label.toLowerCase()+'” to begin.</div>')+'</div>';
  const wrap=document.getElementById("salesDocFormWrap");
  document.getElementById("addSalesDoc").addEventListener("click",()=>showDocForm(null,null));
  function showDocForm(sourceQuote=null,existing=null){
   if(!customers?.length){wrap.innerHTML='<div class="notice"><b>No active customers</b><p>Onboard a customer first in the Customers tab.</p><button type="button" class="secondary-button" id="goCustomers">Open customer onboarding</button></div>';document.getElementById("goCustomers").addEventListener("click",()=>renderCustomers());return;}
   const chosen=sourceQuote?.customer_id||existing?.customer_id||"";
   const itemSeed=sourceQuote?.line_items||existing?.line_items||[{description:"",quantity:1,rate:0,tax_rate:18}];
   const initialTerms=existing?.terms??sourceQuote?.terms??companyDocumentTerms[isQuote?"quotation":"invoice"]??defaultDocumentTerms[isQuote?"quotation":"invoice"]??"";
   const lines=itemSeed.map((x,i)=>'<div class="sales-line-row"><input aria-label="Item description" class="line-desc" placeholder="Product / service description" value="'+escapeHtml(x.description||"")+'" required><input aria-label="Quantity" class="line-qty" type="number" placeholder="Qty" min="0.01" step="0.01" value="'+Number(x.quantity||1)+'"><input aria-label="Rate" class="line-rate" type="number" placeholder="Rate (₹)" min="0" step="0.01" value="'+Number(x.rate||0)+'"><select aria-label="GST rate" class="line-tax"><option value="0" '+(Number(x.tax_rate)===0?"selected":"")+'>0%</option><option value="5" '+(Number(x.tax_rate)===5?"selected":"")+'>5%</option><option value="12" '+(Number(x.tax_rate)===12?"selected":"")+'>12%</option><option value="18" '+(Number(x.tax_rate??18)===18?"selected":"")+'>18%</option><option value="28" '+(Number(x.tax_rate)===28?"selected":"")+'>28%</option></select><button type="button" class="remove-line" aria-label="Remove item">×</button></div>').join("");
   wrap.innerHTML='<form id="salesDocForm" class="record-form sales-doc-form"><h3>'+(existing?"Edit ":"Create ")+label+'</h3><div class="form-grid"><label>Customer *<select name="customer_id" required><option value="">Select customer</option>'+customers.map(x=>'<option value="'+x.id+'" '+(chosen===x.id?"selected":"")+'>'+escapeHtml(x.customer_name)+'</option>').join("")+'</select></label><label>'+(isQuote?"Quotation":"Invoice")+' date<input type="date" name="'+(isQuote?"quotation_date":"invoice_date")+'" value="'+(existing?(isQuote?existing.quotation_date:existing.invoice_date):new Date().toISOString().slice(0,10))+'" required></label><label>'+(isQuote?"Valid until":"Due date")+'<input type="date" name="'+(isQuote?"valid_until":"due_date")+'" value="'+(existing?(isQuote?existing.valid_until:existing.due_date)||"": "")+'"></label><label>Subject / reference<input name="subject" value="'+escapeHtml(existing?.subject||"")+'" placeholder="Supply / service details"></label>'+(isQuote?"":'<label>Place of supply<input name="place_of_supply" value="'+escapeHtml(existing?.place_of_supply||"")+'"></label>')+'</div><div class="sales-lines-head"><h4>Items & services</h4><div><span>Description</span><span>Qty</span><span>Rate (₹)</span><span>GST</span><span></span></div></div><div id="salesLineItems">'+lines+'</div><button type="button" class="secondary-button" id="addSalesLine">＋ Add item</button><div class="sales-calculation"><label>Overall discount (₹)<input type="number" min="0" step="0.01" name="discount_amount" value="'+Number(existing?.discount_amount||0)+'"></label><div><span>Subtotal <b id="salesSubtotal">₹0.00</b></span><span>GST <b id="salesTax">₹0.00</b></span><span>Discount <b id="salesDiscount">₹0.00</b></span><strong>Grand total <b id="salesGrandTotal">₹0.00</b></strong></div></div><label class="wide-field">Terms & conditions<textarea name="terms" rows="2">'+escapeHtml(initialTerms)+'</textarea></label><label class="wide-field">Notes<textarea name="notes" rows="2">'+escapeHtml(existing?.notes||"")+'</textarea></label><div class="record-form-actions"><button type="submit" class="primary-button">Save '+label.toLowerCase()+'</button><button type="button" class="secondary-button" id="cancelSalesDoc">Cancel</button></div><p class="form-message" id="salesDocMessage"></p></form>';
   const form=document.getElementById("salesDocForm"),lineBox=document.getElementById("salesLineItems");
   function recalc(){
    const items=[...lineBox.querySelectorAll(".sales-line-row")].map(row=>{const q=Number(row.querySelector(".line-qty").value)||0,r=Number(row.querySelector(".line-rate").value)||0,t=Number(row.querySelector(".line-tax").value)||0;return {description:row.querySelector(".line-desc").value.trim(),quantity:q,rate:r,tax_rate:t,rawBase:q*r};});
    const sub=items.reduce((s,x)=>s+x.rawBase,0),discount=Math.min(sub,Math.max(0,Number(form.elements.discount_amount.value)||0)),factor=sub>0?(sub-discount)/sub:1;
    items.forEach(x=>{x.base=Number((x.rawBase*factor).toFixed(2));x.tax=Number((x.base*x.tax_rate/100).toFixed(2));delete x.rawBase;});
    const tax=items.reduce((s,x)=>s+x.tax,0),total=sub-discount+tax;
    document.getElementById("salesSubtotal").textContent=money(sub);document.getElementById("salesTax").textContent=money(tax);document.getElementById("salesDiscount").textContent=money(discount);document.getElementById("salesGrandTotal").textContent=money(total);
    return {items,sub,tax,discount,total};
   }
   function bindRows(){lineBox.querySelectorAll("input,select").forEach(el=>el.addEventListener("input",recalc));lineBox.querySelectorAll(".remove-line").forEach(btn=>btn.addEventListener("click",()=>{btn.closest(".sales-line-row").remove();if(!lineBox.children.length)addLine();recalc();}));}
   function addLine(){const row=document.createElement("div");row.className="sales-line-row";row.innerHTML='<input aria-label="Item description" class="line-desc" placeholder="Product / service description" required><input aria-label="Quantity" class="line-qty" type="number" min="0.01" step="0.01" value="1"><input aria-label="Rate" class="line-rate" type="number" min="0" step="0.01" value="0"><select aria-label="GST rate" class="line-tax"><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18" selected>18%</option><option value="28">28%</option></select><button type="button" class="remove-line" aria-label="Remove item">×</button>';lineBox.append(row);bindRows();}
   bindRows();form.elements.discount_amount.addEventListener("input",recalc);document.getElementById("addSalesLine").addEventListener("click",addLine);document.getElementById("cancelSalesDoc").addEventListener("click",()=>wrap.innerHTML="");recalc();
   form.addEventListener("submit",async e=>{
    e.preventDefault();const btn=form.querySelector('[type=submit]'),totals=recalc(),fd=new FormData(form);if(!totals.items.length||totals.items.some(x=>!x.description||x.quantity<=0)){document.getElementById("salesDocMessage").textContent="Add at least one item with a description and valid quantity.";return;}
    btn.disabled=true;btn.textContent="Saving…";
    const selectedCustomer=customers.find(x=>x.id===fd.get("customer_id"));
    const payload={organization_id:currentOrg.id,customer_id:fd.get("customer_id"),line_items:totals.items,subtotal:Number(totals.sub.toFixed(2)),discount_amount:Number(totals.discount.toFixed(2)),tax_amount:Number(totals.tax.toFixed(2)),grand_total:Number(totals.total.toFixed(2)),terms:String(fd.get("terms")||"").trim()||null,notes:String(fd.get("notes")||"").trim()||null,created_by:currentUser.id};
    payload[isQuote?"quotation_date":"invoice_date"]=fd.get(isQuote?"quotation_date":"invoice_date");
    payload[isQuote?"valid_until":"due_date"]=fd.get(isQuote?"valid_until":"due_date")||null;
    if(isQuote){payload.quotation_number=nextNo("QTN",rows,"quotation_number");payload.subject=String(fd.get("subject")||"").trim()||null;payload.status="draft";}
    else{payload.invoice_number=nextNo("INV",rows,"invoice_number");payload.quotation_id=sourceQuote?.id||null;payload.place_of_supply=String(fd.get("place_of_supply")||"").trim()||null;payload.amount_paid=0;payload.payment_status="unpaid";}
    const {error:saveError}=await supabase.from(table).insert(payload);
    if(saveError){document.getElementById("salesDocMessage").textContent="Could not save "+label.toLowerCase()+": "+saveError.message;btn.disabled=false;btn.textContent="Save "+label.toLowerCase();return;}
    if(!isQuote&&sourceQuote?.id)await supabase.from("quotations").update({status:"converted"}).eq("id",sourceQuote.id).eq("organization_id",currentOrg.id);
    await renderDocuments(kind);await refreshSummary();
   });
  }
  tabContent.querySelectorAll("[data-quote-status]").forEach(btn=>btn.addEventListener("click",async()=>{btn.disabled=true;const {error:upErr}=await supabase.from("quotations").update({status:btn.dataset.status}).eq("id",btn.dataset.quoteStatus).eq("organization_id",currentOrg.id);if(upErr)showMessage("Quotation update failed: "+upErr.message);await renderDocuments(kind);await refreshSummary();}));
  tabContent.querySelectorAll("[data-convert-quote]").forEach(btn=>btn.addEventListener("click",()=>{const q=rows.find(x=>x.id===btn.dataset.convertQuote);if(q)showDocForm(q);}));
  tabContent.querySelectorAll("[data-invoice-paid]").forEach(btn=>btn.addEventListener("click",async()=>{const inv=rows.find(x=>x.id===btn.dataset.invoicePaid);if(!inv)return;const amount=prompt("Enter payment received (₹). Outstanding: "+money(Number(inv.grand_total)-Number(inv.amount_paid)));if(amount===null)return;const value=Number(amount);if(!Number.isFinite(value)||value<=0||value>Number(inv.grand_total)-Number(inv.amount_paid)){showMessage("Enter a valid payment not greater than the outstanding amount.");return;}const paid=Number(inv.amount_paid)+value;const status=paid>=Number(inv.grand_total)?"paid":"partially_paid";const {error:payError}=await supabase.from("invoices").update({amount_paid:paid,payment_status:status}).eq("id",inv.id).eq("organization_id",currentOrg.id);if(payError)showMessage("Payment could not be recorded: "+payError.message);await renderDocuments(kind);await refreshSummary();}));
  tabContent.querySelectorAll("[data-print-doc]").forEach(btn=>btn.addEventListener("click",async()=>{
   const doc=rows.find(x=>x.id===btn.dataset.printDoc);if(!doc)return;
   const customer=doc.customers||{},docNo=isQuote?doc.quotation_number:doc.invoice_number,docDate=isQuote?doc.quotation_date:doc.invoice_date;
   const itemRows=(doc.line_items||[]).map(x=>'<tr><td>'+escapeHtml(x.description)+'</td><td>'+Number(x.quantity||0)+'</td><td>'+money(x.rate)+'</td><td>'+Number(x.tax_rate||0)+'%</td><td>'+money(x.base)+'</td><td>'+money(x.tax)+'</td></tr>').join("");
   const [{data:companyInfo},{data:templateRow}]=await Promise.all([
    supabase.from("organizations").select("name,billing_email,phone,address,website,gst_number").eq("id",currentOrg.id).maybeSingle(),
    supabase.from("company_document_settings").select("settings").eq("organization_id",currentOrg.id).maybeSingle()
   ]);
   const saved=templateRow?.settings||{},theme=saved.theme||{},docKey=isQuote?"quotation":"invoice",templateId=(saved.documents||{})[docKey]||"classic";
   const palettes={classic:["#e98a2b","#17243a"],corporate:["#173b63","#ffffff"],modern:["#087f8c","#ffffff"],elegant:["#343434","#c6a56b"],creative:["#6b4eff","#ffffff"]};
   const colors=theme.applyAcross===false?palettes[templateId]:[theme.primary||palettes[templateId][0],theme.secondary||palettes[templateId][1]];
   const primary=colors[0],secondary=colors[1],logo=theme.logoUrl||"";
   const companyName=companyInfo?.name||currentOrg.name||"Company",companyAddress=companyInfo?.address||"",companyPhone=companyInfo?.phone||"",companyEmail=companyInfo?.billing_email||"",companyGst=companyInfo?.gst_number||"",companyWebsite=companyInfo?.website||"";
   const templateClass="tpl-"+templateId;
   const esc=escapeHtml;
   const printHtml='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(docNo)+'</title><style>'+
    '@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}html,body{margin:0;padding:0;color:#202938;font-family:Arial,Helvetica,sans-serif;font-size:10pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{width:100%;max-width:186mm;margin:0 auto}.sheet{width:100%;min-height:270mm;position:relative}.brandbar{height:5px;background:'+primary+';margin-bottom:18px}.head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding-bottom:15px;border-bottom:2px solid '+primary+'}.brand{display:flex;align-items:center;gap:12px;min-width:0}.logo{max-width:72px;max-height:58px;object-fit:contain}.brand h1{font-size:22pt;line-height:1.15;margin:0 0 5px;color:'+primary+';overflow-wrap:anywhere}.company-meta{font-size:8.5pt;line-height:1.45;color:#596273;overflow-wrap:anywhere}.doc-title{text-align:right;min-width:33%;}.doc-title h2{font-size:19pt;line-height:1.1;margin:0 0 9px;color:'+primary+';letter-spacing:.4px}.doc-title strong{font-size:11pt;overflow-wrap:anywhere}.details{display:grid;grid-template-columns:1.15fr .85fr;gap:14px;margin:22px 0}.party{background:#f2f4f7;border-radius:7px;padding:12px;line-height:1.5;overflow-wrap:anywhere}.party b,.meta b{color:#253247}.meta{line-height:1.8;padding:7px 0}.subject{font-size:13pt;margin:18px 0 10px;color:#202938;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.5pt;margin-top:14px}th,td{padding:8px 6px;border-bottom:1px solid #d9dee6;text-align:left;vertical-align:top;overflow-wrap:anywhere;word-break:break-word}th{background:'+primary+';color:'+(templateId==="elegant"?"#fff":"#fff")+';font-weight:700}th:nth-child(1){width:34%}th:nth-child(2){width:8%}th:nth-child(3){width:15%}th:nth-child(4){width:9%}th:nth-child(5){width:17%}th:nth-child(6){width:17%}.totals{width:70mm;max-width:100%;margin:18px 0 0 auto}.totals div{display:flex;justify-content:space-between;gap:12px;padding:5px 2px;border-bottom:1px solid #e5e8ed}.totals b{text-align:right;white-space:nowrap}.grand{font-weight:700;font-size:12pt;color:'+primary+';border-top:2px solid '+primary+';margin-top:5px;padding-top:9px}.terms{margin-top:22px;font-size:9pt;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}.sign{margin-top:35px;display:flex;justify-content:flex-end;text-align:center;min-height:55px}.sign>div{min-width:58mm;border-top:1px solid #9aa3af;padding-top:7px}.foot{position:absolute;bottom:0;left:0;right:0;border-top:1px solid #d9dee6;padding-top:7px;color:#697386;font-size:8pt;display:flex;justify-content:space-between;gap:10px}.tpl-corporate .head{border-bottom-width:5px}.tpl-modern .brandbar{height:9px;border-radius:6px}.tpl-modern .party{border-left:4px solid '+primary+';border-radius:3px}.tpl-elegant .head{border-bottom:1px solid '+primary+'}.tpl-elegant .doc-title h2{letter-spacing:2px;font-weight:500}.tpl-creative .head{background:#f5f3ff;padding:14px;border-radius:8px;border-bottom:0}.tpl-creative .party{background:#f5f3ff}.tpl-classic .party{border:1px solid #e4e8ef}@media screen{body{padding:12px;background:#e9edf2}.sheet{background:white;padding:12mm;box-shadow:0 2px 18px #0002;min-height:270mm}}@media print{.sheet{min-height:270mm}.no-print{display:none!important}tr{break-inside:avoid}thead{display:table-header-group}}'+
    '</style></head><body><main class="sheet '+templateClass+'"><div class="brandbar"></div><header class="head"><div class="brand">'+(logo?'<img class="logo" src="'+esc(logo)+'" alt="Company logo">':"")+'<div><h1>'+esc(companyName)+'</h1><div class="company-meta">'+[companyAddress,companyPhone?"Phone: "+companyPhone:"",companyEmail,companyGst?"GSTIN: "+companyGst:"",companyWebsite].filter(Boolean).map(esc).join("<br>")+'</div></div></div><div class="doc-title"><h2>'+label.toUpperCase()+'</h2><strong>'+esc(docNo)+'</strong></div></header><section class="details"><div class="party"><b>Bill to</b><br>'+esc(customer.customer_name||"")+'<br>'+esc(customer.billing_address||"")+'<br>'+esc([customer.city,customer.state,customer.pincode].filter(Boolean).join(", "))+'<br>'+esc(customer.phone||"")+(customer.gstin?'<br>GSTIN: '+esc(customer.gstin):"")+'</div><div class="meta"><b>Date:</b> '+esc(docDate||"—")+'<br><b>'+(isQuote?"Valid until":"Due date")+':</b> '+esc(isQuote?doc.valid_until||"—":doc.due_date||"—")+'</div></section><h3 class="subject">'+esc(doc.subject||"")+'</h3><table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>GST</th><th>Amount</th><th>Tax</th></tr></thead><tbody>'+itemRows+'</tbody></table><div class="totals"><div><span>Subtotal</span><b>'+money(doc.subtotal)+'</b></div><div><span>GST</span><b>'+money(doc.tax_amount)+'</b></div><div><span>Discount</span><b>'+money(doc.discount_amount)+'</b></div><div class="grand"><span>Grand total</span><b>'+money(doc.grand_total)+'</b></div>'+(isQuote?"":'<div><span>Paid</span><b>'+money(doc.amount_paid)+'</b></div><div><span>Balance</span><b>'+money(Number(doc.grand_total)-Number(doc.amount_paid))+'</b></div>')+'</div><div class="terms"><b>Terms & conditions</b><br>'+esc(doc.terms||saved.terms?.[docKey]||defaultDocumentTerms[docKey]||"")+'<br><br>'+esc(doc.notes||"")+'</div><div class="sign"><div>For '+esc(companyName)+'<br><br>Authorised Signatory</div></div><footer class="foot"><span>'+esc(companyName)+'</span><span>'+esc(companyPhone)+' '+esc(companyEmail)+'</span></footer></main><script>window.onload=()=>window.print()<\/script></body></html>';
   if(window.BizFoxAndroid?.printHtml){window.BizFoxAndroid.printHtml(printHtml,docNo);}
   else{const w=window.open("","_blank");if(!w){showMessage("Allow pop-ups to print this document.");return;}w.document.open();w.document.write(printHtml);w.document.close();}
  }));
 }
 const extraDocumentTypes=[
  {key:"receipt",label:"Payment receipt",prefix:"RCT",fields:[["amount","Amount received (₹)","number"],["payment_method","Payment method","text"],["reference","Transaction / cheque reference","text"],["received_from","Received from","text"],["purpose","Payment for","textarea"]]},
  {key:"work_order",label:"Work order",prefix:"WO",fields:[["work_scope","Scope of work","textarea"],["site_address","Work site address","textarea"],["start_date","Planned start date","date"],["completion_date","Target completion date","date"],["assigned_team","Assigned team / technician","text"],["special_instructions","Special instructions","textarea"]]},
  {key:"delivery_challan",label:"Delivery challan",prefix:"DC",fields:[["delivery_address","Delivery address","textarea"],["vehicle_number","Vehicle number","text"],["transported_by","Transported by","text"],["delivery_note","Delivery note","textarea"]],items:true},
  {key:"service_report",label:"Service completion report",prefix:"SR",fields:[["service_location","Service location","textarea"],["complaint","Customer complaint","textarea"],["work_performed","Work performed","textarea"],["parts_used","Parts / materials used","textarea"],["technician","Technician name","text"],["customer_feedback","Customer feedback","textarea"],["next_visit","Next visit date","date"]]},
  {key:"installation_report",label:"Installation report",prefix:"IR",fields:[["installation_site","Installation site","textarea"],["equipment_installed","Equipment installed","textarea"],["serial_numbers","Serial numbers","textarea"],["configuration","Configuration / testing","textarea"],["installed_by","Installed by","text"],["handover_notes","Handover notes","textarea"]]},
  {key:"amc_agreement",label:"AMC agreement",prefix:"AMC",fields:[["covered_equipment","Covered equipment / systems","textarea"],["coverage_start","Coverage start date","date"],["coverage_end","Coverage end date","date"],["visit_frequency","Preventive visit frequency","text"],["response_time","Response time commitment","text"],["exclusions","Exclusions","textarea"],["annual_fee","Annual AMC fee (₹)","number"],["agreement_terms","Agreement terms","textarea"]]},
  {key:"purchase_order",label:"Purchase order",prefix:"PO",fields:[["vendor_name","Supplier / vendor","text"],["vendor_address","Supplier address","textarea"],["delivery_date","Expected delivery date","date"],["delivery_location","Delivery location","textarea"],["payment_terms","Payment terms","textarea"],["notes","Notes","textarea"]],items:true},
  {key:"expense_voucher",label:"Expense voucher",prefix:"EV",fields:[["payee","Paid to","text"],["expense_category","Expense category","text"],["payment_method","Payment method","text"],["reference","Bill / transaction reference","text"],["amount","Amount (₹)","number"],["narration","Expense narration","textarea"]]}
 ];
 async function renderAdditionalDocuments(){
  const [loaded,customerResult,companyResult,templateResult]=await Promise.all([
   supabase.from("business_documents").select("*").eq("organization_id",currentOrg.id).order("document_date",{ascending:false}).limit(500),
   supabase.from("customers").select("id,customer_name,phone,email,billing_address,city,state,pincode,gstin").eq("organization_id",currentOrg.id).eq("status","active").order("customer_name"),
   supabase.from("organizations").select("name,billing_email,phone,address,website,gst_number").eq("id",currentOrg.id).maybeSingle(),
   supabase.from("company_document_settings").select("settings").eq("organization_id",currentOrg.id).maybeSingle()
  ]);
  if(loaded.error){tabContent.innerHTML='<p class="form-error">'+escapeHtml(loaded.error.message)+'</p>';return;}
  const rows=loaded.data||[],customers=customerResult.data||[],companyInfo=companyResult.data||{},settings=templateResult.data?.settings||{},theme=settings.theme||{};
  let selectedType=extraDocumentTypes[0].key;
  tabContent.innerHTML='<div class="sales-toolbar"><div><h3>Operational documents</h3><p>Create, maintain and print the remaining company documents.</p></div><label>Document type <select id="extraDocType">'+extraDocumentTypes.map(t=>'<option value="'+t.key+'">'+t.label+'</option>').join("")+'</select></label><button class="primary-button" id="createExtraDoc">＋ Create document</button></div><div id="extraDocFormWrap"></div><div id="extraDocRows"></div>';
  const wrap=document.getElementById("extraDocFormWrap"),list=document.getElementById("extraDocRows"),typeSelect=document.getElementById("extraDocType");
  const esc=escapeHtml;
  const renderRows=()=>{
   const filtered=rows.filter(x=>x.document_type===selectedType);
   list.innerHTML=filtered.length?'<div class="records-table"><div class="table-scroll"><table><thead><tr><th>Document number</th><th>Date</th><th>Title / subject</th><th>Customer</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+filtered.map(x=>'<tr><td><b>'+esc(x.document_number)+'</b></td><td>'+esc(x.document_date)+'</td><td>'+esc(x.title||"—")+'</td><td>'+esc(customers.find(c=>c.id===x.customer_id)?.customer_name||"—")+'</td><td>'+esc(x.status)+'</td><td><button class="secondary-button" data-extra-print="'+x.id+'">View / Print</button><button class="secondary-button" data-extra-edit="'+x.id+'">Edit</button><button class="secondary-button" data-extra-delete="'+x.id+'">Delete</button></td></tr>').join("")+'</tbody></table></div></div>':'<div class="empty-records">No '+extraDocumentTypes.find(t=>t.key===selectedType).label.toLowerCase()+' records yet.</div>';
   list.querySelectorAll("[data-extra-print]").forEach(b=>b.addEventListener("click",()=>printExtra(rows.find(x=>x.id===b.dataset.extraPrint))));
   list.querySelectorAll("[data-extra-edit]").forEach(b=>b.addEventListener("click",()=>showExtraForm(rows.find(x=>x.id===b.dataset.extraEdit))));
   list.querySelectorAll("[data-extra-delete]").forEach(b=>b.addEventListener("click",async()=>{const doc=rows.find(x=>x.id===b.dataset.extraDelete);if(!doc||!confirm("Delete "+doc.document_number+" permanently?"))return;const {error}=await supabase.from("business_documents").delete().eq("id",doc.id).eq("organization_id",currentOrg.id);if(error){showMessage("Delete failed: "+error.message);return;}rows.splice(rows.indexOf(doc),1);renderRows();}));
  };
  function showExtraForm(existing=null){
   const type=extraDocumentTypes.find(t=>t.key===selectedType),values=existing?.fields||{};
   const inputs=type.fields.map(([key,label,kind])=>'<label class="'+(kind==="textarea"?"wide-field":"")+'">'+label+(kind==="textarea"?'<textarea name="'+key+'" rows="2">'+esc(values[key]||"")+'</textarea>':'<input name="'+key+'" type="'+kind+'" value="'+esc(values[key]??"")+'" '+(kind==="number"?'min="0" step="0.01"':"")+'></label>')).join("");
   const itemText=(existing?.line_items||[]).map(x=>[x.description,x.quantity,x.unit||"",x.rate??""].join(" | ")).join("\n");
   wrap.innerHTML='<form id="extraDocForm" class="record-form"><h3>'+(existing?"Edit ":"Create ")+type.label+'</h3><div class="form-grid"><label>Document number<input name="document_number" required maxlength="80" value="'+esc(existing?.document_number||"")+'" placeholder="Auto generated if blank"></label><label>Document date<input name="document_date" type="date" required value="'+esc(existing?.document_date||new Date().toISOString().slice(0,10))+'"></label><label>Customer (optional)<select name="customer_id"><option value="">Not linked</option>'+customers.map(c=>'<option value="'+c.id+'" '+(existing?.customer_id===c.id?"selected":"")+'>'+esc(c.customer_name)+'</option>').join("")+'</select></label><label>Title / subject<input name="title" maxlength="180" value="'+esc(existing?.title||"")+'"></label>'+inputs+(type.items?'<label class="wide-field">Items (one per line: Description | Quantity | Unit | Rate)<textarea name="items" rows="4" placeholder="Cat6 cable | 2 | Box | 4500">'+esc(itemText)+'</textarea></label>':"")+'<label>Status<select name="status">'+["draft","issued","completed","cancelled"].map(v=>'<option value="'+v+'" '+((existing?.status||"draft")===v?"selected":"")+'>'+v+'</option>').join("")+'</select></label></div><div class="record-form-actions"><button class="primary-button" type="submit">Save '+type.label+'</button><button class="secondary-button" type="button" id="cancelExtraDoc">Cancel</button></div><p class="form-message" id="extraDocMessage"></p></form>';
   const form=document.getElementById("extraDocForm");
   document.getElementById("cancelExtraDoc").addEventListener("click",()=>wrap.innerHTML="");
   form.addEventListener("submit",async e=>{
    e.preventDefault();const fd=new FormData(form),btn=form.querySelector('[type="submit"]'),fields={};
    type.fields.forEach(([key])=>{const value=String(fd.get(key)||"").trim();if(value)fields[key]=value;});
    let line_items=[];
    if(type.items){line_items=String(fd.get("items")||"").split("\n").map(line=>line.trim()).filter(Boolean).map(line=>{const [description,quantity,unit,rate]=line.split("|").map(v=>v.trim());return {description:description||"",quantity:Number(quantity)||0,unit:unit||"",rate:Number(rate)||0};});if(line_items.some(x=>!x.description||x.quantity<=0)){document.getElementById("extraDocMessage").textContent="Each item needs a description and quantity greater than zero.";return;}}
    const payload={organization_id:currentOrg.id,document_type:type.key,document_number:String(fd.get("document_number")||"").trim()||type.prefix+"-"+new Date().getFullYear()+"-"+String(rows.filter(x=>x.document_type===type.key).length+1).padStart(4,"0"),document_date:fd.get("document_date"),customer_id:String(fd.get("customer_id")||"")||null,title:String(fd.get("title")||"").trim()||null,fields,line_items,status:fd.get("status"),created_by:currentUser.id};
    btn.disabled=true;btn.textContent="Saving…";
    const query=existing?supabase.from("business_documents").update(payload).eq("id",existing.id).eq("organization_id",currentOrg.id):supabase.from("business_documents").insert(payload);
    const {data:saved,error}=await query.select("*").single();
    if(error){document.getElementById("extraDocMessage").textContent="Could not save: "+error.message;btn.disabled=false;btn.textContent="Save "+type.label;return;}
    if(existing)rows[rows.findIndex(x=>x.id===existing.id)]=saved;else rows.unshift(saved);
    wrap.innerHTML="";renderRows();
   });
  }
  function printExtra(doc){
   if(!doc)return;
   const type=extraDocumentTypes.find(t=>t.key===doc.document_type),customer=customers.find(c=>c.id===doc.customer_id)||{},templateId=settings.documents?.[doc.document_type]||"classic";
   const palettes={classic:["#e98a2b","#17243a"],corporate:["#173b63","#ffffff"],modern:["#087f8c","#ffffff"],elegant:["#343434","#c6a56b"],creative:["#6b4eff","#ffffff"]};
   const colors=theme.applyAcross===false?palettes[templateId]:[theme.primary||palettes[templateId][0],theme.secondary||palettes[templateId][1]],primary=colors[0],logo=theme.logoUrl||"";
   const fieldLabels=Object.fromEntries(type.fields.map(([k,l])=>[k,l]));
   const companyDocumentTerms=settings.terms?.[doc.document_type]||defaultDocumentTerms[doc.document_type]||"";
   const fieldRows=Object.entries(doc.fields||{}).map(([k,v])=>'<tr><th>'+esc(fieldLabels[k]||k.replaceAll("_"," "))+'</th><td>'+esc(v)+'</td></tr>').join("");
   const itemRows=(doc.line_items||[]).map(x=>'<tr><td>'+esc(x.description)+'</td><td>'+esc(x.quantity)+'</td><td>'+esc(x.unit||"")+'</td><td>'+money(x.rate)+'</td></tr>').join("");
   const customerBlock=customer.customer_name?'<section class="party"><b>Customer</b><br>'+esc(customer.customer_name)+'<br>'+esc(customer.billing_address||"")+'<br>'+esc([customer.city,customer.state,customer.pincode].filter(Boolean).join(", "))+'<br>'+esc(customer.phone||"")+(customer.gstin?'<br>GSTIN: '+esc(customer.gstin):"")+'</section>':"";
   const html='<!doctype html><html><head><meta charset="utf-8"><title>'+esc(doc.document_number)+'</title><style>@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font:10pt Arial;color:#202938;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{min-height:270mm;padding:10mm;position:relative}.brandbar{height:7px;background:'+primary+';margin-bottom:18px}.head{display:flex;justify-content:space-between;gap:15px;border-bottom:3px solid '+primary+';padding-bottom:14px}.brand{display:flex;gap:12px;align-items:center}.logo{max-width:70px;max-height:55px;object-fit:contain}.brand h1{font-size:20pt;color:'+primary+';margin:0 0 5px}.meta{font-size:8.5pt;line-height:1.5;color:#596273}.doc{text-align:right}.doc h2{font-size:18pt;color:'+primary+';margin:0 0 8px}.party{margin:22px 0;padding:12px;background:#f2f4f7;line-height:1.5}.subject{font-size:14pt;margin:20px 0 12px}table{width:100%;border-collapse:collapse;margin:14px 0}td,th{padding:8px;border-bottom:1px solid #d9dee6;text-align:left;vertical-align:top;white-space:pre-wrap}th{width:32%;background:#f5f6f8}thead th{background:'+primary+';color:white}footer{margin-top:40px;padding-top:8px;border-top:1px solid #d9dee6;font-size:8pt;color:#697386}.tpl-modern .brandbar{height:10px;border-radius:5px}.tpl-corporate .head{border-bottom-width:6px}.tpl-elegant .head{border-bottom:1px solid '+primary+'}.tpl-creative .head{background:#f5f3ff;padding:14px;border:0;border-radius:8px}.tpl-creative .party{background:#f5f3ff}.tpl-classic .party{border:1px solid #e4e8ef}@media screen{body{background:#e9edf2;padding:16px}.sheet{background:white;max-width:190mm;margin:auto;box-shadow:0 2px 18px #0002}}@media print{.sheet{padding:0}.no-print{display:none!important}}</style></head><body><main class="sheet tpl-'+templateId+'"><div class="brandbar"></div><header class="head"><div class="brand">'+(logo?'<img class="logo" src="'+esc(logo)+'">':"")+'<div><h1>'+esc(companyInfo.name||currentOrg.name)+'</h1><div class="meta">'+[companyInfo.address,companyInfo.phone,companyInfo.billing_email,companyInfo.gst_number?"GSTIN: "+companyInfo.gst_number:"",companyInfo.website].filter(Boolean).map(esc).join("<br>")+'</div></div></div><div class="doc"><h2>'+esc(type.label.toUpperCase())+'</h2><b>'+esc(doc.document_number)+'</b><p>Date: '+esc(doc.document_date)+'<br>Status: '+esc(doc.status)+'</p></div></header>'+customerBlock+'<h3 class="subject">'+esc(doc.title||type.label)+'</h3><table>'+fieldRows+'</table>'+(doc.line_items?.length?'<h3>Items / materials</h3><table><thead><tr><th>Description</th><th>Quantity</th><th>Unit</th><th>Rate</th></tr></thead><tbody>'+itemRows+'</tbody></table>':"")+(companyDocumentTerms?'<section class="document-terms"><h3>Terms &amp; Conditions</h3><p>'+esc(companyDocumentTerms)+'</p></section>':"")+'<footer>'+esc(companyInfo.name||currentOrg.name)+' · '+esc(companyInfo.phone||"")+' · '+esc(companyInfo.billing_email||"")+'</footer></main><script>window.onload=()=>window.print()<\\/script></body></html>';
   if(window.BizFoxAndroid?.printHtml){window.BizFoxAndroid.printHtml(html,doc.document_number);return;}
   const w=window.open("","_blank");if(!w){showMessage("Allow pop-ups to print this document.");return;}w.document.open();w.document.write(html);w.document.close();
  }
  typeSelect.addEventListener("change",()=>{selectedType=typeSelect.value;renderRows();wrap.innerHTML="";});
  document.getElementById("createExtraDoc").addEventListener("click",()=>showExtraForm());
  renderRows();
 }
 async function showTab(tab){
  document.querySelectorAll("[data-sales-tab]").forEach(b=>b.classList.toggle("active",b.dataset.salesTab===tab));
  if(tab==="customers")await renderCustomers();else if(tab==="other")await renderAdditionalDocuments();else await renderDocuments(tab);
 }
 content.querySelectorAll("[data-sales-tab]").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.salesTab)));
 await refreshSummary();await showTab(initialTab);
}


async function renderCompanySettings(){
 title.textContent="Company settings";
 if(!currentOrg){renderOnboarding();return;}
 const {data:membership,error:memberError}=await supabase.from("organization_members").select("role").eq("organization_id",currentOrg.id).eq("user_id",currentUser.id).eq("status","active").maybeSingle();
 if(memberError||!membership||!["owner","admin"].includes(membership.role)){
  content.innerHTML='<div class="empty-page"><h2>Access restricted</h2><p>Only the company owner or an administrator can manage company settings.</p></div>';return;
 }
 const {data:company,error}=await supabase.from("organizations").select("id,name,slug,billing_email,timezone,phone,address,website,gst_number").eq("id",currentOrg.id).single();
 if(error){content.innerHTML='<div class="empty-page"><h2>Could not load company settings</h2><p>'+escapeHtml(error.message)+'</p></div>';return;}
 content.innerHTML=`<div class="settings-layout">
 <section class="dashboard-panel company-settings-panel"><div class="panel-heading"><div><span class="eyebrow">WORKSPACE PROFILE</span><h3>Company details</h3><p>These details are used across company records and reports.</p></div></div>
 <form id="companySettingsForm" class="company-settings-form">
 <label>Company / business name<input name="name" required maxlength="160" value="${escapeHtml(company.name||"")}"></label>
 <label>Billing email<input name="billing_email" type="email" maxlength="254" value="${escapeHtml(company.billing_email||"")}"></label>
 <label>Contact phone<input name="phone" type="tel" maxlength="30" value="${escapeHtml(company.phone||"")}"></label>
 <label>GSTIN<input name="gst_number" maxlength="15" pattern="[0-9A-Za-z]{15}" value="${escapeHtml(company.gst_number||"")}" placeholder="15-character GSTIN"></label>
 <label>Website<input name="website" type="url" maxlength="200" value="${escapeHtml(company.website||"")}" placeholder="https://example.com"></label>
 <label>Time zone<select name="timezone"><option value="Asia/Kolkata" ${company.timezone==="Asia/Kolkata"?"selected":""}>India Standard Time (Asia/Kolkata)</option><option value="UTC" ${company.timezone==="UTC"?"selected":""}>UTC</option></select></label>
 <label class="settings-full">Registered address<textarea name="address" rows="3" maxlength="500">${escapeHtml(company.address||"")}</textarea></label>
 <div class="settings-full settings-form-actions"><button class="primary-button" type="submit" id="saveCompanySettings">Save company details</button><span id="companySettingsMessage" role="status"></span></div>
 </form></section>
 <section class="dashboard-panel security-settings-panel"><div class="panel-heading"><div><span class="eyebrow">ACCOUNT SECURITY</span><h3>Company account deletion</h3><p>Permanent removal of the company workspace.</p></div></div>
 <div class="danger-notice"><strong>This action cannot be undone.</strong><p>Deleting this company removes its workspace records, staff/customer access and your owner login. Export any records you need before proceeding.</p><p>Only the company owner can perform this action. You will need your current password, the exact company name and a typed confirmation.</p></div>
 <button class="danger-button" id="showDeleteCompany" type="button">Delete company account</button>
 <form id="deleteCompanyForm" class="delete-company-form" hidden>
 <label>Confirm company name<input name="confirm_name" required autocomplete="off" value=""></label>
 <label>Current account password<input name="password" type="password" required autocomplete="current-password"></label>
 <label>Type DELETE MY COMPANY<input name="confirm_phrase" required autocomplete="off" placeholder="DELETE MY COMPANY"></label>
 <div class="delete-actions"><button class="danger-button" id="confirmDeleteCompany" type="submit">Permanently delete company</button><button class="secondary-button" id="cancelDeleteCompany" type="button">Cancel</button></div>
 <small class="delete-security-note">Password is checked again with Supabase before the server accepts the deletion. The server also verifies your owner role and a freshly issued login token.</small>
 </form></section></div>`;
 const form=document.getElementById("companySettingsForm"),message=document.getElementById("companySettingsMessage");
 form.addEventListener("submit",async event=>{
  event.preventDefault();const button=document.getElementById("saveCompanySettings");button.disabled=true;button.textContent="Saving…";message.textContent="";
  const fd=new FormData(form),name=String(fd.get("name")||"").trim(),gst=String(fd.get("gst_number")||"").trim().toUpperCase(),website=String(fd.get("website")||"").trim();
  if(name.length<2){message.textContent="Enter a valid company name.";button.disabled=false;button.textContent="Save company details";return;}
  if(gst&&!/^[0-9A-Z]{15}$/.test(gst)){message.textContent="Enter a valid 15-character GSTIN.";button.disabled=false;button.textContent="Save company details";return;}
  if(website){try{const parsed=new URL(website);if(!["http:","https:"].includes(parsed.protocol))throw new Error();}catch{message.textContent="Enter a valid website URL.";button.disabled=false;button.textContent="Save company details";return;}}
  const update={name,billing_email:String(fd.get("billing_email")||"").trim()||null,phone:String(fd.get("phone")||"").trim()||null,gst_number:gst||null,website:website||null,timezone:String(fd.get("timezone")||"Asia/Kolkata"),address:String(fd.get("address")||"").trim()||null,updated_at:new Date().toISOString()};
  const {error:saveError}=await supabase.from("organizations").update(update).eq("id",company.id);
  button.disabled=false;button.textContent="Save company details";
  if(saveError){message.textContent="Could not save: "+saveError.message;return;}
  currentOrg={...currentOrg,...update};message.textContent="Company details saved successfully.";message.className="settings-success";
 });

 const templateCatalog=[
  {id:"quotation",label:"Quotation",key:"quotation"},{id:"invoice",label:"Tax invoice",key:"invoice"},
  {id:"receipt",label:"Payment receipt",key:"receipt"},{id:"work_order",label:"Work order",key:"work_order"},
  {id:"delivery_challan",label:"Delivery challan",key:"delivery_challan"},{id:"service_report",label:"Service completion report",key:"service_report"},
  {id:"installation_report",label:"Installation report",key:"installation_report"},{id:"amc_agreement",label:"AMC agreement",key:"amc_agreement"},
  {id:"purchase_order",label:"Purchase order",key:"purchase_order"},{id:"expense_voucher",label:"Expense voucher",key:"expense_voucher"}
 ];

 const templateChoices=[
  {id:"classic",name:"Classic",desc:"Clean white layout with a warm accent",color:"#e98a2b"},
  {id:"corporate",name:"Corporate",desc:"Strong business header and formal hierarchy",color:"#173b63"},
  {id:"modern",name:"Modern",desc:"Contemporary teal accents and open spacing",color:"#087f8c"},
  {id:"elegant",name:"Elegant",desc:"Minimal monochrome with refined details",color:"#343434"},
  {id:"creative",name:"Creative",desc:"Distinctive violet header and soft panels",color:"#6b4eff"}
 ];
 const {data:templateRecord}=await supabase.from("company_document_settings").select("settings").eq("organization_id",company.id).maybeSingle();
 let templateSettings=templateRecord?.settings||{theme:{primary:"#e98a2b",secondary:"#17243a",applyAcross:true,logoUrl:""},documents:{}};
 templateSettings.theme={primary:"#e98a2b",secondary:"#17243a",applyAcross:true,logoUrl:"",...(templateSettings.theme||{})};
 templateSettings.documents=templateSettings.documents||{};
 templateSettings.terms={...defaultDocumentTerms,...(templateSettings.terms||{})};
 const templateSection=document.createElement("section");templateSection.className="dashboard-panel document-template-panel";
 templateSection.innerHTML='<div class="panel-heading"><div><span class="eyebrow">DOCUMENT BRANDING</span><h3>Document templates</h3><p>Choose from five ready-made A4 designs for every document type. Set one default per document, or apply your company theme across all documents.</p></div></div><div class="template-theme-grid"><label>Company logo URL<input id="docLogoUrl" type="url" placeholder="https://example.com/company-logo.png"></label><label>Primary brand colour<input id="docPrimaryColor" type="color"></label><label>Secondary colour<input id="docSecondaryColor" type="color"></label><label class="template-theme-toggle"><input id="docApplyTheme" type="checkbox"> Apply common company theme across all documents</label></div><div class="template-picker-head"><label>Choose document type<select id="templateDocumentType">'+templateCatalog.map(x=>'<option value="'+x.key+'">'+x.label+'</option>').join("")+'</select></label><span id="templateSelectedLabel" class="tag">Default design</span></div><div id="templateChoices" class="template-choice-grid"></div><div class="document-terms-editor"><label for="templateDocumentTerms">Company terms &amp; conditions for this document</label><textarea id="templateDocumentTerms" rows="8" placeholder="Enter the company terms that should print on this document"></textarea><small>These terms are saved separately for each document type and appear on newly printed documents. You can edit the wording to match your company policy.</small></div><div class="template-actions"><button class="primary-button" id="saveDocumentTemplates" type="button">Save document template settings</button><span id="documentTemplateMessage" role="status"></span></div><p class="template-note">All templates use A4 page dimensions. Existing generated documents are not changed when you update these defaults. Logo URLs must be publicly accessible for PDF printing.</p>';
 document.querySelector(".settings-layout").insertBefore(templateSection,document.querySelector(".security-settings-panel"));
 const typeSelect=templateSection.querySelector("#templateDocumentType"),choiceWrap=templateSection.querySelector("#templateChoices");
 const paintChoices=()=>{
  const selected=templateSettings.documents[typeSelect.value]||"classic";
  choiceWrap.innerHTML=templateChoices.map(t=>'<button type="button" class="template-choice '+(selected===t.id?"selected":"")+'" data-template-choice="'+t.id+'"><span class="template-mini '+t.id+'" style="--template-accent:'+t.color+'"><i></i><b></b><em></em><small></small><small></small></span><strong>'+t.name+'</strong><small>'+t.desc+'</small>'+(selected===t.id?'<span class="template-selected">Selected default</span>':'<span class="template-select-hint">Select design</span>')+'</button>').join("");
  choiceWrap.querySelectorAll("[data-template-choice]").forEach(button=>button.addEventListener("click",()=>{templateSettings.documents[typeSelect.value]=button.dataset.templateChoice;paintChoices();}));
  templateSection.querySelector("#templateSelectedLabel").textContent="Selected: "+templateChoices.find(x=>x.id===selected).name;
 };
 templateSection.querySelector("#docLogoUrl").value=templateSettings.theme.logoUrl||"";
 templateSection.querySelector("#docPrimaryColor").value=templateSettings.theme.primary||"#e98a2b";
 templateSection.querySelector("#docSecondaryColor").value=templateSettings.theme.secondary||"#17243a";
 templateSection.querySelector("#docApplyTheme").checked=templateSettings.theme.applyAcross!==false;
 const termsEditor=templateSection.querySelector("#templateDocumentTerms");
 const paintDocumentTerms=()=>{termsEditor.value=templateSettings.terms[typeSelect.value]||"";};
 typeSelect.addEventListener("change",()=>{paintChoices();paintDocumentTerms();});paintChoices();paintDocumentTerms();
 templateSection.querySelector("#saveDocumentTemplates").addEventListener("click",async()=>{
  const saveButton=templateSection.querySelector("#saveDocumentTemplates"),msg=templateSection.querySelector("#documentTemplateMessage");
  const logoUrl=templateSection.querySelector("#docLogoUrl").value.trim();
  if(logoUrl){try{const u=new URL(logoUrl);if(!["http:","https:"].includes(u.protocol))throw new Error();}catch{msg.textContent="Enter a valid HTTPS or HTTP logo URL.";return;}}
  templateSettings.theme={logoUrl,primary:templateSection.querySelector("#docPrimaryColor").value,secondary:templateSection.querySelector("#docSecondaryColor").value,applyAcross:templateSection.querySelector("#docApplyTheme").checked};
  templateSettings.terms[typeSelect.value]=termsEditor.value.trim();
  saveButton.disabled=true;saveButton.textContent="Saving…";msg.textContent="";
  const {error:saveTemplateError}=await supabase.from("company_document_settings").upsert({organization_id:company.id,settings:templateSettings,updated_by:currentUser.id,updated_at:new Date().toISOString()},{onConflict:"organization_id"});
  saveButton.disabled=false;saveButton.textContent="Save document template settings";
  msg.textContent=saveTemplateError?"Could not save: "+saveTemplateError.message:"Document template settings saved successfully.";
  msg.className=saveTemplateError?"form-error":"settings-success";
 });

 document.getElementById("showDeleteCompany").addEventListener("click",()=>{
  if(membership.role!=="owner"){showMessage("Only the company owner can delete the company account.");return;}
  document.getElementById("deleteCompanyForm").hidden=false;document.getElementById("showDeleteCompany").hidden=true;
  document.querySelector('#deleteCompanyForm [name="confirm_name"]').value="";
 });
 document.getElementById("cancelDeleteCompany").addEventListener("click",()=>{document.getElementById("deleteCompanyForm").reset();document.getElementById("deleteCompanyForm").hidden=true;document.getElementById("showDeleteCompany").hidden=false;});
 document.getElementById("deleteCompanyForm").addEventListener("submit",async event=>{
  event.preventDefault();
  if(!navigator.onLine){showMessage("Company deletion requires an active internet connection.");return;}
  const deleteForm=event.currentTarget,fd=new FormData(deleteForm),typedName=String(fd.get("confirm_name")||"").trim(),password=String(fd.get("password")||""),phrase=String(fd.get("confirm_phrase")||"").trim();
  if(membership.role!=="owner"){showMessage("Only the company owner can delete the company account.");return;}
  if(typedName!==company.name||phrase!=="DELETE MY COMPANY"){showMessage("Confirmation did not match. Nothing has been deleted.");return;}
  if(!window.confirm("FINAL WARNING: Permanently delete "+company.name+" and all company workspace records? This cannot be undone."))return;
  const button=document.getElementById("confirmDeleteCompany");button.disabled=true;button.textContent="Verifying and deleting…";
  try{
   const {data:verified,error:verifyError}=await supabase.auth.signInWithPassword({email:currentUser.email,password});
   if(verifyError||!verified?.session)throw new Error("Password verification failed. Check your password and try again.");
   const {data:deleted,error:deleteError}=await supabase.functions.invoke("delete-company-account",{body:{company_name:typedName,confirmation:phrase}});
   if(deleteError)throw new Error(deleteError.message||"The server could not complete the deletion.");
   if(!deleted?.success)throw new Error(deleted?.error||"The server did not confirm deletion.");
   await supabase.auth.signOut({scope:"local"});location.replace("./login.html");
  }catch(error){button.disabled=false;button.textContent="Permanently delete company";showMessage(error.message||"Company deletion failed. No success was reported.");}
 });
}


async function renderTermsAndConditions(){
 title.textContent="Terms & Conditions";
 content.innerHTML=`<section class="dashboard-panel app-terms-page">
 <div class="panel-heading"><div><span class="eyebrow">BIZ FOX ERP</span><h3>Application Terms &amp; Conditions</h3><p>Last updated: 28 November 2026</p></div></div>
 <div class="app-terms-copy">
 <h4>1. Acceptance</h4><p>By signing in to or using Biz FOX ERP, you agree to these terms and the applicable company policies. If you do not agree, stop using the application and contact your company administrator.</p>
 <h4>2. Purpose and permitted use</h4><p>Biz FOX ERP supports business and office operations, including employee administration, attendance, tasks, customers, quotations, invoices, expenses, files and service records. Use it only for authorized and lawful business purposes.</p>
 <h4>3. Accounts and access</h4><p>Keep your login credentials confidential. You are responsible for activity performed through your account. Do not share credentials, bypass role permissions, or access records that you are not authorized to view. Report suspected unauthorized access to the company administrator promptly.</p>
 <h4>4. Company information and records</h4><p>Users must enter complete and accurate information and review records before submitting, approving, issuing or printing them. The company is responsible for its business records, approvals, tax filings, statutory compliance and retention of required supporting documents.</p>
 <h4>5. Confidentiality and privacy</h4><p>Customer, employee, financial and operational information must be treated as confidential and used only for authorized work. Information is made available according to assigned roles and permissions and is processed to operate and secure the application.</p>
 <h4>6. AI-assisted content</h4><p>AI-generated reports or text are provided as drafting assistance only. Users must verify accuracy, completeness, measurements, prices, legal statements and other facts before relying on or sharing generated content.</p>
 <h4>7. Availability, backups and updates</h4><p>Features may change or become temporarily unavailable for maintenance, security or upgrades. The company should maintain suitable backups of important records and install official application updates when available. Continuous, uninterrupted service is not guaranteed.</p>
 <h4>8. Prohibited activities</h4><p>Do not attempt unauthorized access, disrupt the service, upload malicious or unlawful content, misuse another person's information, reverse engineer protected components, or use the application in violation of law or company policy.</p>
 <h4>9. Suspension and termination</h4><p>The company administrator may change, suspend or revoke access in accordance with company policy, security requirements and applicable law. Account access may also be restricted when misuse or a security risk is identified.</p>
 <h4>10. Intellectual property</h4><p>Biz FOX ERP software, branding and protected materials may not be copied, redistributed, modified or commercially exploited without authorization from the relevant rights holder.</p>
 <h4>11. Limitation</h4><p>To the extent permitted by applicable law, the application provider is not responsible for losses caused by inaccurate user entries, unauthorized sharing of credentials, decisions made without checking records, third-party service interruptions or temporary unavailability. Nothing in these terms excludes liability that cannot legally be excluded.</p>
 <h4>12. Changes and governing law</h4><p>These terms may be updated from time to time. Continued use after publication of an update indicates acceptance to the extent permitted by law. These terms are governed by the laws of India, subject to applicable jurisdiction rules.</p>
 <h4>13. Company-specific policies</h4><p>Your employer or organization may maintain additional policies for work, attendance, expenses, data handling and document approvals. Those policies apply alongside these application terms. For company-specific document conditions, refer to the Terms &amp; Conditions printed on the relevant company document.</p>
 <h4>14. Contact</h4><p>For questions or support, contact your company's authorized administrator through its official support channel.</p>
 <p><strong>By continuing to use Biz FOX ERP, you acknowledge that you have read these Application Terms &amp; Conditions.</strong></p>
 </div></section>`;
}

async function openPage(id){
 activePage=id;
 activeDataConfig=null;
 if(id==="profile"){await renderProfile();return;}
 if(id==="terms"){await renderTermsAndConditions();return;}
 if(id==="company-settings"){await renderCompanySettings();return;}
 if(id==="tasks"){await openTaskWorkspace();return;}
 if(id==="reports"){await openReportsWorkspace();return;}
 if(id==="sales"){await openSalesWorkspace();return;}
 const m=modules.find(x=>x.id===id);if(!m){renderOverview();return;}
 const config=dataModules[id];
 if(config){await openDataConfig(config);return;}
 title.textContent=m.name;
 content.innerHTML=`<div class="empty-page"><span class="module-icon">${m.icon}</span><h2>${m.name}</h2><span class="tag">Under development</span><p>${m.desc}. This module is on the implementation roadmap and will be connected to the workspace in a later phase.</p></div>`;
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(!b)return;const id=b.dataset.page;if(id===activePage&&!activeDataConfig)return;rememberCurrentPage();if(id==="overview")renderOverview();else openPage(id);updateBackButton();document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.page===id));document.getElementById("sidebar").classList.remove("open");});
window.addEventListener("bizfox:online",()=>{setTimeout(()=>{if(currentUser&&activePage==="overview")renderOverview();else if(currentUser)openPage(activePage);},1200);});
window.addEventListener("bizfox:synccomplete",()=>{if(currentUser){if(activePage==="overview")renderOverview();else openPage(activePage);}});
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
  else if(!activeRoles.some(role=>["owner","admin","manager"].includes(role))){
    const {data:customerAccount}=await supabase.from("customers").select("id").eq("user_id",currentUser.id).maybeSingle();
    if(customerAccount){location.replace("./customer.html");}
    else{
      const {data:platformAdmin}=await supabase.from("platform_super_admins").select("user_id").eq("user_id",currentUser.id).maybeSingle();
      if(platformAdmin){location.replace("./setup-company.html");}
      else{await supabase.auth.signOut();location.replace("./login.html");}
    }
  }
  else{
    setupAppUpdates();setupTaskNotifications();
    try{await loadOrganizations();addWorkspaceControls();if(organizations.length){initNotificationCenter({user:currentUser,organizationId:currentOrg.id,mount:document.querySelector(".top-actions")});initMessaging({user:currentUser,organizationId:currentOrg.id,role:"admin",mount:document.querySelector(".top-actions")});renderOverview();}else renderOnboarding();}
    catch(error){content.innerHTML=`<div class="empty-page"><h2>Workspace connection issue</h2><p>${escapeHtml(error.message)}</p></div>`;}
  }
  supabase.auth.onAuthStateChange((_event,newSession)=>{if(!newSession)location.href="./login.html";});
}
