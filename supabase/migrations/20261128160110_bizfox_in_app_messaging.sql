create table if not exists public.chat_conversations (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 conversation_type text not null check (conversation_type in ('admin_employee','admin_customer','employee_customer')),
 customer_id uuid references public.customers(id) on delete cascade,
 employee_user_id uuid references auth.users(id) on delete cascade,
 created_by uuid not null references auth.users(id),
 subject text not null default 'General conversation',
 status text not null default 'open' check (status in ('open','closed')),
 last_message_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 constraint chat_conversation_participants_check check (
  (conversation_type='admin_employee' and customer_id is null and employee_user_id is not null) or
  (conversation_type='admin_customer' and customer_id is not null and employee_user_id is null) or
  (conversation_type='employee_customer' and customer_id is not null and employee_user_id is not null)
 )
);
create index if not exists chat_conversations_org_recent_idx on public.chat_conversations(organization_id,last_message_at desc);
create index if not exists chat_conversations_employee_idx on public.chat_conversations(employee_user_id,last_message_at desc);
create index if not exists chat_conversations_customer_idx on public.chat_conversations(customer_id,last_message_at desc);

create table if not exists public.chat_messages (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 sender_id uuid not null references auth.users(id),
 body text not null default '',
 attachment_path text,
 attachment_name text,
 attachment_type text,
 attachment_size bigint,
 read_at timestamptz,
 created_at timestamptz not null default now(),
 constraint chat_message_content_check check (length(trim(body))>0 or attachment_path is not null),
 constraint chat_message_body_length_check check (length(body)<=10000),
 constraint chat_attachment_size_check check (attachment_size is null or attachment_size<=10485760)
);
create index if not exists chat_messages_conversation_recent_idx on public.chat_messages(conversation_id,created_at desc);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

create policy chat_conversations_read_participants on public.chat_conversations for select to authenticated using (
 private.has_org_role(organization_id,array['owner','admin','manager'])
 or (private.has_org_role(organization_id,array['staff']) and employee_user_id=(select auth.uid()) and (
  conversation_type='admin_employee' or (conversation_type='employee_customer' and exists (
   select 1 from public.tasks t where t.organization_id=chat_conversations.organization_id and t.customer_id=chat_conversations.customer_id and t.assigned_to=(select auth.uid())
  ))
 ))
 or exists(select 1 from public.customers c where c.id=chat_conversations.customer_id and c.organization_id=chat_conversations.organization_id and c.user_id=(select auth.uid()) and c.status='active')
);

create policy chat_conversations_create_participants on public.chat_conversations for insert to authenticated with check (
 created_by=(select auth.uid()) and (
  private.has_org_role(organization_id,array['owner','admin','manager'])
  or (conversation_type='employee_customer' and employee_user_id=(select auth.uid()) and private.has_org_role(organization_id,array['staff']) and exists (
   select 1 from public.tasks t where t.organization_id=chat_conversations.organization_id and t.customer_id=chat_conversations.customer_id and t.assigned_to=(select auth.uid())
  ))
  or (conversation_type='admin_customer' and exists (
   select 1 from public.customers c where c.id=chat_conversations.customer_id and c.organization_id=chat_conversations.organization_id and c.user_id=(select auth.uid()) and c.status='active'
  ))
 )
);

create policy chat_messages_read_conversation on public.chat_messages for select to authenticated using (
 exists(select 1 from public.chat_conversations c where c.id=chat_messages.conversation_id and c.organization_id=chat_messages.organization_id)
);
create policy chat_messages_send_conversation on public.chat_messages for insert to authenticated with check (
 sender_id=(select auth.uid()) and exists(select 1 from public.chat_conversations c where c.id=chat_messages.conversation_id and c.organization_id=chat_messages.organization_id and c.status='open')
);
create policy chat_messages_mark_read on public.chat_messages for update to authenticated using (
 sender_id<>(select auth.uid()) and exists(select 1 from public.chat_conversations c where c.id=chat_messages.conversation_id and c.organization_id=chat_messages.organization_id)
) with check (
 sender_id<>(select auth.uid()) and exists(select 1 from public.chat_conversations c where c.id=chat_messages.conversation_id and c.organization_id=chat_messages.organization_id)
);
grant select,insert on public.chat_conversations to authenticated;
grant select,insert on public.chat_messages to authenticated;
grant update(read_at) on public.chat_messages to authenticated;

create or replace function private.bizfox_chat_message_after_insert()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_conversation public.chat_conversations%rowtype; v_customer_user uuid; v_recipient uuid; v_preview text;
begin
 update public.chat_conversations set last_message_at=new.created_at where id=new.conversation_id returning * into v_conversation;
 if v_conversation.customer_id is not null then
  select c.user_id into v_customer_user from public.customers c where c.id=v_conversation.customer_id;
 end if;
 v_preview=coalesce(nullif(left(new.body,180),''),new.attachment_name,'Attachment');
 if v_conversation.employee_user_id is not null and v_conversation.employee_user_id<>new.sender_id then
  insert into public.notifications(organization_id,recipient_id,actor_id,type,title,body,target_page,target_id)
  values(new.organization_id,v_conversation.employee_user_id,new.sender_id,'chat_message','New message',v_preview,'messages',new.conversation_id);
 end if;
 if v_customer_user is not null and v_customer_user<>new.sender_id then
  insert into public.notifications(organization_id,recipient_id,actor_id,type,title,body,target_page,target_id)
  values(new.organization_id,v_customer_user,new.sender_id,'chat_message','New message',v_preview,'messages',new.conversation_id);
 end if;
 for v_recipient in select om.user_id from public.organization_members om
  where om.organization_id=new.organization_id and om.status='active' and om.role in ('owner','admin','manager') and om.user_id<>new.sender_id
   and (v_conversation.conversation_type='employee_customer' or v_conversation.employee_user_id is null or v_conversation.employee_user_id<>om.user_id)
   and (v_customer_user is null or v_customer_user<>om.user_id)
 loop
  insert into public.notifications(organization_id,recipient_id,actor_id,type,title,body,target_page,target_id)
  values(new.organization_id,v_recipient,new.sender_id,'chat_message','New message',v_preview,'messages',new.conversation_id);
 end loop;
 return new;
end $$;
create trigger bizfox_chat_message_after_insert after insert on public.chat_messages for each row execute function private.bizfox_chat_message_after_insert();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('bizfox-chat-files','bizfox-chat-files',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

create policy bizfox_chat_files_read on storage.objects for select to authenticated using (
 bucket_id='bizfox-chat-files' and exists(select 1 from public.chat_conversations c where c.id=((storage.foldername(name))[1])::uuid)
);
create policy bizfox_chat_files_insert on storage.objects for insert to authenticated with check (
 bucket_id='bizfox-chat-files' and (storage.foldername(name))[2]=(select auth.uid())::text
 and exists(select 1 from public.chat_conversations c where c.id=((storage.foldername(name))[1])::uuid and c.status='open')
);
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_messages') then
  alter publication supabase_realtime add table public.chat_messages;
 end if;
end $$;
