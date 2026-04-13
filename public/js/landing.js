(function () {
  var els = document.querySelectorAll("[data-reveal]");
  if (!els.length || !("IntersectionObserver" in window)) {
    els.forEach(function (el) {
      el.classList.add("is-visible");
    });
    return;
  }
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  els.forEach(function (el) {
    io.observe(el);
  });

  var body = document.body;
  var heroCard = document.querySelector(".mock-card");

  function onMouseMove(e) {
    var x = e.clientX / window.innerWidth;
    var y = e.clientY / window.innerHeight;
    body.style.setProperty("--mx", (x * 100).toFixed(2) + "%");
    body.style.setProperty("--my", (y * 100).toFixed(2) + "%");
    body.style.setProperty("--mx-shift", ((x - 0.5) * 22).toFixed(2) + "px");
    body.style.setProperty("--my-shift", ((y - 0.5) * 18).toFixed(2) + "px");

    if (heroCard) {
      var rx = (0.5 - y) * 10;
      var ry = (x - 0.5) * 14;
      heroCard.style.transform = "rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
    }
  }

  function onMouseLeave() {
    if (heroCard) heroCard.style.transform = "";
    body.style.removeProperty("--mx-shift");
    body.style.removeProperty("--my-shift");
  }

  document.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("mouseleave", onMouseLeave, { passive: true });

  window.addEventListener(
    "scroll",
    function () {
      var y = Math.min(window.scrollY, 400);
      body.style.setProperty("--scroll-y", y.toFixed(2) + "px");
    },
    { passive: true }
  );
})();
