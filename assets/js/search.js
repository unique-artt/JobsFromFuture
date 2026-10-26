(function () {
  var qInput = document.getElementById("q-input");
  var locSelect = document.getElementById("loc-select");
  var suggestionsBox = document.getElementById("suggestions");
  var resultsGrid = document.getElementById("results-grid");
  var searchStatus = document.getElementById("search-status");
  var searchEmpty = document.getElementById("search-empty");
  var relatedTitle = document.getElementById("related-title");

  var grid = document.getElementById("job-grid");
  var tabsWrap = document.getElementById("tabs");
  var pageIndicator = document.getElementById("page-indicator");
  var prevArrow = document.getElementById("prev-arrow");
  var nextArrow = document.getElementById("next-arrow");
  var prevPage = document.getElementById("prev-page");
  var nextPage = document.getElementById("next-page");
  var noResults = document.getElementById("no-results");

  var allJobs = [];
  var PER_PAGE = 9;

  function fetchJobs(cb) {
    fetch("/search.json")
      .then(function (r) { return r.json(); })
      .then(function (data) { allJobs = data; cb(); })
      .catch(function () { cb(); });
  }

  function buildLocationOptions(selected) {
    if (!locSelect) return;
    var locs = {};
    allJobs.forEach(function (j) {
      var loc = (j.location || "").trim();
      if (loc) locs[loc] = true;
    });
    // Always offer the generic "Remote" bucket
    locs["Remote"] = true;

    Object.keys(locs).sort().forEach(function (loc) {
      if (loc === "Remote") return; // handled below so it sits first among remote entries
      var opt = document.createElement("option");
      opt.value = loc;
      opt.textContent = loc;
      if (loc === selected) opt.selected = true;
      locSelect.appendChild(opt);
    });
  }

  // ---------- Homepage ----------
  function initHomepage() {
    buildLocationOptions("");

    if (qInput && suggestionsBox) {
      qInput.addEventListener("input", function () {
        var q = qInput.value.trim().toLowerCase();
        suggestionsBox.innerHTML = "";
        if (!q) { suggestionsBox.classList.remove("open"); return; }
        var seen = {};
        var matches = [];
        allJobs.forEach(function (j) {
          var t = (j.title || "").toLowerCase();
          if (t.indexOf(q) !== -1 && !seen[j.title]) {
            seen[j.title] = true;
            matches.push(j.title);
          }
        });
        if (!matches.length) { suggestionsBox.classList.remove("open"); return; }
        matches.slice(0, 8).forEach(function (title) {
          var div = document.createElement("div");
          div.className = "suggestion-item";
          div.textContent = title;
          div.addEventListener("click", function () {
            qInput.value = title;
            suggestionsBox.classList.remove("open");
          });
          suggestionsBox.appendChild(div);
        });
        suggestionsBox.classList.add("open");
      });
      document.addEventListener("click", function (e) {
        if (!suggestionsBox.contains(e.target) && e.target !== qInput) {
          suggestionsBox.classList.remove("open");
        }
      });
    }

    if (!grid) return;

    var allCards = Array.prototype.slice.call(grid.querySelectorAll(".job-card"));
    var currentPage = 1;
    var currentTab = "all";

    function matchesTab(card) {
      if (currentTab === "all") return true;
      if (currentTab === "remote") return card.getAttribute("data-remote") === "true";
      if (currentTab === "task") return card.getAttribute("data-type") === "task";
      if (currentTab === "contract") {
        return card.getAttribute("data-employment") === "CONTRACTOR" &&
               card.getAttribute("data-type") !== "task";
      }
      if (currentTab === "fulltime") return card.getAttribute("data-employment") === "FULL_TIME";
      return true;
    }

    function render() {
      var matched = allCards.filter(matchesTab);
      var totalPages = Math.max(1, Math.ceil(matched.length / PER_PAGE));
      if (currentPage > totalPages) currentPage = totalPages;
      var start = (currentPage - 1) * PER_PAGE;
      var end = start + PER_PAGE;
      allCards.forEach(function (c) { c.style.display = "none"; });
      matched.slice(start, end).forEach(function (c) { c.style.display = ""; });
      if (pageIndicator) pageIndicator.textContent = "Page " + currentPage + " of " + totalPages;
      var atStart = currentPage === 1;
      var atEnd = currentPage === totalPages || matched.length === 0;
      [prevArrow, prevPage].forEach(function (el) { if (el) el.disabled = atStart; });
      [nextArrow, nextPage].forEach(function (el) { if (el) el.disabled = atEnd; });
      if (noResults) noResults.style.display = matched.length === 0 ? "block" : "none";
    }

    if (tabsWrap) {
      tabsWrap.addEventListener("click", function (e) {
        var btn = e.target.closest(".tab");
        if (!btn) return;
        Array.prototype.forEach.call(tabsWrap.querySelectorAll(".tab"), function (t) { t.classList.remove("active"); });
        btn.classList.add("active");
        currentTab = btn.getAttribute("data-tab");
        currentPage = 1;
        render();
      });
    }
    [prevArrow, prevPage].forEach(function (el) { if (el) el.addEventListener("click", function () { if (currentPage > 1) { currentPage--; render(); } }); });
    [nextArrow, nextPage].forEach(function (el) { if (el) el.addEventListener("click", function () { currentPage++; render(); }); });
    render();
  }

  // ---------- Search results page ----------
  function initResults() {
    if (!resultsGrid) return;
    var params = new URLSearchParams(window.location.search);
    var q = (params.get("q") || "").trim();
    var loc = (params.get("loc") || "").trim();

    if (qInput) qInput.value = q;
    buildLocationOptions(loc);

    function looseMatch(haystack, needle) {
      if (!needle) return true;
      return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
    }

    function jobMatchesLocation(job, wanted) {
      if (!wanted) return true;
      var jl = job.location || "";
      if (wanted.toLowerCase() === "remote") {
        return job.remote === true || looseMatch(jl, "remote");
      }
      return looseMatch(jl, wanted);
    }

    function scoreJob(job, term) {
      if (!term) return 0;
      var t = term.toLowerCase();
      var title = (job.title || "").toLowerCase();
      var desc = (job.description || "").toLowerCase();
      var body = (job.body || "").toLowerCase();
      var loc2 = (job.location || "").toLowerCase();
      var s = 0;
      if (title.indexOf(t) !== -1) s += 10;
      if (desc.indexOf(t) !== -1) s += 5;
      if (loc2.indexOf(t) !== -1) s += 3;
      if (body.indexOf(t) !== -1) s += 2;
      return s;
    }

    var locationFiltered = allJobs.filter(function (j) { return jobMatchesLocation(j, loc); });

    var scored = locationFiltered
      .map(function (j) { return { job: j, score: scoreJob(j, q) }; })
      .sort(function (a, b) { return b.score - a.score; });

    var keywordMatches = q ? scored.filter(function (x) { return x.score > 0; }) : scored;

    // If location is selected and keyword found nothing, still show every job in that location
    var toShow;
    var noExactMatch = false;
    if (q && keywordMatches.length === 0) {
      if (loc && locationFiltered.length > 0) {
        toShow = locationFiltered.map(function (j) { return { job: j, score: 0 }; });
        noExactMatch = true;
      } else {
        toShow = scored;
        noExactMatch = true;
      }
    } else {
      toShow = keywordMatches.length ? keywordMatches : scored;
    }

    if (searchStatus) {
      if (q || loc) {
        searchStatus.innerHTML = "Showing results for <strong>" +
          (q ? q : "all jobs") + "</strong>" +
          (loc ? " in <strong>" + loc + "</strong>" : "") + ".";
      } else {
        searchStatus.textContent = "All jobs";
      }
    }

    if (noExactMatch && searchEmpty) {
      searchEmpty.style.display = "block";
      if (relatedTitle) relatedTitle.style.display = "block";
      if (loc) {
        searchEmpty.querySelector("h2").textContent = "No exact match for that keyword";
        searchEmpty.querySelector("p").textContent =
          "Here are all the jobs we have in " + loc + ". Try a different keyword if you want to narrow further.";
        if (relatedTitle) relatedTitle.textContent = "Jobs in " + loc;
      } else {
        searchEmpty.querySelector("h2").textContent = "No exact match found";
        searchEmpty.querySelector("p").textContent =
          "We couldn't find a job with that term. Try a related search below.";
        if (relatedTitle) relatedTitle.textContent = "Related jobs";
      }
    } else if (searchEmpty) {
      searchEmpty.style.display = "none";
      if (relatedTitle) relatedTitle.style.display = "none";
    }

    var shown = toShow.slice(0, PER_PAGE).map(function (x) { return x.job; });
    resultsGrid.innerHTML = "";
    shown.forEach(function (j) {
      var a = document.createElement("a");
      a.className = "job-card";
      a.href = j.url;
      var badge = "";
      if (j.type === "task") badge = '<span class="card-badge badge-task">Task</span>';
      else if (j.remote) badge = '<span class="card-badge badge-remote">Remote</span>';
      else badge = '<span class="card-badge badge-onsite">On-site</span>';
      a.innerHTML = badge +
        "<h3>" + j.title + "</h3>" +
        '<div class="card-meta">' + (j.location || "") +
        (j.employmentType ? " · " + j.employmentType : "") + "</div>" +
        '<div class="card-salary">' + (j.pay || "") + "</div>";
      resultsGrid.appendChild(a);
    });

    if (qInput) {
      qInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          window.location.href = "/search.html?q=" + encodeURIComponent(qInput.value.trim()) +
            "&loc=" + encodeURIComponent(locSelect ? locSelect.value : "");
        }
      });
    }
    var searchBtn = document.getElementById("search-btn");
    if (searchBtn) {
      searchBtn.addEventListener("click", function () {
        window.location.href = "/search.html?q=" + encodeURIComponent(qInput ? qInput.value.trim() : "") +
          "&loc=" + encodeURIComponent(locSelect ? locSelect.value : "");
      });
    }
  }

  fetchJobs(function () {
    initHomepage();
    initResults();
  });
})();