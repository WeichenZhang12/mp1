/* =========================================================
   Requirement 12 — background video playback
   The <video> element carries autoplay/muted/loop itself, so
   the band works with JS disabled. This only decides WHEN it
   runs: a looping clip decoding off screen burns battery for
   nothing, so it is paused whenever the band is out of view.
   ========================================================= */

(function () {
  "use strict";

  var video = document.getElementById("reel-video");
  if (!video) return;

  /* Someone who asked for reduced motion did not ask for footage to
     start moving on its own. Leave it on the poster frame. */
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    video.removeAttribute("autoplay");
    video.pause();
    return;
  }

  if (typeof window.IntersectionObserver !== "function") return;

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          // play() returns a promise that rejects if the browser still
          // refuses to autoplay; swallow it rather than letting an
          // unhandled rejection reach the console.
          var attempt = video.play();
          if (attempt && typeof attempt.catch === "function") {
            attempt.catch(function () {});
          }
        } else {
          video.pause();
        }
      });
    },
    // Start as soon as a sliver of the band is on screen, so the
    // footage is already moving by the time it is properly in view.
    { threshold: 0.1 }
  );

  observer.observe(video);
})();
