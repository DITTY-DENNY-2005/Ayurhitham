(function(){
  "use strict";
  var csrfToken = document.querySelector('meta[name="csrf-token"]').content;

  function request(url, options){
    options = options || {};
    options.headers = Object.assign({}, options.headers || {}, {
      "X-CSRF-Token": csrfToken,
      "Accept": "application/json"
    });
    return fetch(url, options).then(function(response){
      return response.json().catch(function(){ return {}; }).then(function(data){
        if (!response.ok) {
          if (response.status === 401) window.location.reload();
          throw new Error(data.error || "Request failed (" + response.status + ").");
        }
        return data;
      });
    });
  }

  document.querySelectorAll("[data-media-manager]").forEach(function(manager){
    var collection = manager.getAttribute("data-collection");
    var dropZone = manager.querySelector("[data-drop-zone]");
    var fileInput = manager.querySelector("[data-file-input]");
    var uploadList = manager.querySelector("[data-upload-list]");
    var imageList = manager.querySelector("[data-image-list]");
    var status = manager.querySelector("[data-status]");

    function setStatus(message, kind){
      status.textContent = message || "";
      status.className = "status-msg" + (kind ? " " + kind : "");
    }

    function showEmptyList(){
      var message = document.createElement("p");
      message.className = "admin-empty";
      message.textContent = "No photos yet - upload some above.";
      imageList.replaceChildren(message);
    }

    function createRow(image){
      var row = document.createElement("div");
      row.className = "admin-row";
      var thumbnail = document.createElement("img");
      thumbnail.src = image.url;
      thumbnail.alt = "";
      var name = document.createElement("span");
      name.className = "name";
      name.textContent = image.original_name;
      var remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.addEventListener("click", function(){
        if (!window.confirm('Remove "' + image.original_name + '" from this section?')) return;
        remove.disabled = true;
        request("api/gallery.php", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: image.filename, type: collection })
        }).then(function(){
          row.remove();
          if (!imageList.children.length) showEmptyList();
          setStatus("Photo removed.", "ok");
        }).catch(function(error){
          remove.disabled = false;
          setStatus(error.message, "err");
        });
      });
      row.appendChild(thumbnail);
      row.appendChild(name);
      row.appendChild(remove);
      return row;
    }

    function loadList(){
      imageList.textContent = "Loading photos...";
      request("api/gallery.php?type=" + encodeURIComponent(collection)).then(function(data){
        var images = Array.isArray(data.images) ? data.images : [];
        imageList.replaceChildren();
        if (!images.length) {
          showEmptyList();
          return;
        }
        images.forEach(function(image){ imageList.appendChild(createRow(image)); });
      }).catch(function(error){
        imageList.textContent = "";
        setStatus(error.message, "err");
      });
    }

    function uploadOne(file){
      var row = document.createElement("div");
      row.className = "admin-row";
      var thumbnail = document.createElement("img");
      thumbnail.alt = "";
      thumbnail.src = URL.createObjectURL(file);
      var name = document.createElement("span");
      name.className = "name";
      name.textContent = file.name + " - uploading...";
      row.appendChild(thumbnail);
      row.appendChild(name);
      uploadList.appendChild(row);

      var form = new FormData();
      form.append("image", file);
      form.append("type", collection);
      request("api/gallery.php", { method: "POST", body: form }).then(function(data){
        name.textContent = data.image.original_name + " - uploaded";
        setStatus("Photo uploaded.", "ok");
        loadList();
      }).catch(function(error){
        name.textContent = file.name + " - " + error.message;
        setStatus(error.message, "err");
      }).then(function(){ URL.revokeObjectURL(thumbnail.src); });
    }

    function handleFiles(fileList){
      var files = Array.prototype.slice.call(fileList);
      if (!files.length) return;
      var invalid = files.find(function(file){
        return !/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type) || file.size < 1 || file.size > 8 * 1024 * 1024;
      });
      if (invalid) {
        setStatus('"' + invalid.name + '" is not a supported image or exceeds the 8 MB limit.', "err");
        return;
      }
      setStatus("Uploading " + files.length + " photo(s)...", "ok");
      files.forEach(uploadOne);
    }

    fileInput.addEventListener("change", function(){
      handleFiles(fileInput.files);
      fileInput.value = "";
    });
    dropZone.addEventListener("click", function(){ fileInput.click(); });
    dropZone.addEventListener("keydown", function(event){
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        fileInput.click();
      }
    });
    ["dragenter", "dragover"].forEach(function(eventName){
      dropZone.addEventListener(eventName, function(event){
        event.preventDefault();
        dropZone.classList.add("drag");
      });
    });
    ["dragleave", "drop"].forEach(function(eventName){
      dropZone.addEventListener(eventName, function(event){
        event.preventDefault();
        dropZone.classList.remove("drag");
      });
    });
    dropZone.addEventListener("drop", function(event){
      if (event.dataTransfer) handleFiles(event.dataTransfer.files);
    });
    manager.querySelector("[data-refresh]").addEventListener("click", loadList);

    loadList();
  });
})();
