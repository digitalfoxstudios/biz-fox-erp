import { supabase } from "./supabase.js";
const form=document.getElementById("authForm"),submit=document.getElementById("authSubmit"),message=document.getElementById("authMessage"),forgot=document.getElementById("forgotPassword");
const APP_URL="https://digitalfoxstudios.github.io/biz-fox-erp/";
const setMessage=(s,kind="")=>{message.textContent=s;message.className="form-message "+kind;};
forgot.addEventListener("click",async()=>{
 const identity=form.elements.identity.value.trim();
 if(!identity.includes("@")){setMessage("Password reset is available for administrator email accounts. Ask your administrator to reset a staff password.","error");return;}
 forgot.disabled=true;
 const {error}=await supabase.auth.resetPasswordForEmail(identity,{redirectTo:APP_URL});
 forgot.disabled=false;
 setMessage(error?error.message:"If this email is registered, a password reset link will be sent.","success");
});
form.addEventListener("submit",async e=>{
 e.preventDefault();submit.disabled=true;submit.textContent="Signing in…";setMessage("");
 const identity=form.elements.identity.value.trim().toLowerCase(),password=form.elements.password.value;
 const email=identity.includes("@")?identity:identity+"@staff.bizfox.invalid";
 const {data,error}=await supabase.auth.signInWithPassword({email,password});
 submit.disabled=false;submit.textContent="Sign in";
 if(error){setMessage("Incorrect username/email or password. Check your details or contact the administrator.","error");return;}
 const {data:members,error:roleError}=await supabase.from("organization_members").select("role").eq("user_id",data.user.id).eq("status","active");
 if(roleError){await supabase.auth.signOut();setMessage("Could not verify account permissions. Please try again.","error");return;}
 const roles=(members||[]).map(x=>x.role);
 if(roles.includes("staff")&&!roles.some(r=>["owner","admin","manager"].includes(r)))location.replace("./staff.html");
 else location.replace("./index.html");
});
supabase.auth.getSession().then(async({data})=>{
 if(!data.session)return;
 const {data:members}=await supabase.from("organization_members").select("role").eq("user_id",data.session.user.id).eq("status","active");
 const roles=(members||[]).map(x=>x.role);
 location.replace(roles.includes("staff")&&!roles.some(r=>["owner","admin","manager"].includes(r))?"./staff.html":"./index.html");
});
