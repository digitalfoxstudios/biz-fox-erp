import {supabase} from "./supabase.js";
const form=document.getElementById("companySetupForm"),button=document.getElementById("setupSubmit"),message=document.getElementById("setupMessage");
const setMessage=(value,kind="")=>{message.textContent=value;message.className="form-message "+kind;};
const slugify=value=>value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80);
const {data:{session}}=await supabase.auth.getSession();
if(!session){location.replace("./login.html");}
else{
 const {data:admin}=await supabase.from("platform_super_admins").select("user_id").eq("user_id",session.user.id).maybeSingle();
 if(!admin){location.replace("./login.html");}
 else{
  const {count,error}=await supabase.from("organizations").select("id",{count:"exact",head:true});
  if(!error&&count>0)location.replace("./index.html");
 }
}
form.elements.company_name.addEventListener("input",()=>{if(!form.elements.company_slug.dataset.edited)form.elements.company_slug.value=slugify(form.elements.company_name.value);});
form.elements.company_slug.addEventListener("input",()=>{form.elements.company_slug.dataset.edited="1";form.elements.company_slug.value=slugify(form.elements.company_slug.value);});
form.addEventListener("submit",async event=>{
 event.preventDefault();const name=form.elements.company_name.value.trim(),slug=slugify(form.elements.company_slug.value);
 if(name.length<2||!slug){setMessage("Enter a valid company name and company ID.","error");return;}
 button.disabled=true;button.textContent="Setting up company…";setMessage("");
 const {data,error}=await supabase.functions.invoke("initialize-company",{body:{company_name:name,company_slug:slug}});
 if(error||data?.error){setMessage(data?.error||error?.message||"Company setup failed.","error");button.disabled=false;button.textContent="Create single-company workspace";return;}
 setMessage("Company workspace created. Opening your administrator dashboard…","success");
 location.replace("./index.html");
});
