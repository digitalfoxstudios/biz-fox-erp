import { supabase } from "./supabase.js";
const form=document.getElementById("authForm"),title=document.getElementById("authTitle"),subtitle=document.getElementById("authSubtitle"),submit=document.getElementById("authSubmit"),message=document.getElementById("authMessage"),toggle=document.getElementById("toggleMode"),forgot=document.getElementById("forgotPassword");
let mode="signin";
const params=new URLSearchParams(location.search);
const setMessage=(s,kind="")=>{message.textContent=s;message.className="form-message "+kind;};
function setMode(next){mode=next;const signup=mode==="signup";title.textContent=signup?"Create your account":"Welcome back";subtitle.textContent=signup?"Register your secure Biz FOX ERP login.":"Sign in to continue to Biz FOX ERP.";submit.textContent=signup?"Create account":"Sign in";document.getElementById("nameLabel").hidden=!signup;document.getElementById("passwordLabel").hidden=false;form.elements.password.required=true;toggle.textContent=signup?"Already have an account? Sign in":"Create an account";forgot.hidden=signup;setMessage("");}
toggle.addEventListener("click",()=>setMode(mode==="signin"?"signup":"signin"));
forgot.addEventListener("click",async()=>{const email=form.elements.email.value.trim();if(!email){setMessage("Enter your email address first.","error");return;}const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname.replace("login.html","")});setMessage(error?error.message:"If this email is registered, a password reset link will be sent.","success");});
form.addEventListener("submit",async e=>{e.preventDefault();submit.disabled=true;submit.textContent="Please wait…";setMessage("");const email=form.elements.email.value.trim();const password=form.elements.password.value;let result;
if(mode==="signup"){result=await supabase.auth.signUp({email,password,options:{data:{full_name:form.elements.full_name.value.trim()},emailRedirectTo:location.origin+location.pathname.replace("login.html","")}});}
else{result=await supabase.auth.signInWithPassword({email,password});}
submit.disabled=false;submit.textContent=mode==="signup"?"Create account":"Sign in";
if(result.error){setMessage(result.error.message,"error");return;}
if(mode==="signup"&&!result.data.session){setMessage("Account created. Check your email for the confirmation link, then return here to sign in.","success");return;}
location.href="./index.html";
});
supabase.auth.getSession().then(({data})=>{if(data.session)location.replace("./index.html");});
