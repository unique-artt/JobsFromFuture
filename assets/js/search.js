(function () {
  var qInput = document.getElementById("q-input");
  var locSelect = document.getElementById("loc-select");
  var suggestionsBox = document.getElementById("suggestions");
  var resultsGrid = document.getElementById("results-grid");
  var searchStatus = document.getElementById("search-status");
  var searchEmpty = document.getElementById("search-empty");
  var relatedTitle = document.getElementById("related-title");
  var searchPager = document.getElementById("search-pager");
  var searchPageIndicator = document.getElementById("page-indicator");
  var searchPrevPage = document.getElementById("prev-page");
  var searchNextPage = document.getElementById("next-page");
  var moreSection = document.getElementById("more-section");
  var moreGrid = document.getElementById("more-grid");

  var grid = document.getElementById("job-grid");
  var tabsWrap = document.getElementById("tabs");
  var homePageIndicator = document.getElementById("page-indicator"); // Note: this ID is also used on search page, careful
  var homePrevPage = document.getElementById("prev-page");
  var homeNextPage = document.getElementById("next-page");

  var allJobs = [];
  var PER_PAGE = 9;

  var searchResults = [];
  var searchCurrentPage = 1;

  function fetchJobs(cb) {
    fetch("/search.json")
      .then(function (r) { return r.json(); })
      .then(function (data) { allJobs = data; cb(); })
      .catch(function () { cb(); });
  }

  function normalizeLocation(raw) {
    if (!raw) return "";
    var m = raw.match(/^Remote\s*\((.+)\)$/i);
    if (m) return m[1].trim();
    if (/^remote$/i.test(raw.trim())) return "Remote";
    return raw.trim();
  }

  function buildLocationOptions(selected) {
    if (!locSelect) return;
    locSelect.innerHTML = '<option value="">All locations</option>';

    var seen = {};
    allJobs.forEach(function (j) {
      var n = normalizeLocation(j.location || "");
      if (n) seen[n] = true;
    });
    
    seen["Remote"] = true;

    var names = Object.keys(seen).filter(function (n) { return n !== "Remote"; }).sort();
    var ordered = ["Remote"].concat(names);

    ordered.forEach(function (name) {
      var opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      if (name === selected) opt.selected = true;
      locSelect.appendChild(opt);
    });
  }

  // ---------- Homepage ----------
  function initHomepage() {
    if (grid) {
      buildLocationOptions("");
    }

    if (qInput && suggestionsBox) {
      qInput.addEventListener("input", function () {
        var q = qInput.value.trim().toLowerCase();
        suggestionsBox.innerHTML = "";
        if (!q) { suggestionsBox.classList.remove("open"); return; }
        var seenTitles = {};
        var matches = [];
        allJobs.forEach(function (j) {
          var t = (j.title || "").toLowerCase();
          if (t.indexOf(q) !== -1 && !seenTitles[j.title]) {
            seenTitles[j.title] = true;
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

    function renderHome() {
      var matched = allCards.filter(matchesTab);
      var totalPages = Math.max(1, Math.ceil(matched.length / PER_PAGE));
      if (currentPage > totalPages) currentPage = totalPages;
      var start = (currentPage - 1) * PER_PAGE;
      var end = start + PER_PAGE;
      
      allCards.forEach(function (c) { c.style.display = "none"; });
      matched.slice(start, end).forEach(function (c) { c.style.display = ""; });
      
      var homeIndicator = document.querySelector('.pager #page-indicator');
      var homePrev = document.querySelector('.pager #prev-page');
      var homeNext = document.querySelector('.pager #next-page');
      
      if (homeIndicator) homeIndicator.textContent = "Page " + currentPage + " of " + totalPages;
      var atStart = currentPage === 1;
      var atEnd = currentPage === totalPages || matched.length === 0;
      
      if (homePrev) homePrev.disabled = atStart;
      if (homeNext) homeNext.disabled = atEnd;
      
      var noResults = document.getElementById("no-results");
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
        renderHome();
      });
    }
    
    var hPrev = document.querySelector('.pager #prev-page');
    var hNext = document.querySelector('.pager #next-page');
    if (hPrev) hPrev.addEventListener("click", function () { if (currentPage > 1) { currentPage--; renderHome(); } });
    if (hNext) hNext.addEventListener("click", function () { currentPage++; renderHome(); });
    
    renderHome();
  }

  // ---------- Shared: render a job card ----------
  function jobCardHTML(j) {
    var badge = "";
    if (j.type === "task") badge = '<span class="card-badge badge-task">Task</span>';
    else if (j.remote) badge = '<span class="card-badge badge-remote">Remote</span>';
    else badge = '<span class="card-badge badge-onsite">On-site</span>';
    return badge +
      "<h3>" + j.title + "</h3>" +
      '<div class="card-meta">' + (j.location || "") +
      (j.employmentType ? " · " + j.employmentType : "") + "</div>" +
      '<div class="card-salary">' + (j.pay || "") + "</div>";
  }

  function renderCards(container, list) {
    container.innerHTML = "";
    list.forEach(function (j) {
      var a = document.createElement("a");
      a.className = "job-card";
      a.href = j.url;
      a.innerHTML = jobCardHTML(j);
      container.appendChild(a);
    });
  }

  function renderSearchResults() {
    var totalPages = Math.max(1, Math.ceil(searchResults.length / PER_PAGE));
    if (searchCurrentPage > totalPages) searchCurrentPage = totalPages;
    if (searchCurrentPage < 1) searchCurrentPage = 1;

    var start = (searchCurrentPage - 1) * PER_PAGE;
    var end = start + PER_PAGE;
    
    var shown = searchResults.slice(start, end);
    renderCards(resultsGrid, shown);

    if (searchResults.length > PER_PAGE) {
      searchPager.style.display = "flex";
      searchPageIndicator.textContent = "Page " + searchCurrentPage + " of " + totalPages;
      searchPrevPage.disabled = searchCurrentPage === 1;
      searchNextPage.disabled = searchCurrentPage === totalPages;
    } else {
      searchPager.style.display = "none";
    }

    // Sparse results logic
    if (searchResults.length > 0 && searchResults.length <= 3) {
      var shownUrls = {};
      searchResults.forEach(function (j) { shownUrls[j.url] = true; });
      var extras = allJobs.filter(function (j) { return !shownUrls[j.url]; });
      extras.sort(function () { return 0.5 - Math.random(); });
      
      renderCards(moreGrid, extras.slice(0, 9));
      moreSection.style.display = "block";
    } else {
      moreSection.style.display = "none";
    }
  }

  // ---------- Search results page ----------
  function initResults() {
    if (!resultsGrid) return;
    var params = new URLSearchParams(window.location.search);
    var q = (params.get("q") || "").trim();
    var loc = (params.get("loc") || "").trim();

    if (qInput) qInput.value = q;
    buildLocationOptions(loc);

    function looseContains(haystack, needle) {
      if (!needle) return true;
      return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
    }

    function jobMatchesLocation(job, wanted) {
      if (!wanted) return true;
      if (wanted.toLowerCase() === "remote") return job.remote === true;
      var n = normalizeLocation(job.location || "");
      return looseContains(n, wanted) || looseContains(job.location || "", wanted);
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
    var scored = locationFiltered.map(function (j) { return { job: j, score: scoreJob(j, q) }; }).sort(function (a, b) { return b.score - a.score; });
    var keywordMatches = q ? scored.filter(function (x) { return x.score > 0; }) : scored;

    var overrideLocation = false;
    if (q && keywordMatches.length === 0 && loc) {
      var globalMatches = allJobs.map(function (j) { return { job: j, score: scoreJob(j, q) }; }).filter(function (x) { return x.score > 0; }).sort(function (a, b) { return b.score - a.score; });
      if (globalMatches.length > 0) {
        keywordMatches = globalMatches;
        locationFiltered = globalMatches.map(function(x) { return x.job; });
        overrideLocation = true;
      }
    }

    var noExactMatch = false;
    if (q && keywordMatches.length === 0) {
      noExactMatch = true;
      searchResults = locationFiltered;
    } else {
      searchResults = keywordMatches.length ? keywordMatches.map(function(x){return x.job;}) : scored.map(function(x){return x.job;});
    }

    if (searchStatus) {
      if (q || loc) {
        if (overrideLocation) {
          searchStatus.innerHTML = "No results for <strong>" + q + "</strong> in <strong>" + loc + "</strong>. Showing <strong>" + q + "</strong> roles from all locations:";
        } else {
          searchStatus.innerHTML = "Showing results for <strong>" + (q ? q : "all jobs") + "</strong>" + (loc ? " in <strong>" + loc + "</strong>" : "") + ".";
        }
      } else {
        searchStatus.textContent = "All jobs";
      }
    }

    if (noExactMatch && searchEmpty) {
      searchEmpty.style.display = "block";
      relatedTitle.style.display = "block";
      if (loc) {
        searchEmpty.querySelector("h2").textContent = "No exact match for that keyword";
        searchEmpty.querySelector("p").textContent = "Here are all the jobs we have in " + loc + ". Try a different keyword if you want to narrow further.";
        relatedTitle.textContent = "Jobs in " + loc;
      } else {
        searchEmpty.querySelector("h2").textContent = "No exact match found";
        searchEmpty.querySelector("p").textContent = "We couldn't find a job with that term. Try a related search below.";
        relatedTitle.textContent = "Related jobs";
      }
    } else if (searchEmpty) {
      searchEmpty.style.display = "none";
      relatedTitle.style.display = "none";
    }

    searchCurrentPage = 1;
    renderSearchResults();

    searchPrevPage.addEventListener("click", function () { if (searchCurrentPage > 1) { searchCurrentPage--; renderSearchResults(); window.scrollTo(0, 300); } });
    searchNextPage.addEventListener("click", function () { searchCurrentPage++; renderSearchResults(); window.scrollTo(0, 300); });

    if (qInput) {
      qInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { window.location.href = "/search.html?q=" + encodeURIComponent(qInput.value.trim()) + "&loc=" + encodeURIComponent(locSelect ? locSelect.value : ""); }
      });
    }
    var searchBtn = document.getElementById("search-btn");
    if (searchBtn) {
      searchBtn.addEventListener("click", function () { window.location.href = "/search.html?q=" + encodeURIComponent(qInput ? qInput.value.trim() : "") + "&loc=" + encodeURIComponent(locSelect ? locSelect.value : ""); });
    }
  }

  fetchJobs(function () {
    initHomepage();
    initResults();
  });
})();