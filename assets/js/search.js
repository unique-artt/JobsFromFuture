(function () {
  var input = document.getElementById("job-search");
  var grid = document.getElementById("job-grid");
  var noResults = document.getElementById("no-results");

  // If the grid isn't rendered yet (fewer than 30 jobs), do nothing.
  if (!input || !grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll(".job-card"));

  function filterJobs() {
    var query = input.value.trim().toLowerCase();
    var visible = 0;

    cards.forEach(function (card) {
      var title = card.getAttribute("data-title") || "";
      var location = card.getAttribute("data-location") || "";
      var match = title.indexOf(query) !== -1 || location.indexOf(query) !== -1;

      card.style.display = match ? "" : "none";
      if (match) visible++;
    });

    if (noResults) {
      noResults.style.display = visible === 0 ? "block" : "none";
    }
  }

  input.addEventListener("input", filterJobs);
})();
