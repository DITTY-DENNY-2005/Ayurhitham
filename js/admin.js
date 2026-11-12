/* =========================================================
   GALLERY ADMIN (upload / delete via GitHub Contents API)
   -----------------------------------------------------------
   No database, no server: images live as files in a GitHub repo
   (see config.js) and this page talks to GitHub's API directly
   from the browser using a Personal Access Token that YOU paste
   in each time you manage the gallery.

   The token is kept only in sessionStorage (cleared the moment
   this browser tab is closed) and is never written into any
   file in this project. Use a fine-grained token scoped to just
   the gallery repo, with Contents: Read & write permission only.
   ========================================================= */
(function(){
  "use strict";
  var cfg = window.GALLERY_CONFIG || {};
  var TOKEN_KEY = "ayurhitham_gh_token";

  var tokenInput   = document.getElementById("gh-token");
  var saveTokenBtn = document.getElementById("save-token");
  var clearTokenBtn= document.getElementById("clear-token");
  var connStatus   = document.getElementById("conn-status");
  var dropZone     = document.getElementById("drop-zone");
  var fileInput    = document.getElementById("file-input");
  var uploadList   = document.getElementById("upload-list");
  var adminList    = document.getElementById("admin-list");
  var refreshBtn   = document.getElementById("refresh-list");
  var statusMsg    = document.getElementById("admin-status");

  function getToken(){ return sessionStorage.getItem(TOKEN_KEY) || ""; }
  function setToken(t){ sessionStorage.setItem(TOKEN_KEY, t); }
  function dropToken(){ sessionStorage.removeItem(TOKEN_KEY); }

  function setStatus(msg, kind){
    if (!statusMsg) return;
    statusMsg.textContent = msg || "";
    statusMsg.className = "status-msg" + (kind ? " " + kind : "");
  }

  function refreshConnUI(){
    var has = !!getToken();
    if (connStatus){
      connStatus.textContent = has ? "Connected for this browser tab." : "Not connected — paste a token to manage photos.";
      connStatus.style.color = has ? "#2F6B3D" : "#A5301F";
    }
    if (tokenInput) tokenInput.value = has ? getToken() : "";
  }

  if (saveTokenBtn){
    saveTokenBtn.addEventListener("click", function(){
      var v = (tokenInput.value || "").trim();
      if (!v){ setStatus("Paste a GitHub token first.", "err"); return; }
      setToken(v);
      refreshConnUI();
      setStatus("Token saved for this tab.", "ok");
      loadList();
    });
  }
  if (clearTokenBtn){
    clearTokenBtn.addEventListener("click", function(){
      dropToken();
      refreshConnUI();
      setStatus("Token cleared.", "ok");
    });
  }

  function authHeaders(){
    return {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + getToken()
    };
  }

  function contentsUrl(filename){
    var path = cfg.path + (filename ? "/" + filename : "");
    return "https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo + "/contents/" + path;
  }

  function fileToBase64(file){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(){ resolve(reader.result.split(",")[1]); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function slugifyName(name){
    var dot = name.lastIndexOf(".");
    var base = (dot > -1 ? name.slice(0,dot) : name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
    var ext = dot > -1 ? name.slice(dot) : "";
    return Date.now() + "-" + (base || "photo") + ext.toLowerCase();
  }

  /* ---------- List existing images ---------- */
  function loadList(){
    if (!getToken()){ adminList.innerHTML = ""; return; }
    adminList.innerHTML = '<p style="color:var(--ink-400);font-size:.88rem">Loading current photos…</p>';
    fetch(contentsUrl() + "?ref=" + cfg.branch + "&t=" + Date.now(), { headers: authHeaders() })
      .then(function(res){
        if (res.status === 404) return [];
        if (!res.ok) throw new Error("Couldn't list the gallery folder (" + res.status + ").");
        return res.json();
      })
      .then(function(data){
        var files = (Array.isArray(data) ? data : [])
          .filter(function(f){ return f.type === "file" && /\.(jpe?g|png|webp|gif|avif)$/i.test(f.name); });
        if (!files.length){
          adminList.innerHTML = '<p style="color:var(--ink-400);font-size:.88rem">No photos yet — upload some below.</p>';
          return;
        }
        adminList.innerHTML = "";
        files.forEach(function(f){
          var row = document.createElement("div");
          row.className = "admin-row";
          row.innerHTML = '<img src="' + f.download_url + '" alt="">' +
                           '<span class="name">' + f.name + '</span>' +
                           '<button type="button">Remove</button>';
          row.querySelector("button").addEventListener("click", function(){
            removeFile(f.name, f.sha, row);
          });
          adminList.appendChild(row);
        });
      })
      .catch(function(err){
        setStatus(err.message || "Couldn't load the gallery list.", "err");
      });
  }
  if (refreshBtn) refreshBtn.addEventListener("click", loadList);

  /* ---------- Delete ---------- */
  function removeFile(name, sha, row){
    if (!confirm('Remove "' + name + '" from the gallery?')) return;
    row.style.opacity = ".5";
    fetch(contentsUrl(name), {
      method: "DELETE",
      headers: Object.assign({ "Content-Type":"application/json" }, authHeaders()),
      body: JSON.stringify({
        message: "Remove gallery photo: " + name,
        sha: sha,
        branch: cfg.branch
      })
    })
    .then(function(res){
      if (!res.ok) throw new Error("Delete failed (" + res.status + "). Check the token's permissions.");
      row.remove();
      setStatus('Removed "' + name + '".', "ok");
    })
    .catch(function(err){
      row.style.opacity = "1";
      setStatus(err.message, "err");
    });
  }

  /* ---------- Upload ---------- */
  function uploadOne(file){
    var row = document.createElement("div");
    row.className = "admin-row";
    var safeName = slugifyName(file.name);
    row.innerHTML = '<img alt="">' +
                     '<span class="name">' + file.name + '<div class="progress"><span></span></div></span>';
    uploadList.appendChild(row);
    var bar = row.querySelector(".progress > span");
    var thumb = row.querySelector("img");
    var reader = new FileReader();
    reader.onload = function(){ thumb.src = reader.result; };
    reader.readAsDataURL(file);

    bar.style.width = "15%";
    fileToBase64(file).then(function(b64){
      bar.style.width = "55%";
      return fetch(contentsUrl(safeName), {
        method: "PUT",
        headers: Object.assign({ "Content-Type":"application/json" }, authHeaders()),
        body: JSON.stringify({
          message: "Add gallery photo: " + safeName,
          content: b64,
          branch: cfg.branch
        })
      });
    })
    .then(function(res){
      if (!res.ok) return res.json().then(function(j){ throw new Error((j && j.message) || ("Upload failed (" + res.status + ")")); });
      bar.style.width = "100%";
      row.querySelector(".name").innerHTML = safeName + ' <span style="color:#2F6B3D">✓ uploaded</span>';
      loadList();
    })
    .catch(function(err){
      row.querySelector(".name").innerHTML = file.name + ' <span style="color:#A5301F">✗ ' + err.message + '</span>';
    });
  }

  function handleFiles(fileList){
    if (!getToken()){ setStatus("Paste and save your GitHub token first.", "err"); return; }
    var files = Array.prototype.slice.call(fileList).filter(function(f){ return /^image\//.test(f.type); });
    if (!files.length){ setStatus("Choose image files (JPG, PNG, WEBP, GIF).", "err"); return; }
    var tooBig = files.find(function(f){ return f.size > 8 * 1024 * 1024; });
    if (tooBig){ setStatus('"' + tooBig.name + '" is over 8MB — please compress it first.', "err"); return; }
    setStatus("Uploading " + files.length + " photo(s)…", "ok");
    files.forEach(uploadOne);
  }

  if (fileInput) fileInput.addEventListener("change", function(){ handleFiles(fileInput.files); fileInput.value=""; });
  if (dropZone){
    dropZone.addEventListener("click", function(){ fileInput.click(); });
    ["dragenter","dragover"].forEach(function(evt){
      dropZone.addEventListener(evt, function(e){ e.preventDefault(); dropZone.classList.add("drag"); });
    });
    ["dragleave","drop"].forEach(function(evt){
      dropZone.addEventListener(evt, function(e){ e.preventDefault(); dropZone.classList.remove("drag"); });
    });
    dropZone.addEventListener("drop", function(e){
      if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    });
  }

  refreshConnUI();
  loadList();
})();
