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
async function openPage(id){
  const m=modules.find(x=>x.id===id);if(!m){renderOverview();return;}
  title.textContent=m.name;
  if(!m.table){content.innerHTML=`<div class="empty-page"><span class="module-icon">${m.icon}</span><h2>${m.name}</h2><span class="tag">Under development</span><p>${m.desc}. This module is on the implementation roadmap and will be connected to the workspace in a later phase.</p></div>`;return;}
  content.innerHTML=`<div class="empty-page"><span class="module-icon">${m.icon}</span><h2>${m.name}</h2><span class="tag">Database connected · Phase in progress</span><p>${m.desc}. The secured database table is ready. The full forms, workflows, approvals and reports are being built next.</p><p id="moduleCount">Loading records…</p></div>`;
  const {count,error}=await supabase.from(m.table).select("id",{count:"exact",head:true}).eq("organization_id",currentOrg.id);
  const el=document.getElementById("moduleCount");if(el)el.textContent=error?"Records are not available yet.":`Current records in this workspace: ${count??0}`;
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(!b)return;const id=b.dataset.page;if(id==="overview")renderOverview();else openPage(id);document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.page===id));document.getElementById("sidebar").classList.remove("open");});
document.getElementById("menuToggle").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("year").textContent=new Date().getFullYear();

const {data:{session},error:sessionError}=await supabase.auth.getSession();
if(sessionError||!session){location.replace("./login.html");}
else{
  currentUser=session.user;
  try{await loadOrganizations();addWorkspaceControls();if(organizations.length)renderOverview();else renderOnboarding();}
  catch(error){content.innerHTML=`<div class="empty-page"><h2>Workspace connection issue</h2><p>${escapeHtml(error.message)}</p></div>`;}
  supabase.auth.onAuthStateChange((_event,newSession)=>{if(!newSession)location.href="./login.html";});
}
