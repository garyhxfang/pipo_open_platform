import "./base-path.js";

const canvas = document.querySelector("#flow-canvas");
const stage = document.querySelector(".motion-stage");
const context = canvas.getContext("2d");
const header = document.querySelector("[data-header]");
const menuButton = document.querySelector(".menu-button");
const nav = document.querySelector(".main-nav");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let width = 0;
let height = 0;
let pixelRatio = 1;
let animationFrame = 0;
let startTime = performance.now();
let isPaused = reducedMotion.matches;
let lastRenderTime = 0;
let particles = [];
let dust = [];

const paths = [
  { y: 0.26, amp: 0.12, phase: 0.1, bend: 0.08, color: [36, 88, 245] },
  { y: 0.37, amp: 0.08, phase: 0.44, bend: -0.04, color: [39, 103, 248] },
  { y: 0.49, amp: 0.14, phase: 0.72, bend: 0.1, color: [54, 115, 252] },
  { y: 0.6, amp: 0.1, phase: 0.2, bend: -0.08, color: [49, 200, 229] },
];

const events = [
  { path: 0, t: 0.32, offset: 0, life: 6800, color: [36, 88, 245] },
  { path: 3, t: 0.66, offset: 2800, life: 7400, color: [57, 200, 231] },
];

const trails = [
  { path: 1, offset: 600, speed: 0.000052, span: 0.07, color: [41, 103, 248] },
  { path: 3, offset: 3300, speed: 0.000045, span: 0.06, color: [57, 200, 231] },
];

function resizeCanvas() {
  const bounds = stage.getBoundingClientRect();
  width = bounds.width;
  height = bounds.height;
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  particles = Array.from({ length: 64 }, (_, index) => ({
    pathIndex: index % paths.length,
    progress: Math.random(),
    speed: 0.000015 + Math.random() * 0.000025,
    size: 0.55 + Math.random() * 1.35,
    alpha: 0.12 + Math.random() * 0.42,
    drift: (Math.random() - 0.5) * 8,
    pulse: Math.random() * Math.PI * 2,
  }));

  dust = Array.from({ length: 38 }, () => ({
    x: width * (0.08 + Math.random() * 0.88),
    y: height * (0.12 + Math.random() * 0.76),
    size: 0.35 + Math.random() * 1.05,
    alpha: 0.03 + Math.random() * 0.09,
    phase: Math.random() * Math.PI * 2,
    cyan: Math.random() > 0.88,
  }));
}

function pointOnPath(path, progress, time) {
  const eased = progress * progress * (3 - 2 * progress);
  const x = width * (0.06 + eased * 0.89);
  const wave = Math.sin(progress * Math.PI * 2.1 + path.phase * 6.28 + time * 0.00012);
  const taper = Math.sin(Math.PI * progress);
  const y = height * (path.y + wave * path.amp * taper + path.bend * (progress - 0.5));
  return { x, y };
}

function drawTrajectory(path, time, alpha) {
  context.beginPath();
  for (let index = 0; index <= 100; index += 1) {
    const point = pointOnPath(path, index / 100, time);
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  }
  context.strokeStyle = `rgba(${path.color.join(",")}, ${alpha})`;
  context.lineWidth = 0.65;
  context.stroke();
}

function drawEvent(event, time) {
  const phase = ((time + event.offset) % event.life) / event.life;
  const point = pointOnPath(paths[event.path], event.t, time);
  const appear = Math.min(1, phase / 0.08);
  const fade = Math.max(0, 1 - Math.max(0, phase - 0.14) / 0.42);
  const alpha = appear * fade;
  if (alpha <= 0.002) return;

  [0, 0.12].forEach((delay, index) => {
    const local = Math.max(0, phase - delay);
    if (local > 0.48) return;
    const progress = local / 0.48;
    const radius = 7 + progress * (index ? 27 : 39);
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.strokeStyle = `rgba(${event.color.join(",")}, ${(1 - progress) * 0.24 * alpha})`;
    context.lineWidth = index ? 0.65 : 0.85;
    context.stroke();
  });

  const core = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, 12);
  core.addColorStop(0, `rgba(${event.color.join(",")}, ${0.42 * alpha})`);
  core.addColorStop(0.18, `rgba(${event.color.join(",")}, ${0.17 * alpha})`);
  core.addColorStop(1, `rgba(${event.color.join(",")}, 0)`);
  context.fillStyle = core;
  context.beginPath();
  context.arc(point.x, point.y, 12, 0, Math.PI * 2);
  context.fill();
}

function drawTrail(trail, time) {
  const head = ((time + trail.offset) * trail.speed) % 1;
  const path = paths[trail.path];
  const segments = 18;
  context.lineCap = "round";

  for (let index = 0; index < segments; index += 1) {
    const start = head - trail.span * (index / segments);
    const end = head - trail.span * ((index + 1) / segments);
    if (end < 0 || start > 1) continue;
    const pointOne = pointOnPath(path, Math.max(0, start), time);
    const pointTwo = pointOnPath(path, Math.max(0, end), time);
    const strength = 1 - index / segments;
    context.beginPath();
    context.moveTo(pointOne.x, pointOne.y);
    context.lineTo(pointTwo.x, pointTwo.y);
    context.strokeStyle = `rgba(${trail.color.join(",")}, ${0.22 * strength})`;
    context.lineWidth = 0.7 + strength * 0.8;
    context.stroke();
  }

  const headPoint = pointOnPath(path, head, time);
  context.fillStyle = `rgba(${trail.color.join(",")}, 0.62)`;
  context.beginPath();
  context.arc(headPoint.x, headPoint.y, 1.8, 0, Math.PI * 2);
  context.fill();
}

function render(now) {
  context.clearRect(0, 0, width, height);
  const delta = !isPaused && lastRenderTime ? Math.min(34, now - lastRenderTime) : 0;
  lastRenderTime = now;
  const activeTime = isPaused ? 0 : now - startTime;

  const bloom = context.createRadialGradient(
    width * 0.61,
    height * 0.46,
    0,
    width * 0.61,
    height * 0.46,
    width * 0.42,
  );
  bloom.addColorStop(0, "rgba(73, 119, 255, .045)");
  bloom.addColorStop(0.46, "rgba(61, 173, 242, .018)");
  bloom.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = bloom;
  context.fillRect(0, 0, width, height);

  paths.forEach((path, index) => {
    drawTrajectory(path, activeTime, index === 2 ? 0.075 : 0.045);
  });

  dust.forEach((particle) => {
    const pulse = 0.72 + Math.sin(activeTime * 0.00045 + particle.phase) * 0.28;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fillStyle = particle.cyan
      ? `rgba(57, 200, 231, ${particle.alpha * pulse})`
      : `rgba(67, 91, 145, ${particle.alpha * pulse})`;
    context.fill();
  });

  particles.forEach((particle) => {
    if (!isPaused) {
      particle.progress = (particle.progress + particle.speed * delta) % 1;
    }

    const path = paths[particle.pathIndex];
    const position = pointOnPath(path, particle.progress, activeTime);
    const focus = Math.sin(Math.PI * particle.progress);
    const pulse = 0.78 + Math.sin(activeTime * 0.001 + particle.pulse) * 0.22;
    const y = position.y + particle.drift * focus;
    const radius = particle.size * (0.76 + focus * 0.36);
    const alpha = particle.alpha * (0.22 + focus * 0.78) * pulse;

    if (radius > 1.45) {
      const halo = context.createRadialGradient(position.x, y, 0, position.x, y, radius * 4);
      halo.addColorStop(0, `rgba(${path.color.join(",")}, ${alpha * 0.2})`);
      halo.addColorStop(1, `rgba(${path.color.join(",")}, 0)`);
      context.fillStyle = halo;
      context.beginPath();
      context.arc(position.x, y, radius * 4, 0, Math.PI * 2);
      context.fill();
    }

    context.fillStyle = `rgba(${path.color.join(",")}, ${alpha})`;
    context.beginPath();
    context.arc(position.x, y, radius, 0, Math.PI * 2);
    context.fill();
  });

  trails.forEach((trail) => drawTrail(trail, activeTime));
  events.forEach((event) => drawEvent(event, activeTime));

  if (!isPaused) {
    animationFrame = requestAnimationFrame(render);
  }
}

if (isPaused) {
  document.body.classList.add("motion-paused");
}

document.querySelectorAll(".choice").forEach((choice) => {
  choice.addEventListener("click", () => {
    document.querySelectorAll(".choice").forEach((item) => {
      item.classList.remove("active");
      item.querySelector("i").textContent = "+";
    });
    choice.classList.add("active");
    choice.querySelector("i").textContent = "✓";
  });
});

menuButton.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  });
});

window.addEventListener(
  "scroll",
  () => header.classList.toggle("scrolled", window.scrollY > 24),
  { passive: true },
);

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
render(performance.now());
