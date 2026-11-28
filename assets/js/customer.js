import { supabase } from "./supabase.js";
import { initNotificationCenter } from "./notifications.js";
import { initMessaging } from "./messaging.js";
const $=id=>document.getElementById(id);
const content=$("customerContent"),title=$("customerPageTitle");
let customer=null,quotes=[],invoices=[];
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=value=>"₹"+Number(value||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
function setTab(tab){
 document.querySelectorAll("[data-customer-tab]").forEach(b=>b.classList.toggle("active",b.dataset.customerTab===tab));
 $("customerSidebar")?.classList.remove("open");
 title.textContent=({overview:"Overview",quotations:"My quotations",invoices:"My invoices"})[tab]||"Overview";
 if(tab==="quotations")renderDocuments("quotations");
 else if(tab==="invoices")renderDocuments("invoices");
 else renderOverview();
}
function renderOverview(){
 const outstanding=invoices.reduce((sum,row)=>sum+Math.max(0,Number(row.grand_total||0)-Number(row.amount_paid||0)),0);
 content.innerHTML=`<section class="welcome"><div><span class="eyebrow">WELCOME TO YOUR CUSTOMER PORTAL</span><h2>${esc(customer.customer_name)}</h2><p>View your quotations, invoices and account information in one secure place.</p></div><span class="welcome-icon">◈</span></section>
 <div class="stats-grid"><article class="stat-card"><span class="stat-icon blue">▤</span><p>Quotations</p><strong>${quotes.length}</strong><small>Your business proposals</small></article><article class="stat-card"><span class="stat-icon green">₹</span><p>Invoices</p><strong>${invoices.length}</strong><small>Billing documents</small></article><article class="stat-card"><span class="stat-icon amber">◷</span><p>Outstanding</p><strong>${money(outstanding)}</strong><small>Balance due</small></article><article class="stat-card"><span class="stat-icon violet">♙</span><p>Account</p><strong>Active</strong><small>Customer access</small></article></div>
 <section class="dashboard-panel"><div class="panel-heading"><div><h3>Recent invoices</h3><p>Your latest billing records</p></div><button class="text-action" data-customer-tab="invoices">View all →</button></div>${invoices.length?invoiceRows(invoices.slice(0,5)):'<p class="staff-empty">No invoices are linked to your account yet.</p>'}</section>
 <section class="dashboard-panel"><div class="panel-heading"><div><h3>Account details</h3><p>Contact information registered by the company</p></div></div><div class="profile-details"><div class="profile-detail"><small>Customer code</small><strong>${esc(customer.customer_code)}</strong></div><div class="profile-detail"><small>Email</small><strong>${esc(customer.email||"Not provided")}</strong></div><div class="profile-detail"><small>Phone</small><strong>${esc(customer.phone||"Not provided")}</strong></div><div class="profile-detail"><small>Billing address</small><strong>${esc(customer.billing_address||"Not provided")}</strong></div></div></section>`;
 bindTabs();
}
function invoiceRows(rows){return '<div class="table-wrap"><table><thead><tr><th>Invoice</th><th>Date</th><th>Total</th><th>Paid</th><th>Status</th></tr></thead><tbody>'+rows.map(row=>'<tr><td>'+esc(row.invoice_number)+'</td><td>'+esc(row.invoice_date)+'</td><td>'+money(row.grand_total)+'</td><td>'+money(row.amount_paid)+'</td><td>'+esc(row.payment_status?.replaceAll("_"," ")||"unpaid")+'</td></tr>').join("")+'</tbody></table></div>';}
function renderDocuments(type){
 const isInvoice=type==="invoices",rows=isInvoice?invoices:quotes;
 title.textContent=isInvoice?"My invoices":"My quotations";
 content.innerHTML='<section class="dashboard-panel"><div class="panel-heading"><div><h2>'+title.textContent+'</h2><p>Documents issued by your service provider</p></div><button class="secondary-button" id="customerRefresh">Refresh</button></div>'+(rows.length?(isInvoice?invoiceRows(rows):'<div class="table-wrap"><table><thead><tr><th>Quotation</th><th>Date</th><th>Valid until</th><th>Amount</th><th>Status</th></tr></thead><tbody>'+rows.map(row=>'<tr><td>'+esc(row.quotation_number)+'</td><td>'+esc(row.quotation_date)+'</td><td>'+esc(row.valid_until||"—")+'</td><td>'+money(row.grand_total)+'</td><td>'+esc(row.status)+'</td></tr>').join("")+'</tbody></table></div>'):'<p class="staff-empty">No '+(isInvoice?"invoices":"quotations")+' are linked to your account yet.</p>')+'</section>';
 $("customerRefresh").addEventListener("click",loadCustomerData);
}
function bindTabs(){document.querySelectorAll("[data-customer-tab]").forEach(button=>button.onclick=()=>setTab(button.dataset.customerTab));}
async function loadCustomerData(){
 const [q,i]=await Promise.all([
  supabase.from("quotations").select("id,quotation_number,quotation_date,valid_until,grand_total,status").eq("customer_id",customer.id).order("quotation_date",{ascending:false}),
  supabase.from("invoices").select("id,invoice_number,invoice_date,due_date,grand_total,amount_paid,payment_status").eq("customer_id",customer.id).order("invoice_date",{ascending:false})
 ]);
 if(q.error||i.error){content.innerHTML='<div class="empty-page"><h2>Could not load account records</h2><p>'+esc(q.error?.message||i.error?.message)+'</p></div>';return;}
 quotes=q.data||[];invoices=i.data||[];setTab("overview");
}
$("customerMenuToggle").addEventListener("click",()=>document.querySelector(".customer-shell .sidebar").classList.toggle("open"));
$("customerSignOut").addEventListener("click",async()=>{await supabase.auth.signOut();location.replace("./login.html");});
const {data:{session}}=await supabase.auth.getSession();
if(!session){location.replace("./login.html");}
else{
 const {data,error}=await supabase.from("customers").select("id,organization_id,customer_code,customer_name,email,phone,billing_address").eq("user_id",session.user.id).maybeSingle();
 if(error||!data){await supabase.auth.signOut();location.replace("./login.html");}
 else{customer=data;initNotificationCenter({user:session.user,organizationId:customer.organization_id,mount:document.querySelector(".customer-shell .top-actions")});initMessaging({user:session.user,organizationId:customer.organization_id,role:"customer",customer,mount:document.querySelector(".customer-shell .top-actions")});await loadCustomerData();}
}
supabase.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT")location.replace("./login.html");});
