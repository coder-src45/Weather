const canvas = document.getElementById("bg-canvas");
const ctx = canvas.getContext("2d");

let W, H;
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const SKY_BACKGROUNDS = {
  clear: "linear-gradient(135deg, #2f80ed, #56ccf2)",
  clouds: "linear-gradient(135deg, #606c88, #3f4c6b)",
  rain: "linear-gradient(135deg, #2b5876, #4e4376)",
  thunderstorm: "linear-gradient(135deg, #0f2027, #203a43)",
  snow: "linear-gradient(135deg, #6b7a9e, #a6b3d6)",
  mist: "linear-gradient(135deg, #667079, #9aa5ae)",
};

const RAYS_COLORS = {
  rain: "rgba(174,194,224,",
  snow: "rgba(255,255,255,",
};

let skyKind = "clear";
let windSpeed = 0;
let particles = [];
let flash = 0;
let nextFlash = 2;
let last = performance.now();

function normalize(main) {
  main = (main || "").toLowerCase();
  if (main === "thunderstorm") return "thunderstorm";
  if (main === "drizzle" || main === "rain") return "rain";
  if (main === "snow" || main === "sleet" || main === "shower snow") return "snow";
  if (main === "mist" || main === "fog" || main === "haze" || main === "smoke" || main === "dust") return "mist";
  if (main === "clouds") return "clouds";
  return "clear";
}

function setSky(main, wind) {
  skyKind = normalize(main);
  windSpeed = wind || 0;
  document.body.style.background = SKY_BACKGROUNDS[skyKind];
  particles = [];
  const count = { clear: 0, clouds: 10, rain: 140, thunderstorm: 160, snow: 180, mist: 7 }[skyKind];
  for (let i = 0; i < count; i++) particles.push(createParticle());
}

function createParticle() {
  const p = { kind: skyKind };
  if (skyKind === "rain" || skyKind === "thunderstorm") {
    p.x = Math.random() * W;
    p.y = Math.random() * H;
    p.len = 14 + Math.random() * 14;
    p.speed = 8 + Math.random() * 6;
  } else if (skyKind === "snow") {
    p.x = Math.random() * W;
    p.y = Math.random() * H;
    p.r = 2 + Math.random() * 3;
    p.speed = 0.6 + Math.random() * 1.4;
    p.phase = Math.random() * Math.PI * 2;
    p.freq = 2 + Math.random() * 2;
    p.sway = 0.5 + Math.random() * 1;
  } else if (skyKind === "clouds") {
    p.x = Math.random() * (W + 300) - 150;
    p.y = Math.random() * H * 0.6;
    p.r = 35 + Math.random() * 45;
    p.speed = 0.3 + Math.random() * 0.6;
    p.puffs = 3 + Math.floor(Math.random() * 3);
  } else if (skyKind === "mist") {
    p.x = Math.random() * W;
    p.y = H * 0.4 + Math.random() * H * 0.6;
    p.r = 90 + Math.random() * 110;
    p.speed = 0.1 + Math.random() * 0.3;
  }
  return p;
}

function updateParticle(p, dt) {
  if (p.kind === "rain" || p.kind === "thunderstorm") {
    p.y += p.speed * dt * 60;
    p.x += windSpeed * 0.3 * dt * 60;
    if (p.y > H + p.len) {
      p.y = -p.len;
      p.x = Math.random() * W;
    }
  } else if (p.kind === "snow") {
    p.y += p.speed * dt * 60;
    p.phase += p.freq * dt;
    p.x += Math.sin(p.phase) * p.sway * dt * 30 + windSpeed * 0.1 * dt * 60;
    if (p.y > H + 10) {
      p.y = -10;
      p.x = Math.random() * W;
    }
  } else if (p.kind === "clouds" || p.kind === "mist") {
    p.x += p.speed * dt * 60 * (1 + windSpeed * 0.02);
    if (p.x > W + p.r * 2) p.x = -p.r * 2;
  }
}

function drawParticle(p) {
  if (p.kind === "rain" || p.kind === "thunderstorm") {
    ctx.strokeStyle = "rgba(174,194,224,0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + windSpeed * 0.2, p.y - p.len);
    ctx.stroke();
  } else if (p.kind === "snow") {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.kind === "clouds") {
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    for (let i = 0; i < p.puffs; i++) {
      const ox = (i - p.puffs / 2) * p.r * 0.65;
      const oy = Math.sin(i * 1.7) * p.r * 0.18;
      ctx.beginPath();
      ctx.arc(p.x + ox, p.y + oy, p.r * (0.55 + (i % 2) * 0.3), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (p.kind === "mist") {
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSun() {
  const t = Date.now() / 1000;
  const cx = W * 0.78;
  const cy = H * 0.22;
  const R = Math.min(W, H) * 0.07;

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 3);
  glow.addColorStop(0, "rgba(255,220,120,0.5)");
  glow.addColorStop(1, "rgba(255,220,120,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(cx - R * 3, cy - R * 3, R * 6, R * 6);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.3);
  ctx.fillStyle = "rgba(255,200,80,0.35)";
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(R * 1.1, -5);
    ctx.lineTo(R * 1.8, 0);
    ctx.lineTo(R * 1.1, 5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  core.addColorStop(0, "#fff7d6");
  core.addColorStop(0.7, "#ffe066");
  core.addColorStop(1, "#ffb300");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
}

function updateLightning() {
  if (flash > 0) flash -= 0.03;
  nextFlash -= 1 / 60;
  if (nextFlash <= 0) {
    flash = 1;
    nextFlash = 2 + Math.random() * 5;
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flash * 0.7})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  ctx.clearRect(0, 0, W, H);

  if (skyKind === "clear") drawSun();
  if (skyKind === "thunderstorm") updateLightning();

  for (const p of particles) {
    updateParticle(p, dt);
    drawParticle(p);
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);