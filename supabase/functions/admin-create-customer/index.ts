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
 if(authError||!user)return json({error:"Please sign in as a company administrator."},401);
 let input:{organization_id?:string;customer_id?:string;password?:string};
 try{input=await req.json()}catch{return json({error:"Invalid request."},400)}
 if(!input.organization_id||!input.customer_id)return json({error:"Customer record is required."},400);
 const password=String(input.password||"");
 if(password.length<10||password.length>72)return json({error:"Set a temporary password between 10 and 72 characters."},400);
 const admin=createClient(url,service);
 const {data:member}=await admin.from("organization_members").select("role,status").eq("organization_id",input.organization_id).eq("user_id",user.id).eq("status","active").maybeSingle();
 if(!member||!["owner","admin","manager"].includes(member.role))return json({error:"Only company administrators can create customer access."},403);
 const {data:customer,error:customerError}=await admin.from("customers").select("id,organization_id,customer_name,email,user_id,status").eq("id",input.customer_id).eq("organization_id",input.organization_id).single();
 if(customerError||!customer)return json({error:"Customer record not found."},404);
 if(customer.status!=="active")return json({error:"Only active customers can receive portal access."},400);
 if(!customer.email||!/^\S+@\S+\.\S+$/.test(customer.email))return json({error:"Add a valid email address to the customer record first."},400);
 let userId=customer.user_id;let createdNow=false;
 if(userId){
  const {error}=await admin.auth.admin.updateUserById(userId,{password,email:customer.email,email_confirm:true,user_metadata:{full_name:customer.customer_name,account_type:"customer"}});
  if(error)return json({error:error.message},400);
 }else{
  const {data,error}=await admin.auth.admin.createUser({email:customer.email,password,email_confirm:true,user_metadata:{full_name:customer.customer_name,account_type:"customer"}});
  if(error||!data.user)return json({error:error?.message||"Could not create customer login."},400);
  userId=data.user.id;
 }
 const {error:linkError}=await admin.from("customers").update({user_id:userId}).eq("id",customer.id).eq("organization_id",customer.organization_id);
 if(linkError){if(createdNow)await admin.auth.admin.deleteUser(userId);return json({error:"Customer linking failed: "+linkError.message},500);}
 return json({success:true,email:customer.email,message:"Customer portal access has been created. Share the email and temporary password securely."});
});