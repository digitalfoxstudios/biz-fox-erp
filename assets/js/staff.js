import { supabase } from "./supabase.js";
const $=id=>document.getElementById(id);
const authPanel=$("staffAuth"),portal=$("staffPortal"),noAccess=$("staffNoAccess");
let currentUser=null,currentOrg=null,staffOrganizations=[];
const esc=v=>String(v??"").replace(/[&<>"\']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","\'":"&#39;"}[c]));
const showAuthMessage=(message,kind="error")=>{const el=$("staffAuthMessage");el.textContent=message;el.style.color=kind==="success"?"#21734a":"#b34a38";};
$("staffAuthForm").addEventListener("submit",async e=>{
 e.preventDefault();const fd=new FormData(e.currentTarget),button=$("staffAuthSubmit");
 const username=String(fd.get("username")||"").trim().toLowerCase(),password=String(fd.get("password")||"");
 if(!/^[a-z0-9._-]{3,32}$/.test(username)){showAuthMessage("Enter a valid username.");return;}
 if(!/^[0-9]{8}$/.test(password)){showAuthMessage("Password must contain exactly 8 digits.");return;}
 button.disabled=true;button.textContent="Signing in…";
 let result;
 try{result=await supabase.auth.signInWithPassword({email:username+"@staff.bizfox.invalid",password});}
 catch(error){button.disabled=false;button.textContent="Sign in";showAuthMessage("Could not connect. Check your internet connection and try again.");return;}
 button.disabled=false;button.textContent="Sign in";
 if(result.error){showAuthMessage("Incorrect username or password. Contact your administrator if you need new credentials.");return;}
 if(result.data.session)await boot(result.data.session.user);
});
async function boot(user){
 currentUser=user;authPanel.hidden=true;portal.hidden=true;noAccess.hidden=true;
 setupStaffNotifications();updateStaffNetworkStatus();
 const {data:members,error}=await supabase.from("organization_members").select("organization_id,role,status").eq("user_id",user.id).eq("status","active");
 if(error){showNoAccess("Could not check your staff access: "+error.message);return;}
 const allowed=(members||[]).filter(m=>m.role==="staff");
 if(!allowed.length){showNoAccess();return;}
 const ids=allowed.map(m=>m.organization_id);
 const {data:orgs,error:orgError}=await supabase.from("organizations").select("id,name").in("id",ids).order("name");
 if(orgError||!orgs?.length){showNoAccess("Your organization could not be loaded. Contact your office manager.");return;}
 staffOrganizations=orgs;currentOrg=orgs[0];
 portal.hidden=false;$("staffGreeting").textContent="My assignments";$("staffOrgName").textContent=currentOrg.name+" · Employee workspace";
 $("staffProfileName").textContent=user.user_metadata?.full_name||user.user_metadata?.name||((user.email||"employee@staff.bizfox.invalid").split("@")[0]);
 $("staffProfileDetails").textContent="Username: "+((user.email||"").split("@")[0])+" · Role: Employee · Company: "+currentOrg.name;
 await renderStaffWorkspace();
}
function showNoAccess(message="Your staff login is not linked to an active employee record. Ask the administrator to create your employee record and issue your username and password."){
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
 taskBox.innerHTML=tasks.length?tasks.map(t=>`<article class="staff-task-card"><div class="staff-task-top"><div><span class="staff-chip ${esc(t.priority)}">${esc(t.priority)} priority</span> <span class="staff-chip ${esc(t.status)}">${esc(t.status.replaceAll("_"," "))}</span><h3>${esc(t.title)}</h3><p>${esc(t.description||"No additional instructions were provided.")}</p><div class="staff-task-meta"><span class="staff-chip">Due: ${t.due_at?esc(new Date(t.due_at).toLocaleString()):"Not specified"}</span></div></div></div><form class="staff-report-form" data-task-form="${t.id}"><h4>Submit work report</h4><div class="staff-report-grid"><label>Report date<input name="report_date" type="date" value="${new Date().toISOString().slice(0,10)}" required></label><label>Hours spent<input name="hours_spent" type="number" min="0" max="24" step="0.25" placeholder="e.g. 3.5"></label><label class="wide">Work completed / action taken<textarea name="work_done" required minlength="3" placeholder="Describe what you completed today"></textarea></label><label class="wide">Challenges or pending issues<textarea name="challenges" placeholder="Mention any problems or support required"></textarea></label><label class="wide">Next steps<textarea name="next_steps" placeholder="What remains to be done?"></textarea></label><label class="wide">Current work status<select name="task_status"><option value="in_progress">In progress</option><option value="blocked">Blocked / need help</option><option value="completed">Completed</option></select></label><div class="wide staff-photo-controls"><b>Work site photos</b><button class="staff-outline-button" type="button" data-open-camera>Take site photo</button><input name="camera_photo" type="file" accept="image/*" capture="environment" hidden><small>Camera capture only. Take up to 10 site photos. GPS location is captured automatically with each photo.</small></div><div class="wide staff-photo-preview" data-photo-preview></div><div class="wide staff-location-panel"><div><b>Photo GPS location</b><small data-location-status>GPS will be captured automatically when you take a site photo.</small></div><input type="hidden" name="geo_latitude"><input type="hidden" name="geo_longitude"><input type="hidden" name="geo_accuracy_m"><input type="hidden" name="geo_captured_at"><input type="hidden" name="geo_status" value="not_requested"></div></div><div class="staff-report-actions"><button class="staff-submit" type="submit">Submit work report</button></div><p class="staff-message" role="status"></p></form></article>`).join(""):'<div class="staff-empty">No work has been assigned to you yet. New assignments will appear here.</div>';
 taskBox.querySelectorAll("[data-task-form]").forEach(form=>{
  const cameraInput=form.querySelector('[name="camera_photo"]'),preview=form.querySelector("[data-photo-preview]"),locationStatus=form.querySelector("[data-location-status]");
  form.__form.__selectedPhotos=[];
  const renderPhotoPreviews=()=>{preview.innerHTML=form.__selectedPhotos.map((f,i)=>'<span class="staff-photo-thumb"><img src="'+URL.createObjectURL(f)+'" alt="Site photo '+(i+1)+'"><small>Site photo '+(i+1)+'</small></span>').join("");};
  form.querySelector("[data-open-camera]").addEventListener("click",()=>{if(form.__selectedPhotos.length>=10){locationStatus.textContent="Maximum 10 site photos reached.";return;}cameraInput.click();});
  cameraInput.addEventListener("change",()=>{
   const photo=cameraInput.files&&cameraInput.files[0];cameraInput.value="";
   if(!photo)return;
   if(!["image/jpeg","image/png"].includes(photo.type)||photo.size>8*1024*1024){locationStatus.textContent="Photo must be JPG or PNG and no larger than 8 MB.";return;}
   if(form.__selectedPhotos.length>=10){locationStatus.textContent="Maximum 10 site photos reached.";return;}
   const geoStatus=form.querySelector('[name="geo_status"]');
   if(!navigator.geolocation){geoStatus.value="unavailable";locationStatus.textContent="GPS is required. Enable location services to save a site photo.";return;}
   locationStatus.textContent="Checking GPS before saving the site photo…";
   navigator.geolocation.getCurrentPosition(pos=>{
    form.querySelector('[name="geo_latitude"]').value=pos.coords.latitude;
    form.querySelector('[name="geo_longitude"]').value=pos.coords.longitude;
    form.querySelector('[name="geo_accuracy_m"]').value=pos.coords.accuracy;
    form.querySelector('[name="geo_captured_at"]').value=new Date(pos.timestamp).toISOString();
    geoStatus.value="captured";
    form.__selectedPhotos.push(photo);renderPhotoPreviews();
    locationStatus.textContent="Photo saved with GPS · ±"+Math.round(pos.coords.accuracy)+" m · "+pos.coords.latitude.toFixed(6)+", "+pos.coords.longitude.toFixed(6);
   },err=>{
    geoStatus.value=err.code===1?"denied":"unavailable";
    locationStatus.textContent=err.code===1?"GPS permission denied. Allow location access and retake the photo.":"GPS unavailable. Turn on phone location and retake the photo.";
   },{enableHighAccuracy:true,timeout:20000,maximumAge:0});
  });

 });
 taskBox.querySelectorAll("[data-task-form]").forEach(form=>form.addEventListener("submit",async e=>{
  e.preventDefault();const fd=new FormData(form),button=form.querySelector("button[type=submit]"),message=form.querySelector(".staff-message"),taskId=form.dataset.taskForm;
  const work=String(fd.get("work_done")||"").trim();if(work.length<3){message.textContent="Please describe the work completed.";return;}
  button.disabled=true;button.textContent="Submitting…";
  const status=String(fd.get("task_status")||"in_progress");
  const report={organization_id:currentOrg.id,task_id:taskId,submitted_by:currentUser.id,report_date:String(fd.get("report_date")),work_done:work,hours_spent:fd.get("hours_spent")?Number(fd.get("hours_spent")):null,challenges:String(fd.get("challenges")||"").trim()||null,next_steps:String(fd.get("next_steps")||"").trim()||null,task_status:status};
  report.photo_paths=[];
  report.geo_latitude=fd.get("geo_latitude")?Number(fd.get("geo_latitude")):null;
  report.geo_longitude=fd.get("geo_longitude")?Number(fd.get("geo_longitude")):null;
  report.geo_accuracy_m=fd.get("geo_accuracy_m")?Number(fd.get("geo_accuracy_m")):null;
  report.geo_captured_at=fd.get("geo_captured_at")||null;
  report.geo_status=String(fd.get("geo_status")||"not_requested");
  const {data:createdReport,error:reportError}=await supabase.from("task_reports").insert(report).select("id").single();
  if(reportError){message.textContent="Report could not be submitted: "+reportError.message;button.disabled=false;button.textContent="Submit work report";return;}
  const photos=form.__selectedPhotos,uploadedPaths=[];
  try{
   for(let i=0;i<photos.length;i++){
    const photo=photos[i],safeName=photo.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-90)||("site-"+(i+1)+".jpg");
    const path=currentOrg.id+"/task-reports/"+createdReport.id+"/"+currentUser.id+"/"+crypto.randomUUID()+"-"+safeName;
    const {error:uploadError}=await supabase.storage.from("task-reports").upload(path,photo,{contentType:photo.type,upsert:false});
    if(uploadError)throw uploadError;uploadedPaths.push(path);
   }
  }catch(uploadError){
   message.textContent="Report saved, but a photo could not upload: "+uploadError.message+". Please contact your manager; the report is saved without all photos.";
   button.disabled=false;button.textContent="Submit work report";return;
  }
  if(uploadedPaths.length){
   const {error:pathError}=await supabase.from("task_reports").update({photo_paths:uploadedPaths}).eq("id",createdReport.id).eq("organization_id",currentOrg.id);
   if(pathError){message.textContent="Report saved, but photo links could not be attached: "+pathError.message;button.disabled=false;button.textContent="Submit work report";return;}
  }
  const {error:taskError}=await supabase.from("tasks").update({status}).eq("id",taskId).eq("organization_id",currentOrg.id).eq("assigned_to",currentUser.id);
  const syncState=await window.BizFoxOffline?.getStatus();
  message.textContent=taskError?"Report saved, but task status could not be updated: "+taskError.message:(syncState?.pending?"Saved on this device. Report and photos will sync automatically when the network returns.":"Work report submitted successfully.");
  message.style.color=taskError?"#b34a38":"#21734a";
  button.disabled=false;button.textContent="Submit work report";
  if(!taskError)await renderStaffWorkspace();
 }));
 if(reportsResult.error){reportBox.innerHTML='<div class="staff-empty">'+esc(reportsResult.error.message)+'</div>';return;}
 const photoLinks={};await Promise.all(reports.flatMap(r=>(r.photo_paths||[]).map(async path=>{const {data}=await supabase.storage.from("task-reports").createSignedUrl(path,3600);if(data?.signedUrl)photoLinks[path]=data.signedUrl;})));
 reportBox.innerHTML=reports.length?reports.map(r=>`<article class="staff-report-card"><div class="staff-task-top"><div><span class="staff-chip ${esc(r.report_status)}">${esc(r.report_status.replaceAll("_"," "))}</span><small> · ${esc(r.report_date)} · ${r.hours_spent??"—"} hours</small><p>${esc(r.work_done)}</p>${r.challenges?'<p><b>Challenges:</b> '+esc(r.challenges)+'</p>':''}${r.manager_feedback?'<p><b>Manager feedback:</b> '+esc(r.manager_feedback)+'</p>':''}${(r.photo_paths||[]).length?'<div class="staff-saved-photos">'+r.photo_paths.map(path=>photoLinks[path]?'<a href="'+esc(photoLinks[path])+'" target="_blank" rel="noopener"><img src="'+esc(photoLinks[path])+'" alt="Uploaded work site photo"></a>':'').join('')+'</div>':''}${r.geo_status==="captured"&&r.geo_latitude!==null?'<p class="staff-geo-info">GPS: '+Number(r.geo_latitude).toFixed(6)+', '+Number(r.geo_longitude).toFixed(6)+' · ±'+Math.round(r.geo_accuracy_m||0)+' m · <a target="_blank" rel="noopener" href="https://www.google.com/maps?q='+r.geo_latitude+','+r.geo_longitude+'">View map</a></p>':''}</div></div></article>`).join(""):'<div class="staff-empty">You have not submitted any work reports yet.</div>';
}
function updateStaffNetworkStatus(){const el=$("staffNetworkStatus");if(!el)return;const state=window.BizFoxOfflineState||{online:navigator.onLine,pending:0};el.textContent=!state.online?("Offline · "+state.pending+" waiting"):state.failed?("Sync failed · "+state.failed):state.pending?("Syncing · "+state.pending):"Online · Synced";}
function setupStaffNotifications(){if(!currentUser||window.bizFoxStaffAlertChannel)return;try{window.bizFoxStaffAlertChannel=supabase.channel("bizfox-staff-alerts-"+currentUser.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"tasks",filter:"assigned_to=eq."+currentUser.id},payload=>window.BizFoxOffline?.notify("New work assigned",payload.new?.title||"A new task has been assigned.")).on("postgres_changes",{event:"UPDATE",schema:"public",table:"tasks",filter:"assigned_to=eq."+currentUser.id},payload=>window.BizFoxOffline?.notify("Assignment updated",payload.new?.title||"Your work assignment changed.")).subscribe();}catch(error){console.warn("Staff notifications unavailable",error);}}
window.addEventListener("bizfox:syncstate",updateStaffNetworkStatus);
window.addEventListener("bizfox:online",()=>setTimeout(()=>{if(currentUser&&currentOrg)renderStaffWorkspace();},1200));
window.addEventListener("bizfox:synccomplete",()=>{if(currentUser&&currentOrg)renderStaffWorkspace();});window.addEventListener("online",updateStaffNetworkStatus);window.addEventListener("offline",updateStaffNetworkStatus);
$("staffEnableNotifications").addEventListener("click",async()=>{const enabled=await window.BizFoxOffline?.enableNotifications();if(enabled)window.BizFoxOffline?.notify("Biz FOX ERP","Staff notifications are enabled.");else showAuthMessage("Allow notifications in your phone settings.","error");});
$("staffRefresh").addEventListener("click",renderStaffWorkspace);
$("staffProfileToggle").addEventListener("click",()=>{const card=$("staffProfileCard"),open=card.hidden;card.hidden=!open;$("staffProfileToggle").setAttribute("aria-expanded",String(open));});
$("staffSignOut").addEventListener("click",async()=>{await supabase.auth.signOut();location.replace("./login.html");});
$("staffNoAccessSignOut").addEventListener("click",async()=>{await supabase.auth.signOut();location.reload();});
supabase.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT"){currentUser=null;currentOrg=null;portal.hidden=true;noAccess.hidden=true;authPanel.hidden=false;}});
const {data:{session}}=await supabase.auth.getSession();
if(session)await boot(session.user);

document.getElementById("staffAppUpdate").addEventListener("click",()=>{
 if(window.BizFoxAndroid?.checkForUpdates){window.BizFoxAndroid.checkForUpdates();return;}
 window.open("https://github.com/digitalfoxstudios/biz-fox-erp/releases/latest","_blank","noopener");
});
