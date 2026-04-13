(function () {
  var kanban = document.getElementById("kanban");
  if (!kanban) return;

  var draggedId = null;
  var cards = kanban.querySelectorAll(".task-card");
  var zones = kanban.querySelectorAll(".kanban-dropzone");

  cards.forEach(function (card) {
    card.addEventListener("dragstart", function (e) {
      draggedId = card.getAttribute("data-task-id");
      if (e.dataTransfer) {
        e.dataTransfer.setData("text/plain", draggedId);
        e.dataTransfer.effectAllowed = "move";
      }
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", function () {
      card.classList.remove("dragging");
      draggedId = null;
    });
  });

  zones.forEach(function (zone) {
    zone.addEventListener("dragover", function (e) {
      e.preventDefault();
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragleave", function () {
      zone.classList.remove("drag-over");
    });
    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      zone.classList.remove("drag-over");
      var col = zone.getAttribute("data-column");
      var id = (e.dataTransfer && e.dataTransfer.getData("text/plain")) || draggedId;
      if (!id || !col) return;
      fetch("/tasks/" + id + "/move", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column: col, order: 999 }),
      })
        .then(function (r) {
          if (r.ok) window.location.reload();
        })
        .catch(function () {});
    });
  });
})();
