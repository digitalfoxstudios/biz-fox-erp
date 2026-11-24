import { supabase } from "./supabase.js";
const form=document.getElementById("authForm"),submit=document.getElementById("authSubmit"),message=document.getElementById("authMessage"),forgot=document.getElementById("forgotPassword");
const APP_URL="https://digitalfoxstudios.github.io/biz-fox-erp/";
const setMessage=(s,kind="")=>{message.textContent=s;message.className="form-message "+kind;};
forgot.addEventListener("click",async()=>{
 const email=form.elements.email.value.trim();
 if(!email){setMessage("Enter your email address first.","error");return;}
 forgot.disabled=true;
 const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:APP_URL});
 forgot.disabled=false;
 setMessage(error?error.message:"If this email is registered, a password reset link will be sent.","success");
});
form.addEventListener("submit",async e=>{
 e.preventDefault();submit.disabled=true;submit.textContent="Signing in…";setMessage("");
 const {error}=await supabase.auth.signInWithPassword({email:form.elements.email.value.trim(),password:form.elements.password.value});
 submit.disabled=false;submit.textContent="Sign in";
 if(error){setMessage(error.message,"error");return;}
 location.href="./index.html";
});
supabase.auth.getSession().then(({data})=>{if(data.session)location.replace("./index.html");});
