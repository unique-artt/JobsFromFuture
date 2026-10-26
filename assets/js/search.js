(function () {
  var input = document.getElementById("job-search");
  var grid = document.getElementById("job-grid");
  var noResults = document.getElementById("no-results");
  var tabsWrap = document.getElementById("tabs");
  var pageIndicator = document.getElementById("page-indicator");
  var prevArrow = document.getElementById("prev-arrow");
  var nextArrow = document.getElementById("next-arrow");
  var prevPage = document.getElementById("prev-page");
  var nextPage = document.getElementById("next-page");

  if (!grid) return; // fewer than 1 job or coming soon

  var allCards = Array.prototype.slice.call(grid.querySelectorAll(".job-card"));
  var PER_PAGE = 9;
  var currentPage = 1;
  var currentTab = "all";
  var query = "";

  function matchesTab(card) {
    if (currentTab === "all") return true;
    if (currentTab === "remote") return card.getAttribute("data-remote") === "true";
    if (currentTab === "task") return card.getAttribute("data-type") === "task";
    if (currentTab === "contract") {
      return card.getAttribute("data-employment") === "CONTRACTOR" &&
             card.getAttribute("data-type") !== "task";
    }
    if (currentTab === "fulltime") {
      return card.getAttribute("data-employment") === "FULL_TIME";
    }
    return true;
  }

  function matchesSearch(card) {
    if (!query) return true;
    var title = card.getAttribute("data-title") || "";
    var location = card.getAttribute("data-location") || "";
    return title.indexOf(query) !== -1 || location.indexOf(query) !== -1;
  }

  function render() {
    var matched = allCards.filter(function (card) {
      return matchesTab(card) && matchesSearch(card);
    });

    var totalPages = Math.max(1, Math.ceil(matched.length / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    var start = (currentPage - 1) * PER_PAGE;
    var end = start + PER_PAGE;

    // Hide all, show only the current page slice of matched cards
    allCards.forEach(function (card) {
      card.style.display = "none";
    });
    matched.slice(start, end).forEach(function (card) {
      card.style.display = "";
    });

    // Empty state
    if (noResults) {
      noResults.style.display = matched.length === 0 ? "block" : "none";
    }

    // Pager text
    if (pageIndicator) {
      pageIndicator.textContent = "Page " + currentPage + " of " + totalPages;
    }

    // Disable arrows/pager
    var atStart = currentPage === 1;
    var atEnd = currentPage === totalPages || matched.length === 0;
    [prevArrow, prevPage].forEach(function (el) { if (el) el.disabled = atStart; });
    [nextArrow, nextPage].forEach(function (el) { if (el) el.disabled = atEnd; });
  }

  // Search
  if (input) {
    input.addEventListener("input", function () {
      query = input.value.trim().toLowerCase();
      currentPage = 1;
      render();
    });
  }

  // Tabs
  if (tabsWrap) {
    tabsWrap.addEventListener("click", function (e) {
      var btn = e.target.closest(".tab");
      if (!btn) return;
      Array.prototype.forEach.call(tabsWrap.querySelectorAll(".tab"), function (t) {
        t.classList.remove("active");
      });
      btn.classList.add("active");
      currentTab = btn.getAttribute("data-tab");
      currentPage = 1;
      render();
    });
  }

  // Arrows + pager
  function goPrev() {
    if (currentPage > 1) { currentPage--; render(); }
  }
  function goNext() {
    currentPage++; render();
  }
  [prevArrow, prevPage].forEach(function (el) {
    if (el) el.addEventListener("click", goPrev);
  });
  [nextArrow, nextPage].forEach(function (el) {
    if (el) el.addEventListener("click", goNext);
  });

  render();
})();