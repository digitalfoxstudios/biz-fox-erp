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
 if(authError||!user)return json({error:"Sign in before setting up your company."},401);
 let input:{company_name?:string;company_slug?:string};
 try{input=await req.json()}catch{return json({error:"Invalid request."},400)}
 const name=String(input.company_name||"").trim();
 const slug=String(input.company_slug||"").trim().toLowerCase();
 if(name.length<2||name.length>160)return json({error:"Company name must be 2–160 characters."},400);
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>80)return json({error:"Use a short company ID with lowercase letters, numbers and hyphens."},400);
 const admin=createClient(url,service);
 const {data:superAdmin}=await admin.from("platform_super_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!superAdmin)return json({error:"Only the installation administrator can perform first-time company setup."},403);
 const {count,error:countError}=await admin.from("organizations").select("id",{count:"exact",head:true});
 if(countError)return json({error:"Could not verify company setup state."},500);
 if((count||0)>0)return json({error:"This installation already has its single company workspace. Additional companies are not supported."},409);
 const {data:existing}=await admin.from("organizations").select("id").eq("slug",slug).maybeSingle();
 if(existing)return json({error:"This company ID is already in use."},409);
 const {data:org,error:orgError}=await admin.from("organizations").insert({name,slug,created_by:user.id,timezone:"Asia/Kolkata"}).select("id,name").single();
 if(orgError||!org)return json({error:orgError?.message||"Company setup failed."},400);
 const {error:memberError}=await admin.from("organization_members").insert({organization_id:org.id,user_id:user.id,role:"owner",status:"active"});
 if(memberError){await admin.from("organizations").delete().eq("id",org.id);return json({error:"Company created but owner access could not be linked: "+memberError.message},500);}
 return json({success:true,company:org,message:"Single-company workspace initialized. You are the company owner."});
});