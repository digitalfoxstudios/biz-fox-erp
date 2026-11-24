import { supabase } from "./supabase.js";
const $=id=>document.getElementById(id);
const authPanel=$("staffAuth"),portal=$("staffPortal"),noAccess=$("staffNoAccess");
let currentUser=null,currentOrg=null,staffOrganizations=[];
let authMode="signin";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const showAuthMessage=(message,kind="error")=>{const el=$("staffAuthMessage");el.textContent=message;el.style.color=kind==="success"?"#21734a":"#b34a38";};
function setAuthMode(mode){authMode=mode;$("staffAuthTitle").textContent=mode==="signup"?"Create staff account":"Staff sign in";$("staffAuthSubmit").textContent=mode==="signup"?"Create account":"Sign in";$("staffAuthToggle").textContent=mode==="signup"?"Already have an account? Sign in":"New staff member? Create account";}
$("staffAuthToggle").addEventListener("click",()=>setAuthMode(authMode==="signin"?"signup":"signin"));
$("staffAuthForm").addEventListener("submit",async e=>{
 e.preventDefault();const form=e.currentTarget,fd=new FormData(form),button=$("staffAuthSubmit");button.disabled=true;button.textContent=authMode==="signup"?"Creating account…":"Signing in…";
 const email=String(fd.get("email")).trim().toLowerCase(),password=String(fd.get("password"));
 let result;
 if(authMode==="signup")result=await supabase.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});
 else result=await supabase.auth.signInWithPassword({email,password});
 button.disabled=false;button.textContent=authMode==="signup"?"Create account":"Sign in";
 if(result.error){showAuthMessage(result.error.message);return;}
 if(authMode==="signup"&&!result.data.session){showAuthMessage("Account created. Check your email to confirm it, then return here to sign in.","success");return;}
 if(result.data.session)await boot(result.data.session.user);
});
async function boot(user){
 currentUser=user;authPanel.hidden=true;portal.hidden=true;noAccess.hidden=true;
 const {data:members,error}=await supabase.from("organization_members").select("organization_id,role,status").eq("user_id",user.id).eq("status","active");
 if(error){showNoAccess("Could not check your staff access: "+error.message);return;}
 const allowed=(members||[]).filter(m=>m.role==="staff");
 if(!allowed.length){showNoAccess();return;}
 const ids=allowed.map(m=>m.organization_id);
 const {data:orgs,error:orgError}=await supabase.from("organizations").select("id,name").in("id",ids).order("name");
 if(orgError||!orgs?.length){showNoAccess("Your organization could not be loaded. Contact your office manager.");return;}
 staffOrganizations=orgs;currentOrg=orgs[0];
 portal.hidden=false;$("staffGreeting").textContent="My assignments";$("staffOrgName").textContent=currentOrg.name+" · Signed in as "+(user.email||"staff");
 await renderStaffWorkspace();
}
function showNoAccess(message="Your login is not linked to an active employee record. Ask your office manager to add your employee record using this same email address. It will link automatically; then sign in again."){
 authPanel.hidden=true;portal.hidden=true;noAccess.hidden=false;
 const p=noAccess.querySelector("p");if(p)p.textContent=message;
}
async function renderStaffWorkspace(){
 const [tasksResult,reportsResult]=await Promise.all([
  supabase.from("tasks").select("*").eq("organization_id",currentOrg.id).eq("assigned_to",currentUser.id).order("created_at",{ascending:false}),
  supabase.from("task_reports").select("*").eq("organization_id",currentOrg.id).eq("submitted_by",currentUser.id).order("created_at",{ascending:false}).limit(100)
 ]);
 const taskBox=$("staffTasks"),reportBox=$("staffReports");
 if(tasksResult.error){taskBox.innerHTML='<div class="staff-empty">'+esc(tasksResult.error.message)+'</div>';return;}
 const tasks=tasksResult.data||[],reports=reportsResult.data||[];
 const pending=tasks.filter(t=>["pending","in_progress","blocked"].includes(t.status)).length;
 $("staffSummary").innerHTML='<article class="staff-stat"><small>Total assignments</small><strong>'+tasks.length+'</strong></article><article class="staff-stat"><small>Active work</small><strong>'+pending+'</strong></article><article class="staff-stat"><small>Reports submitted</small><strong>'+reports.length+'</strong></article>';
 taskBox.innerHTML=tasks.length?tasks.map(t=>`<article class="staff-task-card"><div class="staff-task-top"><div><span class="staff-chip ${esc(t.priority)}">${esc(t.priority)} priority</span> <span class="staff-chip ${esc(t.status)}">${esc(t.status.replaceAll("_"," "))}</span><h3>${esc(t.title)}</h3><p>${esc(t.description||"No additional instructions were provided.")}</p><div class="staff-task-meta"><span class="staff-chip">Due: ${t.due_at?esc(new Date(t.due_at).toLocaleString()):"Not specified"}</span></div></div></div><form class="staff-report-form" data-task-form="${t.id}"><h4>Submit work report</h4><div class="staff-report-grid"><label>Report date<input name="report_date" type="date" value="${new Date().toISOString().slice(0,10)}" required></label><label>Hours spent<input name="hours_spent" type="number" min="0" max="24" step="0.25" placeholder="e.g. 3.5"></label><label class="wide">Work completed / action taken<textarea name="work_done" required minlength="3" placeholder="Describe what you completed today"></textarea></label><label class="wide">Challenges or pending issues<textarea name="challenges" placeholder="Mention any problems or support required"></textarea></label><label class="wide">Next steps<textarea name="next_steps" placeholder="What remains to be done?"></textarea></label><label class="wide">Current work status<select name="task_status"><option value="in_progress">In progress</option><option value="blocked">Blocked / need help</option><option value="completed">Completed</option></select></label></div><div class="staff-report-actions"><button class="staff-submit" type="submit">Submit work report</button></div><p class="staff-message" role="status"></p></form></article>`).join(""):'<div class="staff-empty">No work has been assigned to you yet. New assignments will appear here.</div>';
 taskBox.querySelectorAll("[data-task-form]").forEach(form=>form.addEventListener("submit",async e=>{
  e.preventDefault();const fd=new FormData(form),button=form.querySelector("button[type=submit]"),message=form.querySelector(".staff-message"),taskId=form.dataset.taskForm;
  const work=String(fd.get("work_done")||"").trim();if(work.length<3){message.textContent="Please describe the work completed.";return;}
  button.disabled=true;button.textContent="Submitting…";
  const status=String(fd.get("task_status")||"in_progress");
  const report={organization_id:currentOrg.id,task_id:taskId,submitted_by:currentUser.id,report_date:String(fd.get("report_date")),work_done:work,hours_spent:fd.get("hours_spent")?Number(fd.get("hours_spent")):null,challenges:String(fd.get("challenges")||"").trim()||null,next_steps:String(fd.get("next_steps")||"").trim()||null,task_status:status};
  const {error:reportError}=await supabase.from("task_reports").insert(report);
  if(reportError){message.textContent="Report could not be submitted: "+reportError.message;button.disabled=false;button.textContent="Submit work report";return;}
  const {error:taskError}=await supabase.from("tasks").update({status}).eq("id",taskId).eq("organization_id",currentOrg.id).eq("assigned_to",currentUser.id);
  message.textContent=taskError?"Report submitted, but task status could not be updated: "+taskError.message:"Work report submitted successfully.";
  message.style.color=taskError?"#b34a38":"#21734a";
  button.disabled=false;button.textContent="Submit work report";
  if(!taskError)await renderStaffWorkspace();
 }));
 if(reportsResult.error){reportBox.innerHTML='<div class="staff-empty">'+esc(reportsResult.error.message)+'</div>';return;}
 reportBox.innerHTML=reports.length?reports.map(r=>`<article class="staff-report-card"><div class="staff-task-top"><div><span class="staff-chip ${esc(r.report_status)}">${esc(r.report_status.replaceAll("_"," "))}</span><small> · ${esc(r.report_date)} · ${r.hours_spent??"—"} hours</small><p>${esc(r.work_done)}</p>${r.challenges?'<p><b>Challenges:</b> '+esc(r.challenges)+'</p>':''}${r.manager_feedback?'<p><b>Manager feedback:</b> '+esc(r.manager_feedback)+'</p>':''}</div></div></article>`).join(""):'<div class="staff-empty">You have not submitted any work reports yet.</div>';
}
$("staffRefresh").addEventListener("click",renderStaffWorkspace);
$("staffSignOut").addEventListener("click",async()=>{await supabase.auth.signOut();location.reload();});
$("staffNoAccessSignOut").addEventListener("click",async()=>{await supabase.auth.signOut();location.reload();});
supabase.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"){currentUser=null;portal.hidden=true;noAccess.hidden=true;authPanel.hidden=false;}});
const {data:{session}}=await supabase.auth.getSession();
if(session)await boot(session.user);
