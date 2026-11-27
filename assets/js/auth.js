import { supabase } from "./supabase.js";
const form=document.getElementById("authForm");
const submit=document.getElementById("authSubmit");
const message=document.getElementById("authMessage");
const forgot=document.getElementById("forgotPassword");
const APP_URL="https://digitalfoxstudios.github.io/biz-fox-erp/";
const STAFF_SUFFIX="@staff.bizfox.invalid";
let routing=false;
const setMessage=(value,kind="")=>{message.textContent=value;message.className="form-message "+kind;};
function loginEmail(identity){return identity.includes("@")?identity:identity+STAFF_SUFFIX;}
async function routeUser(user){
 if(routing)return;
 routing=true;
 const {data:members,error}=await supabase.from("organization_members").select("role").eq("user_id",user.id).eq("status","active");
 if(error){routing=false;setMessage("We could not verify your access. Please try again.","error");return;}
 const roles=(members||[]).map(row=>row.role);
 if(roles.some(role=>["owner","admin","manager"].includes(role))){location.replace("./index.html");return;}
 if(roles.includes("staff")){location.replace("./staff.html");return;}
 const {data:customer,error:customerError}=await supabase.from("customers").select("id").eq("user_id",user.id).maybeSingle();
 if(!customerError&&customer){location.replace("./customer.html");return;}
 await supabase.auth.signOut();
 routing=false;
 setMessage("This account is not linked to an active Biz FOX workspace. Contact your company administrator.","error");
}
forgot.addEventListener("click",async()=>{
 const identity=form.elements.identity.value.trim().toLowerCase();
 if(!identity.includes("@")||identity.endsWith(STAFF_SUFFIX)){setMessage("Enter the email address registered to your account to request a password reset.","error");return;}
 forgot.disabled=true;
 const {error}=await supabase.auth.resetPasswordForEmail(identity,{redirectTo:APP_URL});
 forgot.disabled=false;
 setMessage(error?error.message:"If this email is registered, a password reset link will be sent.","success");
});
form.addEventListener("submit",async event=>{
 event.preventDefault();
 submit.disabled=true;submit.textContent="Signing in…";setMessage("");
 const identity=form.elements.identity.value.trim().toLowerCase();
 const password=form.elements.password.value;
 const {data,error}=await supabase.auth.signInWithPassword({email:loginEmail(identity),password});
 submit.disabled=false;submit.textContent="Sign in securely";
 if(error){setMessage("Incorrect email/username or password. Please check your details.","error");return;}
 await routeUser(data.user);
});
supabase.auth.getSession().then(async({data,error})=>{
 if(error){setMessage("Could not restore your session. Please sign in again.","error");return;}
 if(data.session)await routeUser(data.session.user);
});
