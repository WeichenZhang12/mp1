/* =========================================================
   Requirement 6 — carousel / slider
   Hand-rolled, no dependencies. The visible slide is stored as
   a single CSS custom property on the track; every transition
   is then CSS's job, and JS only ever owns the index.
   ========================================================= */

(function () {
  "use strict";

  var root = document.getElementById("work-carousel");
  if (!root) return;

  var track = root.querySelector(".carousel__track");
  var slides = Array.prototype.slice.call(
    root.querySelectorAll(".carousel__slide")
  );
  var prevButton = root.querySelector(".carousel__arrow--prev");
  var nextButton = root.querySelector(".carousel__arrow--next");
  var dotsContainer = root.querySelector(".carousel__dots");

  if (!track || slides.length === 0) return;

  var index = 0;
  var dots = [];

  /* ---------------------------------------------------------
     Rendering
     --------------------------------------------------------- */
  function render() {
    track.style.setProperty("--slide-index", index);

    slides.forEach(function (slide, i) {
      var isCurrent = i === index;
      // Off-screen slides are hidden from assistive tech and removed
      // from the tab order, so keyboard focus cannot land on a link
      // the user cannot see.
      slide.setAttribute("aria-hidden", isCurrent ? "false" : "true");
      slide.inert = !isCurrent;
    });

    dots.forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === index);
      dot.setAttribute("aria-selected", i === index ? "true" : "false");
      dot.tabIndex = i === index ? 0 : -1;
    });
  }

  /* Wrap around at both ends so the arrows are never dead. */
  function goTo(nextIndex) {
    var count = slides.length;
    index = ((nextIndex % count) + count) % count;
    render();
  }

  function next() {
    goTo(index + 1);
  }

  function prev() {
    goTo(index - 1);
  }

  /* ---------------------------------------------------------
     Dots — built from the slide count so the markup never has
     to be kept in sync by hand.
     --------------------------------------------------------- */
  if (dotsContainer) {
    slides.forEach(function (slide, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel__dot";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", "Go to slide " + (i + 1));
      dot.addEventListener("click", function () {
        goTo(i);
      });
      dotsContainer.appendChild(dot);
      dots.push(dot);
    });
  }

  /* ---------------------------------------------------------
     Arrows
     --------------------------------------------------------- */
  if (nextButton) nextButton.addEventListener("click", next);
  if (prevButton) prevButton.addEventListener("click", prev);

  /* ---------------------------------------------------------
     Keyboard — left/right arrows once the carousel has focus.
     --------------------------------------------------------- */
  root.addEventListener("keydown", function (event) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      prev();
    }
  });

  /* ---------------------------------------------------------
     Pointer drag / touch swipe
     Pointer Events cover mouse, touch and pen with one code path.
     --------------------------------------------------------- */
  var SWIPE_THRESHOLD = 0.18; // fraction of the carousel's width
  var dragStartX = 0;
  var dragDelta = 0;
  var isDragging = false;

  function onPointerDown(event) {
    // Ignore secondary buttons and drags that start on a control.
    if (event.button !== 0) return;
    if (event.target.closest("button, a")) return;

    isDragging = true;
    dragStartX = event.clientX;
    dragDelta = 0;
    track.classList.add("is-dragging");
    track.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (!isDragging) return;
    dragDelta = event.clientX - dragStartX;

    // Follow the finger: current offset plus the drag, in percent.
    var percent = (dragDelta / root.offsetWidth) * 100;
    track.style.transform =
      "translateX(calc(" + -index * 100 + "% + " + percent + "%))";
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove("is-dragging");
    // Hand control back to the stylesheet's transform rule.
    track.style.transform = "";

    if (Math.abs(dragDelta) > root.offsetWidth * SWIPE_THRESHOLD) {
      dragDelta < 0 ? next() : prev();
    } else {
      render(); // snap back to the slide we started on
    }
  }

  track.addEventListener("pointerdown", onPointerDown);
  track.addEventListener("pointermove", onPointerMove);
  track.addEventListener("pointerup", onPointerUp);
  track.addEventListener("pointercancel", onPointerUp);

  render();
})();
