/*
  Detection-scan panel background.
  A monitored node lattice swept by a scan line: nodes brighten as the
  sweep crosses them, and occasionally one is flagged (amber) then
  resolves to verified (teal) shortly after — a literal, small-scale
  picture of what the site's subject actually does: scan a model,
  flag an anomaly, confirm it. Pure canvas, no dependencies.
*/
(function () {
  var canvas = document.getElementById("scan-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var COL_BORDER = "#2b3542";
  var COL_NODE = "#4a5666";
  var COL_ACTIVE = "#e9edf2";
  var COL_ACCENT = "#d9a441";
  var COL_VERIFY = "#4fb3a2";

  var W, H, DPR, nodes, sweepY, raf;
  var SPACING = 52;

  function resize() {
    var rect = canvas.parentElement.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildNodes();
  }

  function buildNodes() {
    nodes = [];
    var cols = Math.ceil(W / SPACING) + 1;
    var rows = Math.ceil(H / SPACING) + 1;
    var seed = 1;
    function rand() {
      // small deterministic PRNG so layout doesn't jump on re-resize
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        nodes.push({
          x: c * SPACING + (rand() - 0.5) * 18,
          y: r * SPACING + (rand() - 0.5) * 18,
          phase: rand() * Math.PI * 2,
          state: "idle", // idle | flagged | verified
          stateAt: 0
        });
      }
    }
  }

  function neighbors(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy) < SPACING * 1.15;
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);

    // connective lattice
    ctx.strokeStyle = COL_BORDER;
    ctx.lineWidth = 1;
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        if (neighbors(nodes[i], nodes[j])) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // sweep line
    if (!reduceMotion) {
      var grad = ctx.createLinearGradient(0, sweepY - 60, 0, sweepY + 60);
      grad.addColorStop(0, "rgba(217,164,65,0)");
      grad.addColorStop(0.5, "rgba(217,164,65,0.14)");
      grad.addColorStop(1, "rgba(217,164,65,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, sweepY - 60, W, 120);
      ctx.strokeStyle = "rgba(217,164,65,0.55)";
      ctx.beginPath();
      ctx.moveTo(0, sweepY);
      ctx.lineTo(W, sweepY);
      ctx.stroke();
    }

    // nodes
    for (var k = 0; k < nodes.length; k++) {
      var n = nodes[k];
      var nearSweep = !reduceMotion && Math.abs(n.y - sweepY) < 45;

      if (nearSweep && n.state === "idle" && Math.random() < 0.006) {
        n.state = "flagged";
        n.stateAt = t;
      }
      if (n.state === "flagged" && t - n.stateAt > 550) {
        n.state = "verified";
        n.stateAt = t;
      }
      if (n.state === "verified" && t - n.stateAt > 1800) {
        n.state = "idle";
      }

      var r = 1.6;
      var color = COL_NODE;
      if (nearSweep) { color = COL_ACTIVE; r = 2.2; }
      if (n.state === "flagged") { color = COL_ACCENT; r = 3.2; }
      if (n.state === "verified") { color = COL_VERIFY; r = 2.6; }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();

      if (n.state === "flagged" || n.state === "verified") {
        var age = t - n.stateAt;
        var ringR = r + 3 + (age / 550) * 10;
        var alpha = Math.max(0, 1 - age / 550);
        if (alpha > 0) {
          ctx.strokeStyle = (n.state === "flagged" ? "rgba(217,164,65," : "rgba(79,179,162,") + (alpha * 0.6) + ")";
          ctx.beginPath();
          ctx.arc(n.x, n.y, ringR, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }

  function frame(t) {
    sweepY = ((t / 22) % (H + 160)) - 80;
    draw(t);
    raf = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize);

  if (reduceMotion) {
    sweepY = -999;
    draw(0);
  } else {
    raf = requestAnimationFrame(frame);
  }
})();
