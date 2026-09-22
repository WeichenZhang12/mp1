/* =========================================================
   MP1 — page behaviour
   One rAF-throttled scroll loop drives every scroll-dependent
   feature, so the page does at most one layout read per frame.
   ========================================================= */

(function () {
  "use strict";

  var navbar = document.getElementById("navbar");
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll("#nav-menu .navbar__link")
  );

  /* Pair every menu item with the section it points at, once, at
     start-up. Links whose target is missing are dropped so a typo in
     the markup can never throw inside the scroll handler. */
  var navTargets = navLinks
    .map(function (link) {
      var id = link.getAttribute("href");
      return {
        link: link,
        section: id && id.charAt(0) === "#" ? document.querySelector(id) : null,
      };
    })
    .filter(function (entry) {
      return entry.section !== null;
    });

  /* ---------------------------------------------------------
     Requirement 2 — sticky navbar
     CSS `position: sticky` does the pinning. This only detects
     the moment it becomes pinned so the bar can gain its
     elevated (blurred + shadowed) treatment.
     --------------------------------------------------------- */
  var STUCK_AFTER = 8; // px of scroll before the bar counts as pinned

  /* ---------------------------------------------------------
     Requirement 4 — navbar resizing
     Past the threshold, <html> gets `.is-compact`, which swaps the
     --nav-height / --nav-brand-size / --nav-link-size variables for
     their smaller values. CSS transitions animate the change, and
     html's scroll-padding-top follows automatically because it reads
     the same variable.
     --------------------------------------------------------- */
  var COMPACT_AFTER = 48; // px of scroll before the bar shrinks

  function updateNavbarState(scrollY) {
    if (!navbar) return;
    navbar.classList.toggle("is-stuck", scrollY > STUCK_AFTER);
    document.documentElement.classList.toggle(
      "is-compact",
      scrollY > COMPACT_AFTER
    );
  }

  /* ---------------------------------------------------------
     Requirement 3 — reading-position indicator
     The active section is the last one whose top edge has passed
     under the navbar's bottom edge. Because the navbar is pinned
     at the top of the viewport, that edge sits at exactly
     navbar.offsetHeight in viewport coordinates, and each
     section's own viewport position comes from
     getBoundingClientRect(). Reading it live every frame means
     the indicator stays correct after a resize or a font load
     without any cache to invalidate.
     --------------------------------------------------------- */
  var PROBE_SLACK = 1; // px of tolerance for sub-pixel rounding

  function findActiveIndex() {
    if (navTargets.length === 0) return -1;

    // The page cannot scroll past its own end, so the final section
    // may never reach the probe line on a short last stripe. Whenever
    // the viewport is resting at the bottom, the last menu item wins.
    if (isScrolledToBottom()) {
      return navTargets.length - 1;
    }

    var probeLine = (navbar ? navbar.offsetHeight : 0) + PROBE_SLACK;
    var activeIndex = -1;

    for (var i = 0; i < navTargets.length; i++) {
      // <= probeLine means this section's top has already crossed
      // above the navbar's bottom edge, i.e. we are reading it.
      if (navTargets[i].section.getBoundingClientRect().top <= probeLine) {
        activeIndex = i;
      } else {
        break; // sections are in document order; the rest are lower
      }
    }

    return activeIndex;
  }

  function isScrolledToBottom() {
    var doc = document.documentElement;
    var scrolled = window.pageYOffset || doc.scrollTop;
    var BOTTOM_SLACK = 2; // px; browsers round fractional scroll ends
    return scrolled + window.innerHeight >= doc.scrollHeight - BOTTOM_SLACK;
  }

  function updateActiveLink() {
    var activeIndex = findActiveIndex();

    navTargets.forEach(function (entry, i) {
      var isActive = i === activeIndex;
      entry.link.classList.toggle("is-active", isActive);
      // Expose the same state to assistive tech, not just to sighted users.
      if (isActive) {
        entry.link.setAttribute("aria-current", "true");
      } else {
        entry.link.removeAttribute("aria-current");
      }
    });
  }

  /* ---------------------------------------------------------
     Requirement 5 — smooth scrolling
     `scroll-behavior: smooth` in CSS already covers anchor clicks,
     but taking the click over in JS buys three things: the landing
     offset is computed rather than inherited from scroll-padding,
     reduced-motion users get an instant jump, and browsers without
     native smooth scrolling still animate.
     --------------------------------------------------------- */
  var supportsNativeSmooth = "scrollBehavior" in document.documentElement.style;
  var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* Single source of truth for the landing offset: whatever the
     stylesheet declared as scroll-padding-top. Changing it in SCSS
     changes it here too. */
  function getScrollOffset() {
    var declared = window.getComputedStyle(document.documentElement)
      .scrollPaddingTop;
    var parsed = parseFloat(declared);
    return isNaN(parsed) ? 0 : parsed;
  }

  function targetScrollTop(section) {
    var current = window.pageYOffset || document.documentElement.scrollTop;
    var absoluteTop = section.getBoundingClientRect().top + current;
    var top = absoluteTop - getScrollOffset();

    // Never ask the browser to scroll past either end of the document.
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    return Math.max(0, Math.min(top, maxScroll));
  }

  /* rAF fallback for browsers without native smooth scrolling.
     easeInOutCubic keeps the motion from starting or stopping abruptly. */
  var SCROLL_DURATION = 600; // ms

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animateScrollTo(top) {
    var start = window.pageYOffset || document.documentElement.scrollTop;
    var distance = top - start;
    var startTime = null;

    function step(timestamp) {
      if (startTime === null) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / SCROLL_DURATION, 1);
      window.scrollTo(0, start + distance * easeInOutCubic(progress));
      if (progress < 1) window.requestAnimationFrame(step);
    }

    window.requestAnimationFrame(step);
  }

  function smoothScrollTo(section) {
    var top = targetScrollTop(section);

    if (reduceMotionQuery.matches) {
      window.scrollTo(0, top); // honour the user's motion preference
    } else if (supportsNativeSmooth) {
      window.scrollTo({ top: top, behavior: "smooth" });
    } else {
      animateScrollTo(top);
    }
  }

  /* Delegated so it covers the navbar, the hero buttons and any
     in-page link added later, with one listener. */
  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || typeof target.closest !== "function") return;

    var link = target.closest('a[href^="#"]');
    if (!link) return;

    var hash = link.getAttribute("href");
    if (hash === "#") return;

    var section = document.querySelector(hash);
    if (!section) return;

    event.preventDefault();
    smoothScrollTo(section);

    // Keep the address bar in step without the jump a plain hash
    // assignment would cause.
    if (window.history && window.history.pushState) {
      window.history.pushState(null, "", hash);
    }

    // Move keyboard focus to the section so tabbing continues from
    // there, as it would have after a native anchor jump.
    section.setAttribute("tabindex", "-1");
    section.focus({ preventScroll: true });
  });

  /* ---------------------------------------------------------
     Scroll dispatcher
     Scroll events fire far faster than the screen repaints, so
     the handler just flags "dirty" and the real work happens
     once per animation frame.
     --------------------------------------------------------- */
  var ticking = false;

  function onFrame() {
    ticking = false;
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;

    updateNavbarState(scrollY);
    updateActiveLink();
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onFrame);
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);

  // Run once on load so a page restored mid-scroll starts correct.
  requestUpdate();
})();
