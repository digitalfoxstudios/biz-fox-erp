import { supabase } from "./supabase.js";
const $=id=>document.getElementById(id);
const authPanel=$("staffAuth"),portal=$("staffPortal"),noAccess=$("staffNoAccess");
let currentUser=null,currentOrg=null,staffOrganizations=[],tasksCache=[],reportsCache=[],expensesCache=[];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=v=>"₹"+Number(v||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
const showAuthMessage=(message,kind="error")=>{const el=$("staffAuthMessage");el.textContent=message;el.style.color=kind==="success"?"#21734a":"#b34a38";};
const today=()=>new Date().toISOString().slice(0,10);
function showPage(page){
 const names={overview:"Overview",tasks:"My Assignments",expenses:"Travel & Material Expenses",reports:"Work Reports"};
 document.querySelectorAll(".staff-page-panel").forEach(el=>el.hidden=el.id!=="staffPage"+page[0].toUpperCase()+page.slice(1));
 document.querySelectorAll("[data-staff-page]").forEach(el=>el.classList.toggle("active",el.dataset.staffPage===page));
 $("staffPageTitle").textContent=names[page]||"Overview";
 $("staffSidebar").classList.remove("open");
 window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-staff-page]").forEach(el=>el.addEventListener("click",()=>showPage(el.dataset.staffPage)));
$("staffMenuToggle").addEventListener("click",()=>$("staffSidebar").classList.toggle("open"));
$("staffAuthForm").addEventListener("submit",async e=>{
 e.preventDefault();const fd=new FormData(e.currentTarget),button=$("staffAuthSubmit");
 const username=String(fd.get("username")||"").trim().toLowerCase(),password=String(fd.get("password")||"");
 if(!/^[a-z0-9._-]{3,32}$/.test(username)){showAuthMessage("Enter a valid username.");return;}
 if(!/^[0-9]{8}$/.test(password)){showAuthMessage("Password must contain exactly 8 digits.");return;}
 button.disabled=true;button.textContent="Signing in…";
 let result;try{result=await supabase.auth.signInWithPassword({email:username+"@staff.bizfox.invalid",password});}
 catch(error){button.disabled=false;button.textContent="Sign in";showAuthMessage("Could not connect. Check your internet connection and try again.");return;}
 button.disabled=false;button.textContent="Sign in";
 if(result.error){showAuthMessage("Incorrect username or password. Contact your administrator if you need new credentials.");return;}
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
 staffOrganizations=orgs;currentOrg=orgs[0];portal.hidden=false;
 $("staffGreeting").textContent=user.user_metadata?.full_name||user.user_metadata?.name||"My workspace";
 $("staffOrgName").textContent=currentOrg.name+" · Employee account";
 $("staffProfileName").textContent=$("staffGreeting").textContent;
 $("staffProfileDetails").textContent="Username: "+((user.email||"").split("@")[0])+" · Role: Employee · Company: "+currentOrg.name;
 setupStaffNotifications();updateStaffNetworkStatus();showPage("overview");await renderStaffWorkspace();
}
function showNoAccess(message="Your staff login is not linked to an active employee record. Ask the administrator to create your employee record and issue your username and password."){
 authPanel.hidden=true;portal.hidden=true;noAccess.hidden=false;const p=noAccess.querySelector("p");if(p)p.textContent=message;
}
function taskTitle(id){return tasksCache.find(t=>t.id===id)?.title||"Assigned task";}
function expenseLabel(type){return ({travel:"Travel",material:"Sourced material",other:"Other"})[type]||type;}
async function renderStaffWorkspace(){
 const [tasksResult,reportsResult,expensesResult]=await Promise.all([
  supabase.from("tasks").select("*").eq("organization_id",currentOrg.id).eq("assigned_to",currentUser.id).order("created_at",{ascending:false}),
  supabase.from("task_reports").select("*").eq("organization_id",currentOrg.id).eq("submitted_by",currentUser.id).order("created_at",{ascending:false}).limit(100),
  supabase.from("task_expenses").select("*").eq("organization_id",currentOrg.id).eq("submitted_by",currentUser.id).order("created_at",{ascending:false}).limit(200)
 ]);
 const taskBox=$("staffTasks"),reportBox=$("staffReports"),expenseBox=$("staffExpenses");
 if(tasksResult.error){taskBox.innerHTML='<div class="staff-empty">'+esc(tasksResult.error.message)+'</div>';return;}
 tasksCache=tasksResult.data||[];reportsCache=reportsResult.data||[];expensesCache=expensesResult.data||[];
 const active=tasksCache.filter(t=>["pending","in_progress","blocked"].includes(t.status)).length;
 const expTotal=expensesCache.reduce((s,e)=>s+Number(e.amount||0),0);
 $("staffSummary").innerHTML='<article class="stat-card"><span class="stat-icon blue">✓</span><p>Total assignments</p><strong>'+tasksCache.length+'</strong><small>All assigned tasks</small></article><article class="stat-card"><span class="stat-icon green">◷</span><p>Active work</p><strong>'+active+'</strong><small>Pending or in progress</small></article><article class="stat-card"><span class="stat-icon amber">▤</span><p>Work reports</p><strong>'+reportsCache.length+'</strong><small>Reports submitted</small></article><article class="stat-card"><span class="stat-icon violet">₹</span><p>Expense claims</p><strong>'+money(expTotal)+'</strong><small>'+expensesCache.length+' submitted claims</small></article>';
 taskBox.innerHTML=tasksCache.length?tasksCache.map(t=>`<article class="staff-task-card" data-task-card="${t.id}">
  <div class="staff-task-top"><div><span class="staff-chip ${esc(t.priority)}">${esc(t.priority)} priority</span> <span class="staff-chip ${esc(t.status)}">${esc(t.status.replaceAll("_"," "))}</span><h3>${esc(t.title)}</h3><p>${esc(t.description||"No additional instructions were provided.")}</p><div class="staff-task-meta"><span class="staff-chip">Due: ${t.due_at?esc(new Date(t.due_at).toLocaleString()):"Not specified"}</span></div></div></div>
  <div class="staff-task-actions"><button type="button" class="staff-outline-button" data-toggle-report="${t.id}">Submit work report</button><button type="button" class="staff-outline-button" data-toggle-expense="${t.id}">Add travel / material expense</button></div>
  <form class="staff-report-form" data-task-form="${t.id}" hidden><h4>Work completion report</h4><div class="staff-report-grid">
   <label>Report date<input name="report_date" type="date" value="${today()}" required></label><label>Hours spent<input name="hours_spent" type="number" min="0" max="24" step="0.25" placeholder="e.g. 3.5"></label>
   <label class="wide">Work completed / action taken<textarea name="work_done" required minlength="3" placeholder="Describe what you completed today"></textarea></label>
   <label class="wide">Challenges or pending issues<textarea name="challenges" placeholder="Mention any problems or support required"></textarea></label>
   <label class="wide">Next steps<textarea name="next_steps" placeholder="What remains to be done?"></textarea></label>
   <label class="wide">Current work status<select name="task_status"><option value="in_progress">In progress</option><option value="blocked">Blocked / need help</option><option value="completed">Completed</option></select></label>
   <div class="wide staff-photo-controls"><b>Work site photos</b><button class="staff-outline-button" type="button" data-open-camera>Take site photo</button><input name="camera_photo" type="file" accept="image/*" capture="environment" hidden><small>Camera capture only. Take up to 10 site photos. GPS location is captured automatically with each photo.</small></div>
   <div class="wide staff-photo-preview" data-photo-preview></div><div class="wide staff-location-panel"><div><b>Photo GPS location</b><small data-location-status>GPS will be captured automatically when you take a site photo.</small></div>
   <input type="hidden" name="geo_latitude"><input type="hidden" name="geo_longitude"><input type="hidden" name="geo_accuracy_m"><input type="hidden" name="geo_captured_at"><input type="hidden" name="geo_status" value="not_requested"></div>
  </div><div class="staff-report-actions"><button class="staff-submit" type="submit">Submit work report</button></div><p class="staff-message" role="status"></p></form>
  <form class="staff-expense-form" data-expense-form="${t.id}" hidden><h4>Task expense claim</h4><div class="staff-report-grid">
   <label>Expense category<select name="expense_type" required><option value="travel">Travel charges</option><option value="material">Sourced material purchase</option><option value="other">Other task expense</option></select></label>
   <label>Expense date<input name="expense_date" type="date" value="${today()}" required></label>
   <label class="wide">Expense details<input name="description" required minlength="3" placeholder="e.g. Travel to client site / 2 CCTV cable rolls"></label>
   <label>Vendor / shop / travel provider<input name="vendor_name" placeholder="Optional"></label>
   <label>Payment method<select name="payment_method"><option value="">Select</option><option>Cash</option><option>UPI</option><option>Card</option><option>Personal account</option><option>Company advance</option></select></label>
   <label>Quantity<input name="quantity" type="number" min="0.001" step="0.001" placeholder="e.g. 2"></label>
   <label>Unit<input name="unit" placeholder="km, litre, pcs, metre, box"></label>
   <label>Rate per unit (₹)<input name="unit_rate" type="number" min="0" step="0.01" placeholder="Optional"></label>
   <label>Total amount (₹)<input name="amount" type="number" min="0.01" step="0.01" required placeholder="Enter amount"></label>
   <label class="wide">Bill / receipt attachment<input name="receipts" type="file" accept="image/jpeg,image/png,application/pdf" multiple><small>Attach bill or receipt photos/PDF, up to 5 files and 8 MB each.</small></label>
  </div><div class="staff-report-actions"><button class="staff-submit" type="submit">Submit expense claim</button></div><p class="staff-message" role="status"></p></form>
 </article>`).join(""):'<div class="staff-empty">No work has been assigned to you yet. New assignments will appear here.</div>';
 taskBox.querySelectorAll("[data-toggle-report]").forEach(b=>b.addEventListener("click",()=>{const f=taskBox.querySelector('[data-task-form="'+b.dataset.toggleReport+'"]');f.hidden=!f.hidden;}));
 taskBox.querySelectorAll("[data-toggle-expense]").forEach(b=>b.addEventListener("click",()=>{const f=taskBox.querySelector('[data-expense-form="'+b.dataset.toggleExpense+'"]');f.hidden=!f.hidden;}));
 setupReportForms(taskBox);setupExpenseForms(taskBox);
 if(reportsResult.error){reportBox.innerHTML='<div class="staff-empty">'+esc(reportsResult.error.message)+'</div>';return;}
 const photoLinks={};await Promise.all(reportsCache.flatMap(r=>(r.photo_paths||[]).map(async path=>{const {data}=await supabase.storage.from("task-reports").createSignedUrl(path,3600);if(data?.signedUrl)photoLinks[path]=data.signedUrl;})));
 reportBox.innerHTML=reportsCache.length?reportsCache.map(r=>`<article class="staff-report-card"><div class="staff-task-top"><div><span class="staff-chip ${esc(r.report_status)}">${esc(r.report_status.replaceAll("_"," "))}</span><small> · ${esc(r.report_date)} · ${r.hours_spent??"—"} hours</small><h3>${esc(taskTitle(r.task_id))}</h3><p>${esc(r.work_done)}</p>${r.challenges?'<p><b>Challenges:</b> '+esc(r.challenges)+'</p>':''}${r.manager_feedback?'<p><b>Manager feedback:</b> '+esc(r.manager_feedback)+'</p>':''}${(r.photo_paths||[]).length?'<div class="staff-saved-photos">'+r.photo_paths.map(path=>photoLinks[path]?'<a href="'+esc(photoLinks[path])+'" target="_blank" rel="noopener"><img src="'+esc(photoLinks[path])+'" alt="Uploaded work site photo"></a>':'').join('')+'</div>':''}${r.geo_status==="captured"&&r.geo_latitude!==null?'<p class="staff-geo-info">GPS: '+Number(r.geo_latitude).toFixed(6)+', '+Number(r.geo_longitude).toFixed(6)+' · ±'+Math.round(r.geo_accuracy_m||0)+' m · <a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query='+r.geo_latitude+','+r.geo_longitude+'">View map</a></p>':''}</div></div></article>`).join(""):'<div class="staff-empty">You have not submitted any work reports yet.</div>';
 if(expensesResult.error){expenseBox.innerHTML='<div class="staff-empty">'+esc(expensesResult.error.message)+'</div>';return;}
 const travel=expensesCache.filter(e=>e.expense_type==="travel").reduce((s,e)=>s+Number(e.amount),0),material=expensesCache.filter(e=>e.expense_type==="material").reduce((s,e)=>s+Number(e.amount),0),total=expensesCache.reduce((s,e)=>s+Number(e.amount),0);
 $("staffExpenseSummary").innerHTML='<article class="staff-expense-kpi"><small>Travel charges</small><strong>'+money(travel)+'</strong></article><article class="staff-expense-kpi"><small>Material purchases</small><strong>'+money(material)+'</strong></article><article class="staff-expense-kpi"><small>Total claimed</small><strong>'+money(total)+'</strong></article>';
 const receiptLinks={};await Promise.all(expensesCache.flatMap(e=>(e.receipt_paths||[]).map(async path=>{const {data}=await supabase.storage.from("task-expenses").createSignedUrl(path,3600);if(data?.signedUrl)receiptLinks[path]=data.signedUrl;})));
 expenseBox.innerHTML=expensesCache.length?expensesCache.map(e=>`<article class="staff-report-card"><div class="staff-task-top"><div><span class="staff-expense-type ${esc(e.expense_type)}">${esc(expenseLabel(e.expense_type))}</span> <span class="staff-expense-state ${esc(e.status)}">${esc(e.status.replaceAll("_"," "))}</span><h3>${esc(taskTitle(e.task_id))}</h3><p><b>${esc(e.description)}</b></p><p>${esc(e.expense_date)} · ${esc(e.vendor_name||"No vendor specified")} · ${money(e.amount)}</p>${e.quantity?'<small>Quantity: '+esc(e.quantity)+' '+esc(e.unit||'')+(e.unit_rate?' · Rate: '+money(e.unit_rate):'')+'</small>':''}${e.payment_method?'<p>Payment: '+esc(e.payment_method)+'</p>':''}${e.manager_feedback?'<p><b>Manager feedback:</b> '+esc(e.manager_feedback)+'</p>':''}${(e.receipt_paths||[]).length?'<div class="staff-expense-receipts">'+e.receipt_paths.map((p,i)=>receiptLinks[p]?'<a href="'+esc(receiptLinks[p])+'" target="_blank" rel="noopener">View receipt '+(i+1)+'</a>':'').join('')+'</div>':''}</div></div></article>`).join(""):'<div class="staff-empty">No expense claims submitted yet. Open an assignment and select “Add travel / material expense”.</div>';
}
function setupReportForms(taskBox){
 taskBox.querySelectorAll("[data-task-form]").forEach(form=>{
  const cameraInput=form.querySelector('[name="camera_photo"]'),preview=form.querySelector("[data-photo-preview]"),locationStatus=form.querySelector("[data-location-status]");
  form.__selectedPhotos=[];
  const renderPhotoPreviews=()=>{preview.innerHTML=form.__selectedPhotos.map((f,i)=>'<span class="staff-photo-thumb"><img src="'+URL.createObjectURL(f)+'" alt="Site photo '+(i+1)+'"><small>Site photo '+(i+1)+'</small></span>').join("");};
  form.querySelector("[data-open-camera]").addEventListener("click",()=>{if(form.__selectedPhotos.length>=10){locationStatus.textContent="Maximum 10 site photos reached.";return;}cameraInput.click();});
  cameraInput.addEventListener("change",()=>{const photo=cameraInput.files&&cameraInput.files[0];cameraInput.value="";if(!photo)return;
   if(!["image/jpeg","image/png"].includes(photo.type)||photo.size>8*1024*1024){locationStatus.textContent="Photo must be JPG or PNG and no larger than 8 MB.";return;}
   if(form.__selectedPhotos.length>=10){locationStatus.textContent="Maximum 10 site photos reached.";return;}
   const geoStatus=form.querySelector('[name="geo_status"]');if(!navigator.geolocation){geoStatus.value="unavailable";locationStatus.textContent="GPS is required. Enable location services to save a site photo.";return;}
   locationStatus.textContent="Checking GPS before saving the site photo…";
   navigator.geolocation.getCurrentPosition(pos=>{form.querySelector('[name="geo_latitude"]').value=pos.coords.latitude;form.querySelector('[name="geo_longitude"]').value=pos.coords.longitude;form.querySelector('[name="geo_accuracy_m"]').value=pos.coords.accuracy;form.querySelector('[name="geo_captured_at"]').value=new Date(pos.timestamp).toISOString();geoStatus.value="captured";form.__selectedPhotos.push(photo);renderPhotoPreviews();locationStatus.textContent="Photo saved with GPS · ±"+Math.round(pos.coords.accuracy)+" m · "+pos.coords.latitude.toFixed(6)+", "+pos.coords.longitude.toFixed(6);},
   err=>{geoStatus.value=err.code===1?"denied":"unavailable";locationStatus.textContent=err.code===1?"GPS permission denied. Allow location access and retake the photo.":"GPS unavailable. Turn on phone location and retake the photo.";},{enableHighAccuracy:true,timeout:20000,maximumAge:0});
  });
  form.addEventListener("submit",async e=>{
   e.preventDefault();const fd=new FormData(form),button=form.querySelector('button[type="submit"]'),message=form.querySelector(".staff-message"),taskId=form.dataset.taskForm,work=String(fd.get("work_done")||"").trim();
   if(work.length<3){message.textContent="Please describe the work completed.";return;}button.disabled=true;button.textContent="Submitting…";
   const status=String(fd.get("task_status")||"in_progress");
   const report={organization_id:currentOrg.id,task_id:taskId,submitted_by:currentUser.id,report_date:String(fd.get("report_date")),work_done:work,hours_spent:fd.get("hours_spent")?Number(fd.get("hours_spent")):null,challenges:String(fd.get("challenges")||"").trim()||null,next_steps:String(fd.get("next_steps")||"").trim()||null,task_status:status,photo_paths:[],geo_latitude:fd.get("geo_latitude")?Number(fd.get("geo_latitude")):null,geo_longitude:fd.get("geo_longitude")?Number(fd.get("geo_longitude")):null,geo_accuracy_m:fd.get("geo_accuracy_m")?Number(fd.get("geo_accuracy_m")):null,geo_captured_at:fd.get("geo_captured_at")||null,geo_status:String(fd.get("geo_status")||"not_requested")};
   const {data:created,error}=await supabase.from("task_reports").insert(report).select("id").single();
   if(error){message.textContent="Report could not be submitted: "+error.message;button.disabled=false;button.textContent="Submit work report";return;}
   const photos=form.__selectedPhotos,uploaded=[];try{for(let i=0;i<photos.length;i++){const p=photos[i],path=currentOrg.id+"/task-reports/"+created.id+"/"+currentUser.id+"/"+crypto.randomUUID()+"-"+(p.name||("site-"+(i+1)+".jpg")).replace(/[^a-zA-Z0-9._-]/g,"_").slice(-80);const {error:upErr}=await supabase.storage.from("task-reports").upload(path,p,{contentType:p.type,upsert:false});if(upErr)throw upErr;uploaded.push(path);}}
   catch(err){message.textContent="Report saved, but a photo upload failed: "+err.message;button.disabled=false;button.textContent="Submit work report";return;}
   if(uploaded.length){const {error:pathErr}=await supabase.from("task_reports").update({photo_paths:uploaded}).eq("id",created.id).eq("organization_id",currentOrg.id);if(pathErr){message.textContent="Report saved, but photo links could not be attached: "+pathErr.message;button.disabled=false;button.textContent="Submit work report";return;}}
   const {error:taskErr}=await supabase.from("tasks").update({status}).eq("id",taskId).eq("organization_id",currentOrg.id).eq("assigned_to",currentUser.id);
   const state=await window.BizFoxOffline?.getStatus();message.textContent=taskErr?"Report saved, but task status could not be updated: "+taskErr.message:(state?.pending?"Saved on this device. Report and photos will sync when network returns.":"Work report submitted successfully.");message.style.color=taskErr?"#b34a38":"#21734a";button.disabled=false;button.textContent="Submit work report";if(!taskErr)await renderStaffWorkspace();
  });
 });
}
function setupExpenseForms(taskBox){
 taskBox.querySelectorAll("[data-expense-form]").forEach(form=>form.addEventListener("submit",async e=>{
  e.preventDefault();const fd=new FormData(form),button=form.querySelector('button[type="submit"]'),message=form.querySelector(".staff-message"),taskId=form.dataset.expenseForm;
  const amount=Number(fd.get("amount")),description=String(fd.get("description")||"").trim(),files=Array.from(fd.getAll("receipts")).filter(x=>x instanceof File&&x.size);
  if(!description||description.length<3||!Number.isFinite(amount)||amount<=0){message.textContent="Enter valid expense details and amount.";return;}
  if(files.length>5||files.some(f=>f.size>8*1024*1024||!["image/jpeg","image/png","application/pdf"].includes(f.type))){message.textContent="Attach up to 5 JPG, PNG or PDF receipts, each no larger than 8 MB.";return;}
  button.disabled=true;button.textContent="Submitting claim…";
  const id=crypto.randomUUID(),paths=files.map((f,i)=>currentOrg.id+"/expenses/"+id+"/"+currentUser.id+"/"+crypto.randomUUID()+"-"+(f.name||("receipt-"+(i+1))).replace(/[^a-zA-Z0-9._-]/g,"_").slice(-80));
  const record={id,organization_id:currentOrg.id,task_id:taskId,submitted_by:currentUser.id,expense_date:String(fd.get("expense_date")),expense_type:String(fd.get("expense_type")),description,vendor_name:String(fd.get("vendor_name")||"").trim()||null,quantity:fd.get("quantity")?Number(fd.get("quantity")):null,unit:String(fd.get("unit")||"").trim()||null,unit_rate:fd.get("unit_rate")?Number(fd.get("unit_rate")):null,amount,payment_method:String(fd.get("payment_method")||"")||null,receipt_paths:paths,status:"pending_review"};
  const {error}=await supabase.from("task_expenses").insert(record);
  if(error){message.textContent="Expense claim could not be saved: "+error.message;button.disabled=false;button.textContent="Submit expense claim";return;}
  try{for(let i=0;i<files.length;i++){const {error:upErr}=await supabase.storage.from("task-expenses").upload(paths[i],files[i],{contentType:files[i].type,upsert:false});if(upErr)throw upErr;}}
  catch(err){message.textContent="Claim saved, but a receipt upload failed: "+err.message+"; contact your manager.";button.disabled=false;button.textContent="Submit expense claim";return;}
  const state=await window.BizFoxOffline?.getStatus();message.textContent=state?.pending?"Claim and receipts saved locally; they will sync when network returns.":"Expense claim submitted for manager approval.";message.style.color="#21734a";button.disabled=false;button.textContent="Submit expense claim";form.reset();await renderStaffWorkspace();showPage("expenses");
 }));
}
function updateStaffNetworkStatus(){const el=$("staffNetworkStatus");if(!el)return;const state=window.BizFoxOfflineState||{online:navigator.onLine,pending:0};el.textContent=!state.online?"Offline · "+state.pending+" waiting":state.failed?"Sync failed · "+state.failed:state.pending?"Syncing · "+state.pending:"Online · Synced";}
function setupStaffNotifications(){if(!currentUser||window.bizFoxStaffAlertChannel)return;try{window.bizFoxStaffAlertChannel=supabase.channel("bizfox-staff-alerts-"+currentUser.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"tasks",filter:"assigned_to=eq."+currentUser.id},payload=>window.BizFoxOffline?.notify("New work assigned",payload.new?.title||"A new task has been assigned.")).on("postgres_changes",{event:"UPDATE",schema:"public",table:"tasks",filter:"assigned_to=eq."+currentUser.id},payload=>window.BizFoxOffline?.notify("Assignment updated",payload.new?.title||"Your work assignment changed.")).subscribe();}catch(error){console.warn("Staff notifications unavailable",error);}}
window.addEventListener("bizfox:syncstate",updateStaffNetworkStatus);
window.addEventListener("bizfox:online",()=>setTimeout(()=>{if(currentUser&&currentOrg)renderStaffWorkspace();},1200));
window.addEventListener("bizfox:synccomplete",()=>{if(currentUser&&currentOrg)renderStaffWorkspace();});
window.addEventListener("online",updateStaffNetworkStatus);window.addEventListener("offline",updateStaffNetworkStatus);
$("staffEnableNotifications").addEventListener("click",async()=>{const enabled=await window.BizFoxOffline?.enableNotifications();if(enabled)window.BizFoxOffline?.notify("Biz FOX ERP","Staff notifications are enabled.");else showAuthMessage("Allow notifications in your phone settings.");});
$("staffRefresh").addEventListener("click",renderStaffWorkspace);$("staffExpenseRefresh").addEventListener("click",renderStaffWorkspace);
$("staffProfileToggle").addEventListener("click",()=>{const card=$("staffProfileCard");card.hidden=!card.hidden;});
$("staffSignOut").addEventListener("click",async()=>{await supabase.auth.signOut();location.replace("./staff.html");});
$("staffNoAccessSignOut").addEventListener("click",async()=>{await supabase.auth.signOut();location.reload();});
supabase.auth.onAuthStateChange(event=>{if(event==="SIGNED_OUT"){currentUser=null;currentOrg=null;portal.hidden=true;noAccess.hidden=true;authPanel.hidden=false;}});
const {data:{session}}=await supabase.auth.getSession();if(session)await boot(session.user);
document.getElementById("staffAppUpdate").addEventListener("click",()=>{if(window.BizFoxAndroid?.checkForUpdates){window.BizFoxAndroid.checkForUpdates();return;}window.open("https://github.com/digitalfoxstudios/biz-fox-erp/releases/latest","_blank","noopener");});
