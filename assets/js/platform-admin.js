import { supabase } from "./supabase.js";
const $=id=>document.getElementById(id);
const message=(id,text,kind="")=>{const el=$(id);el.textContent=text;el.dataset.kind=kind;};
async function guard(){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session){location.replace("./login.html");return false;}
 const {data,error}=await supabase.from("platform_super_admins").select("id,email").eq("user_id",session.user.id).maybeSingle();
 if(error||!data){await supabase.auth.signOut();location.replace("./login.html");return false;}
 return true;
}
async function loadPlans(){
 const {data,error}=await supabase.from("platform_subscription_plans").select("code,name").eq("is_active",true).order("monthly_price");
 if(error)throw error;
 $("planSelect").innerHTML=(data||[]).map(p=>'<option value="'+p.code+'">'+p.name+'</option>').join("");
}
async function loadTenants(){
 const {data,error}=await supabase.rpc("platform_list_tenants");
 if(error)throw error;
 const rows=data||[];
 $("totalTenants").textContent=rows.length;
 $("activeTenants").textContent=rows.filter(x=>x.account_status==="active").length;
 $("trialTenants").textContent=rows.filter(x=>x.account_status==="trial").length;
 $("tenantRows").innerHTML=rows.length?rows.map(t=>'<tr><td><strong>'+escapeHtml(t.name)+'</strong><br><span class="platform-muted">'+escapeHtml(t.slug)+'</span></td><td>'+escapeHtml(t.plan_name||"—")+'</td><td>'+escapeHtml(t.billing_email||"—")+'</td><td>'+t.member_count+'</td><td><span class="platform-pill">'+escapeHtml(t.account_status)+'</span></td><td><select aria-label="Change status for '+escapeHtml(t.name)+'" data-status="'+t.id+'"><option value="">Change…</option>'+["trial","active","suspended","cancelled"].map(s=>'<option value="'+s+'" '+(s===t.account_status?"selected":"")+'>'+s+'</option>').join("")+'</select></td></tr>').join(""):'<tr><td colspan="6">No business accounts have been created.</td></tr>';
 $("tenantRows").querySelectorAll("[data-status]").forEach(el=>el.addEventListener("change",async()=>{if(!el.value)return;el.disabled=true;const {error}=await supabase.rpc("platform_set_tenant_status",{p_tenant_id:el.dataset.status,p_status:el.value});if(error){message("listMessage",error.message,"error");el.disabled=false;return;}message("listMessage","Business status updated.");await loadTenants();}));
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
$("tenantForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget;$("createTenant").disabled=true;message("tenantMessage","Creating business account…");const {data,error}=await supabase.rpc("platform_create_tenant",{p_name:f.elements.name.value.trim(),p_slug:f.elements.slug.value.trim().toLowerCase(),p_owner_email:f.elements.email.value.trim().toLowerCase(),p_plan_code:f.elements.plan.value});$("createTenant").disabled=false;if(error){message("tenantMessage",error.message,"error");return;}message("tenantMessage","Business account created. The owner has been assigned the Owner role.");f.reset();await loadTenants();});
$("refresh").addEventListener("click",async()=>{try{await loadTenants();message("listMessage","Business list refreshed.");}catch(e){message("listMessage",e.message,"error");}});
$("signOut").addEventListener("click",async()=>{await supabase.auth.signOut();location.replace("./login.html");});
if(await guard()){try{await loadPlans();await loadTenants();}catch(e){message("listMessage",e.message,"error");}}
