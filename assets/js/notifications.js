import { supabase } from "./supabase.js";

export function initNotificationCenter({user, organizationId, mount}) {
  if (!user?.id || !organizationId || !mount || mount.dataset.notificationReady) return;
  mount.dataset.notificationReady = "1";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "notification-center-trigger";
  button.setAttribute("aria-label", "Open notifications");
  button.innerHTML = '🔔 <span class="notification-count" hidden>0</span>';
  const panel = document.createElement("section");
  panel.className = "notification-center-panel";
  panel.hidden = true;
  panel.innerHTML = '<div class="notification-center-head"><strong>Notifications</strong><button type="button" class="notification-mark-all">Mark all read</button></div><div class="notification-center-list"><p class="notification-empty">Loading notifications…</p></div>';
  mount.append(button, panel);
  const list = panel.querySelector(".notification-center-list");
  const count = button.querySelector(".notification-count");
  let rows = [];
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function render() {
    const unread = rows.filter(row => !row.read_at).length;
    count.textContent = unread > 99 ? "99+" : String(unread);
    count.hidden = unread === 0;
    list.innerHTML = rows.length ? rows.map(row => '<button type="button" class="notification-row '+(!row.read_at?'unread':'')+'" data-notification-id="'+escape(row.id)+'"><span class="notification-row-title">'+escape(row.title)+'</span><span class="notification-row-body">'+escape(row.body)+'</span><time>'+escape(new Date(row.created_at).toLocaleString())+'</time></button>').join("") : '<p class="notification-empty">You are all caught up. No notifications yet.</p>';
  }
  async function load() {
    const {data,error} = await supabase.from("notifications").select("id,title,body,type,target_page,target_id,read_at,created_at").eq("organization_id",organizationId).eq("recipient_id",user.id).order("created_at",{ascending:false}).limit(50);
    if (error) { list.innerHTML = '<p class="notification-empty">Notifications could not be loaded. '+escape(error.message)+'</p>'; return; }
    rows = data || []; render();
  }
  button.addEventListener("click", async () => { panel.hidden = !panel.hidden; if (!panel.hidden) await load(); });
  panel.querySelector(".notification-mark-all").addEventListener("click", async () => {
    const ids = rows.filter(row => !row.read_at).map(row => row.id);
    if (!ids.length) return;
    const {error} = await supabase.from("notifications").update({read_at:new Date().toISOString()}).in("id",ids).eq("recipient_id",user.id);
    if (!error) await load();
  });
  list.addEventListener("click", async event => {
    const item = event.target.closest("[data-notification-id]"); if (!item) return;
    const row = rows.find(value => value.id === item.dataset.notificationId); if (!row) return;
    if (!row.read_at) await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("id",row.id).eq("recipient_id",user.id);
    panel.hidden = true;
    await load();
    if (row.target_page && typeof window.bizFoxOpenNotificationTarget === "function") window.bizFoxOpenNotificationTarget(row.target_page,row.target_id);
  });
  document.addEventListener("click", event => { if (!panel.contains(event.target) && !button.contains(event.target)) panel.hidden = true; });
  const channel = supabase.channel("bizfox-notifications-"+user.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:"recipient_id=eq."+user.id},payload=>{
    const row=payload.new; if (row.organization_id!==organizationId) return;
    rows=[row,...rows.filter(existing=>existing.id!==row.id)].slice(0,50); render();
    if (window.BizFoxOffline?.notify) window.BizFoxOffline.notify(row.title||"Biz FOX ERP",row.body||"You have a new notification.");
  }).subscribe();
  load();
  window.addEventListener("beforeunload",()=>{supabase.removeChannel(channel);},{once:true});
}
