import { supabase } from "./supabase.js";
const form=document.getElementById("authForm"),submit=document.getElementById("authSubmit"),message=document.getElementById("authMessage"),forgot=document.getElementById("forgotPassword");
const APP_URL="https://digitalfoxstudios.github.io/biz-fox-erp/";
const setMessage=(s,kind="")=>{message.textContent=s;message.className="form-message "+kind;};
async function finishPendingCompany(user){
 const pending=user?.user_metadata?.pending_company_registration;
 if(!pending?.name||!pending?.slug)return null;
 const {data,error}=await supabase.functions.invoke("company-register",{body:pending});
 if(error||!data?.success)throw new Error(error?.message||data?.error||"Company registration could not be completed.");
 return data;
}
async function routeUser(user){
 const {data:platform}=await supabase.from("platform_super_admins").select("id").eq("user_id",user.id).maybeSingle();
 if(platform){location.replace("./platform-admin.html");return;}
 try{await finishPendingCompany(user);}catch(error){setMessage(error.message+" Your account is signed in; correct the issue and contact support if needed.","error");return;}
 const {data:members,error:roleError}=await supabase.from("organization_members").select("role").eq("user_id",user.id).eq("status","active");
 if(roleError){setMessage("Could not verify account permissions. Please try again.","error");return;}
 const roles=(members||[]).map(x=>x.role);
 if(roles.includes("staff")&&!roles.some(r=>["owner","admin","manager"].includes(r)))location.replace("./staff.html");
 else if(roles.length)location.replace("./index.html");
 else setMessage("Your account is not linked to a business workspace. Register your company or ask your company administrator to add you.","error");
}
forgot.addEventListener("click",async()=>{
 const identity=form.elements.identity.value.trim();
 if(!identity.includes("@")){setMessage("Password reset is available for administrator email accounts. Ask your administrator to reset a staff password.","error");return;}
 forgot.disabled=true;const {error}=await supabase.auth.resetPasswordForEmail(identity,{redirectTo:APP_URL});forgot.disabled=false;
 setMessage(error?error.message:"If this email is registered, a password reset link will be sent.","success");
});
form.addEventListener("submit",async e=>{
 e.preventDefault();submit.disabled=true;submit.textContent="Signing in…";setMessage("");
 const identity=form.elements.identity.value.trim().toLowerCase(),password=form.elements.password.value,email=identity.includes("@")?identity:identity+"@staff.bizfox.invalid";
 const {data,error}=await supabase.auth.signInWithPassword({email,password});
 submit.disabled=false;submit.textContent="Sign in";
 if(error){setMessage("Incorrect username/email or password. Check your details or contact the administrator.","error");return;}
 await routeUser(data.user);
});
supabase.auth.getSession().then(async({data})=>{if(data.session)await routeUser(data.session.user);});
