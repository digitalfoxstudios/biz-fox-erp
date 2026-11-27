import { supabase } from "./supabase.js";
const form=document.getElementById("companyRegisterForm"),button=document.getElementById("registerSubmit"),message=document.getElementById("registerMessage");
const say=(text,kind="")=>{message.textContent=text;message.className="form-message "+kind;};
form.addEventListener("submit",async e=>{
 e.preventDefault();button.disabled=true;button.textContent="Creating account…";say("");
 const company=form.elements.company.value.trim(),slug=form.elements.slug.value.trim().toLowerCase(),owner=form.elements.owner.value.trim(),email=form.elements.email.value.trim().toLowerCase(),password=form.elements.password.value,plan=form.elements.plan.value;
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)){say("Company URL must use lowercase letters, numbers and hyphens.","error");button.disabled=false;button.textContent="Register company";return;}
 const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:owner,account_type:"business_owner",pending_company_registration:{name:company,slug,plan}}}});
 if(error){say(error.message,"error");button.disabled=false;button.textContent="Register company";return;}
 if(!data.session){say("Your account is created. Check your email to verify it, then sign in. Your company registration details are saved with your account.","success");button.disabled=false;button.textContent="Register company";return;}
 const {data:created,error:registerError}=await supabase.functions.invoke("company-register",{body:{name:company,slug,plan}});
 if(registerError||!created?.success){say(registerError?.message||created?.error||"Company registration could not be completed. Please sign in and retry.","error");button.disabled=false;button.textContent="Register company";return;}
 say("Company registered successfully. Opening your workspace…","success");location.replace("./index.html");
});
