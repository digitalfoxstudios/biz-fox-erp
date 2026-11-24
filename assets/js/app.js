const modules = [
  {id:"administration",icon:"▣",name:"Administration & HR",desc:"Employees, attendance, leave and duty rosters"},
  {id:"documents",icon:"▤",name:"Files & e-Office",desc:"Digital files, noting, approvals and movement"},
  {id:"correspondence",icon:"✉",name:"Correspondence",desc:"Inward, outward letters and dispatch register"},
  {id:"finance",icon:"₹",name:"Accounts & Finance",desc:"Budgets, bills, vouchers and financial records"},
  {id:"departments",icon:"▥",name:"Departments",desc:"Department directory and responsibilities"},
  {id:"meetings",icon:"▦",name:"Meetings & Calendar",desc:"Agendas, minutes and action points"},
  {id:"tasks",icon:"✓",name:"Tasks & Work",desc:"Assignments, deadlines and progress tracking"},
  {id:"inventory",icon:"▧",name:"Inventory & Assets",desc:"Stock, equipment and asset registers"},
  {id:"projects",icon:"⌂",name:"Projects",desc:"Development works, milestones and monitoring"},
  {id:"communication",icon:"◉",name:"Communication",desc:"Messages, circulars and office notices"},
  {id:"services",icon:"◎",name:"Public Services",desc:"Applications, requests and grievance tracking"},
  {id:"reports",icon:"▥",name:"Reports & Audit",desc:"Operational reports and audit trails"},
  {id:"security",icon:"♙",name:"Users & Security",desc:"User accounts, roles and access controls"}
];
const content = document.getElementById("pageContent");
const title = document.getElementById("pageTitle");
function renderOverview(){
  title.textContent="Overview";
  content.innerHTML = `<div class="welcome"><div><span class="eyebrow">CENTRAL OFFICE DASHBOARD</span><h2>Welcome to Biz FOX ERP</h2><p>Your centralized workspace for office operations, records and services.</p></div><span class="welcome-icon">✦</span></div>
  <div class="stats-grid"><article class="stat-card"><span class="stat-icon blue">▤</span><p>Open files</p><strong>—</strong><small>Connect your workspace to load data</small></article><article class="stat-card"><span class="stat-icon green">✓</span><p>Pending tasks</p><strong>—</strong><small>Live task totals will appear here</small></article><article class="stat-card"><span class="stat-icon amber">₹</span><p>Financial summary</p><strong>—</strong><small>Secure finance overview</small></article><article class="stat-card"><span class="stat-icon violet">♙</span><p>Employees</p><strong>—</strong><small>Staff directory and attendance</small></article></div>
  <div class="section-heading"><div><h3>Office modules</h3><p>Choose a module to open its workspace.</p></div></div><div class="module-grid" id="moduleGrid"></div>
  <div class="notice"><strong>Setup status</strong><p>This is the application foundation. Authentication, database-backed records, permissions and each module will be implemented and tested in phases. No sample figures are presented as real office data.</p></div>`;
  document.getElementById("moduleGrid").innerHTML=modules.map(m=>`<button class="module-card" data-page="${m.id}"><span class="module-icon">${m.icon}</span><strong>${m.name}</strong><small>${m.desc}</small></button>`).join("");
}
function openPage(id){
  const m=modules.find(x=>x.id===id);
  if(!m){renderOverview();return;}
  title.textContent=m.name;
  content.innerHTML=`<div class="empty-page"><span class="module-icon">${m.icon}</span><h2>${m.name}</h2><span class="tag">Planned module · Not connected yet</span><p>${m.desc}. This module is included in the Biz FOX ERP roadmap. Its forms, database tables, workflows and role permissions will be added in the implementation phase.</p><p>Records will appear here after the module is implemented and connected to the secured workspace.</p></div>`;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===id));
  document.getElementById("sidebar").classList.remove("open");
}
document.addEventListener("click",e=>{
  const button=e.target.closest("[data-page]");
  if(button){const id=button.dataset.page;if(id==="overview")renderOverview();else openPage(id);document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===id));}
});
document.getElementById("menuToggle").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("year").textContent=new Date().getFullYear();
renderOverview();