(() => {
  const API = "https://api.github.com/repos/digitalfoxstudios/biz-fox-erp/releases/latest";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const versionFromUrl = new URLSearchParams(location.search).get("nativeVersion");
  if (versionFromUrl) sessionStorage.setItem("bizfox-native-version", versionFromUrl);
  const installed = () => sessionStorage.getItem("bizfox-native-version") || (window.BizFoxAndroid ? "1.0.7" : "Web portal");
  let release = null;
  let overlay = null;
  async function loadRelease() {
    const r = await fetch(API, {headers: {"Accept":"application/vnd.github+json"}, cache:"no-store"});
    if (!r.ok) throw new Error("Could not contact the update server.");
    release = await r.json();
    return release;
  }
  function openScreen() {
    if (!overlay) {
      overlay = document.createElement("section");
      overlay.className = "bizfox-update-overlay";
      overlay.id = "bizfoxUpdateOverlay";
      overlay.innerHTML = `
        <header class="bfu-header">
          <div class="bfu-brand"><img src="./assets/biz-fox-erp-logo.png" alt="Biz FOX"><div><strong>Biz FOX ERP</strong><small>SECURE OFFICE OPERATIONS</small></div></div>
          <button type="button" class="bfu-close" aria-label="Close update screen">×</button>
        </header>
        <main class="bfu-main">
          <div class="bfu-eyebrow">BIZ FOX ERP · APPLICATION</div><h1>App Update</h1><div class="bfu-rule"></div>
          <article class="bfu-card">
            <div class="bfu-product"><div class="bfu-download-icon">↓</div><div><h2>Biz FOX Android App</h2><p>Check and install the latest official app version.</p></div></div>
            <div class="bfu-versions"><div><span>Installed version</span><strong id="bfuInstalled">${esc(installed())}</strong></div><div><span>Latest version</span><strong id="bfuLatest">Checking…</strong></div></div>
            <div class="bfu-status" id="bfuStatus" role="status">Checking for the latest version…</div>
            <h3>What's new</h3><div class="bfu-notes" id="bfuNotes">Loading release notes…</div>
            <div class="bfu-actions"><button type="button" id="bfuAction">Check again</button></div>
            <p class="bfu-help">Your company records are stored securely online and are not removed by an app update. Keep Biz FOX open while the update downloads.</p>
          </article>
        </main>`;
      document.body.append(overlay);
      overlay.querySelector(".bfu-close").addEventListener("click", closeScreen);
      overlay.querySelector("#bfuAction").addEventListener("click", async () => {
        const native = window.BizFoxAndroid && typeof window.BizFoxAndroid.checkForUpdates === "function";
        if (release && compare(installed(), release.tag_name.replace(/^v/i,"")) < 0 && native) {
          window.BizFoxAndroid.checkForUpdates();
          return;
        }
        await refresh();
      });
    }
    overlay.hidden = false;
    document.body.classList.add("bfu-open");
    refresh();
  }
  function closeScreen() {
    if (overlay) overlay.hidden = true;
    document.body.classList.remove("bfu-open");
  }
  function compare(a,b) {
    const x=String(a).replace(/^v/i,"").split(".").map(n=>parseInt(n,10)||0);
    const y=String(b).replace(/^v/i,"").split(".").map(n=>parseInt(n,10)||0);
    for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]||0)-(y[i]||0);if(d)return d;}
    return 0;
  }
  async function refresh() {
    if (!overlay) return;
    const action=overlay.querySelector("#bfuAction");
    action.disabled=true;action.textContent="Checking…";
    overlay.querySelector("#bfuInstalled").textContent=installed();
    overlay.querySelector("#bfuLatest").textContent="Checking…";
    overlay.querySelector("#bfuStatus").className="bfu-status";
    overlay.querySelector("#bfuStatus").textContent="Checking for the latest version…";
    try {
      const data=await loadRelease();
      const latest=String(data.tag_name||"").replace(/^v/i,"");
      overlay.querySelector("#bfuLatest").textContent=latest||"Unavailable";
      const body=String(data.body||"No release notes were published.");
      overlay.querySelector("#bfuNotes").textContent=body.replace(/\*\*/g,"").replace(/\r/g,"");
      const isNative=!!window.BizFoxAndroid;
      const newer=isNative && compare(installed(),latest)<0;
      const status=overlay.querySelector("#bfuStatus");
      if(newer){status.className="bfu-status bfu-available";status.textContent="A new version is available. Update now to get the latest improvements.";action.textContent="Download and install";}
      else if(isNative){status.className="bfu-status bfu-current";status.textContent="✓ You are using the latest version.";action.textContent="Check again";}
      else{status.className="bfu-status bfu-current";status.textContent="Latest release information loaded. Open this page in the Biz FOX Android app to install updates.";action.textContent="Refresh release info";}
    } catch(error) {
      overlay.querySelector("#bfuStatus").className="bfu-status bfu-error";
      overlay.querySelector("#bfuStatus").textContent="Could not check for updates. Please check your internet connection and try again.";
      overlay.querySelector("#bfuNotes").textContent=error.message;
      action.textContent="Try again";
    } finally {action.disabled=false;}
  }
  document.addEventListener("DOMContentLoaded",()=>{
    document.getElementById("sidebarAppUpdate")?.addEventListener("click",openScreen);
    document.getElementById("staffAppUpdate")?.addEventListener("click",openScreen);
  });
})();