import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const caller=createClient(url,anon,{global:{headers:{Authorization:req.headers.get("Authorization")||""}}});
 const {data:{user},error:authError}=await caller.auth.getUser();
 if(authError||!user)return json({error:"Please sign in as an administrator."},401);
 let input:{organization_id?:string;employee_id?:string;username?:string;password?:string};
 try{input=await req.json()}catch{return json({error:"Invalid request."},400)}
 if(!input.organization_id||!input.employee_id)return json({error:"Employee is required."},400);
 const username=String(input.username||"").trim().toLowerCase(),password=String(input.password||"");
 if(!/^[a-z0-9._-]{3,32}$/.test(username))return json({error:"Username must be 3–32 characters using letters, numbers, dot, underscore or hyphen."},400);
 if(!/^[0-9]{8}$/.test(password))return json({error:"Password must contain exactly 8 digits."},400);
 const admin=createClient(url,service);
 const {data:member}=await admin.from("organization_members").select("role,status").eq("organization_id",input.organization_id).eq("user_id",user.id).eq("status","active").maybeSingle();
 if(!member||!["owner","admin","manager"].includes(member.role))return json({error:"Only company administrators can create staff logins."},403);
 const {data:employee,error:employeeError}=await admin.from("employees").select("id,organization_id,full_name,user_id,employment_status").eq("id",input.employee_id).eq("organization_id",input.organization_id).single();
 if(employeeError||!employee)return json({error:"Employee record not found."},404);
 if(employee.employment_status!=="active")return json({error:"Only active employees can receive a login."},400);
 const {data:existing}=await admin.from("employees").select("id").ilike("staff_username",username).neq("id",employee.id).maybeSingle();
 if(existing)return json({error:"This username is already in use."},409);
 const syntheticEmail=username+"@staff.bizfox.invalid";let uid=employee.user_id;
 if(uid){const {error}=await admin.auth.admin.updateUserById(uid,{email:syntheticEmail,email_confirm:true,password,user_metadata:{full_name:employee.full_name,account_type:"staff",username}});if(error)return json({error:error.message},400);}
 else{const {data,error}=await admin.auth.admin.createUser({email:syntheticEmail,email_confirm:true,password,user_metadata:{full_name:employee.full_name,account_type:"staff",username}});if(error||!data.user)return json({error:error?.message||"Could not create staff login."},400);uid=data.user.id;}
 const {error:linkError}=await admin.from("employees").update({user_id:uid,staff_username:username}).eq("id",employee.id).eq("organization_id",input.organization_id);
 if(linkError)return json({error:"Login created but employee linking failed: "+linkError.message},500);
 const {error:memberError}=await admin.from("organization_members").upsert({organization_id:input.organization_id,user_id:uid,role:"staff",status:"active"},{onConflict:"organization_id,user_id"});
 if(memberError)return json({error:"Login created but staff permissions could not be linked: "+memberError.message},500);
 return json({success:true,username,message:"Staff username and password saved."});
});