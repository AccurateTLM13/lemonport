(function () {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const dom = {
    score: document.getElementById("scoreValue"),
    runGpu: document.getElementById("runGpuValue"),
    bankGpu: document.getElementById("bankGpuValue"),
    best: document.getElementById("bestValue"),
    startBest: document.getElementById("startBest"),
    startBank: document.getElementById("startBank"),
    startOverlay: document.getElementById("startOverlay"),
    pauseOverlay: document.getElementById("pauseOverlay"),
    gameOverOverlay: document.getElementById("gameOverOverlay"),
    upgradeOverlay: document.getElementById("upgradeOverlay"),
    startButton: document.getElementById("startButton"),
    openUpgradesButton: document.getElementById("openUpgradesButton"),
    pauseButton: document.getElementById("pauseButton"),
    resumeButton: document.getElementById("resumeButton"),
    pauseRestartButton: document.getElementById("pauseRestartButton"),
    pauseUpgradesButton: document.getElementById("pauseUpgradesButton"),
    restartButton: document.getElementById("restartButton"),
    gameOverUpgradesButton: document.getElementById("gameOverUpgradesButton"),
    closeUpgradesButton: document.getElementById("closeUpgradesButton"),
    finalScore: document.getElementById("finalScore"),
    finalGpus: document.getElementById("finalGpus"),
    finalBest: document.getElementById("finalBest"),
    failureCause: document.getElementById("failureCause"),
    incidentFeed: document.getElementById("incidentFeed"),
    upgradeBank: document.getElementById("upgradeBank"),
    jumpLevel: document.getElementById("jumpLevel"),
    magnetLevel: document.getElementById("magnetLevel"),
    multiplierLevel: document.getElementById("multiplierLevel"),
    buyButtons: Array.from(document.querySelectorAll(".buy-button"))
  };

  const STORE_KEY = "clanker-cloud-run-v1";
  const MAX_LEVEL = 5;
  const upgradeMeta = {
    jump: { base: 16, step: 12 },
    magnet: { base: 14, step: 10 },
    multiplier: { base: 22, step: 16 }
  };

  const saved = loadSave();
  const state = {
    mode: "menu",
    upgradeReturnMode: "menu",
    view: { w: 960, h: 540, dpr: 1 },
    player: {},
    obstacles: [],
    pickups: [],
    particles: [],
    ghosts: [],
    clouds: [],
    score: 0,
    runGpu: 0,
    bankGpu: saved.bankGpu,
    best: saved.best,
    upgrades: saved.upgrades,
    speed: 330,
    distance: 0,
    obstacleTimer: 0,
    pickupTimer: 0,
    incidentTimer: 0,
    incidentText: "",
    shake: 0,
    dnsGlitch: 0,
    latencyWarp: 0,
    flash: 0,
    grace: 0,
    jumpBuffer: 0,
    lastTime: 0,
    spawnIndex: 0
  };

  function loadSave() {
    const fallback = {
      best: 0,
      bankGpu: 0,
      upgrades: { jump: 0, magnet: 0, multiplier: 0 }
    };

    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY));
      if (!parsed || typeof parsed !== "object") return fallback;
      return {
        best: Number(parsed.best) || 0,
        bankGpu: Number(parsed.bankGpu) || 0,
        upgrades: {
          jump: clampInt(parsed.upgrades && parsed.upgrades.jump),
          magnet: clampInt(parsed.upgrades && parsed.upgrades.magnet),
          multiplier: clampInt(parsed.upgrades && parsed.upgrades.multiplier)
        }
      };
    } catch (error) {
      return fallback;
    }
  }

  function clampInt(value) {
    return Math.max(0, Math.min(MAX_LEVEL, Number(value) || 0));
  }

  function save() {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        best: state.best,
        bankGpu: state.bankGpu,
        upgrades: state.upgrades
      })
    );
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.view.w = Math.max(320, rect.width);
    state.view.h = Math.max(320, rect.height);
    state.view.dpr = dpr;
    canvas.width = Math.floor(state.view.w * dpr);
    canvas.height = Math.floor(state.view.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setPlayerBounds();
    seedClouds();
  }

  function setPlayerBounds() {
    const p = state.player;
    const ground = groundY();
    p.w = Math.max(34, Math.min(48, state.view.w * 0.046));
    p.h = p.w * 1.22;
    p.x = Math.max(76, Math.min(148, state.view.w * 0.16));
    if (!Number.isFinite(p.y)) {
      p.y = ground - p.h;
      p.vy = 0;
      p.grounded = true;
    } else if (p.y + p.h > ground) {
      p.y = ground - p.h;
      p.vy = 0;
      p.grounded = true;
    }
  }

  function groundY() {
    return state.view.h - Math.max(66, Math.min(92, state.view.h * 0.16));
  }

  function seedClouds() {
    if (state.clouds.length) return;
    for (let i = 0; i < 18; i += 1) {
      state.clouds.push({
        x: Math.random() * state.view.w,
        y: 54 + Math.random() * state.view.h * 0.46,
        r: 22 + Math.random() * 64,
        layer: 0.16 + Math.random() * 0.7,
        hue: Math.random()
      });
    }
  }

  function resetRun() {
    state.mode = "playing";
    state.upgradeReturnMode = "playing";
    state.obstacles = [];
    state.pickups = [];
    state.particles = [];
    state.ghosts = [];
    state.score = 0;
    state.runGpu = 0;
    state.speed = 330;
    state.distance = 0;
    state.obstacleTimer = 0.75;
    state.pickupTimer = 0.55;
    state.incidentTimer = 0;
    state.incidentText = "";
    state.shake = 0;
    state.dnsGlitch = 0;
    state.latencyWarp = 0;
    state.flash = 0;
    state.grace = 0.8;
    state.jumpBuffer = 0;
    state.spawnIndex = 0;
    state.player.y = groundY() - state.player.h;
    state.player.vy = 0;
    state.player.grounded = true;
    toggleOverlay(dom.startOverlay, false);
    toggleOverlay(dom.pauseOverlay, false);
    toggleOverlay(dom.gameOverOverlay, false);
    toggleOverlay(dom.upgradeOverlay, false);
    announceIncident("DEPLOY WINDOW OPEN");
    updateHud();
    updateControls();
  }

  function jump() {
    if (state.mode !== "playing") return;
    const p = state.player;
    if (p.grounded || p.coyote > 0) {
      performJump();
    } else {
      state.jumpBuffer = 0.12;
    }
  }

  function performJump() {
    const p = state.player;
    const bonus = 1 + state.upgrades.jump * 0.075;
    p.vy = -Math.min(940, 740 * bonus + state.view.h * 0.15);
    p.grounded = false;
    p.coyote = 0;
    state.jumpBuffer = 0;
    spawnBurst(p.x + p.w * 0.5, p.y + p.h, "#64d9ff", 8);
  }

  function update(dt) {
    if (state.mode !== "playing") {
      state.shake = Math.max(0, state.shake - dt * 24);
      state.flash = Math.max(0, state.flash - dt * 1.8);
      state.incidentTimer = Math.max(0, state.incidentTimer - dt);
      if (state.mode !== "paused") {
        updateParticles(dt);
        updateClouds(dt, 0.4);
      }
      return;
    }

    const multiplier = 1 + state.upgrades.multiplier * 0.12;
    const speedPush = state.latencyWarp > 0 ? 1.28 + Math.sin(state.distance * 0.035) * 0.18 : 1;
    state.speed = Math.min(720, state.speed + 11 * dt);
    state.distance += state.speed * speedPush * dt;
    state.score += (state.speed * 0.032 * multiplier) * dt;
    state.obstacleTimer -= dt;
    state.pickupTimer -= dt;
    state.incidentTimer = Math.max(0, state.incidentTimer - dt);
    state.shake = Math.max(0, state.shake - dt * 24);
    state.dnsGlitch = Math.max(0, state.dnsGlitch - dt);
    state.latencyWarp = Math.max(0, state.latencyWarp - dt);
    state.flash = Math.max(0, state.flash - dt * 1.8);
    state.grace = Math.max(0, state.grace - dt);
    state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);

    updatePlayer(dt);
    updateClouds(dt, speedPush);
    updateObstacles(dt, speedPush);
    updatePickups(dt, speedPush);
    updateParticles(dt);
    updateGhosts(dt);

    if (state.obstacleTimer <= 0) spawnObstacle();
    if (state.pickupTimer <= 0) spawnPickupLine();

    if (state.score > state.best) {
      state.best = Math.floor(state.score);
      save();
    }

    updateHud();
  }

  function updatePlayer(dt) {
    const p = state.player;
    const ground = groundY();
    p.coyote = p.grounded ? 0.08 : Math.max(0, (p.coyote || 0) - dt);
    p.vy += (1650 + state.view.h * 1.1) * dt;
    p.y += p.vy * dt;

    if (p.y + p.h >= ground) {
      p.y = ground - p.h;
      p.vy = 0;
      p.grounded = true;
    } else {
      p.grounded = false;
    }

    if (p.grounded && state.jumpBuffer > 0) {
      performJump();
    }

    if (state.latencyWarp > 0) {
      state.ghosts.push({
        x: p.x,
        y: p.y,
        w: p.w,
        h: p.h,
        life: 0.28
      });
    }
  }

  function updateClouds(dt, speedPush) {
    const w = state.view.w;
    for (const cloud of state.clouds) {
      cloud.x -= state.speed * cloud.layer * 0.16 * speedPush * dt;
      if (cloud.x < -cloud.r * 3) {
        cloud.x = w + cloud.r * 2;
        cloud.y = 54 + Math.random() * state.view.h * 0.46;
        cloud.r = 22 + Math.random() * 64;
        cloud.layer = 0.16 + Math.random() * 0.7;
      }
    }
  }

  function updateObstacles(dt, speedPush) {
    const drift = state.speed * speedPush * dt;
    for (const obstacle of state.obstacles) {
      obstacle.x -= drift * obstacle.speedScale;
      obstacle.age += dt;
      if (obstacle.type === "dns" && obstacle.age > 0.22 && !obstacle.triggered) {
        obstacle.triggered = true;
        state.dnsGlitch = 0.58;
        announceIncident("DNS FAILURE: hazard positions unreliable");
      }
      if (obstacle.type === "latency" && Math.abs(obstacle.x - state.player.x) < 160 && !obstacle.triggered) {
        obstacle.triggered = true;
        state.latencyWarp = 1.35;
        announceIncident("API LATENCY SPIKE: render path wobbling");
      }
    }

    state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.w > -80);

    for (const obstacle of state.obstacles) {
      if (state.grace <= 0 && rectsOverlap(playerHitbox(), obstacleHitbox(obstacle))) {
        endRun(obstacle.label);
        break;
      }
    }
  }

  function updatePickups(dt, speedPush) {
    const magnetRange = 60 + state.upgrades.magnet * 34;
    const p = state.player;
    for (const pickup of state.pickups) {
      pickup.x -= state.speed * speedPush * dt;
      pickup.spin += dt * 7;

      const dx = p.x + p.w * 0.5 - pickup.x;
      const dy = p.y + p.h * 0.45 - pickup.y;
      const dist = Math.hypot(dx, dy);
      if (dist < magnetRange && dist > 1) {
        pickup.x += (dx / dist) * (190 + state.upgrades.magnet * 48) * dt;
        pickup.y += (dy / dist) * (190 + state.upgrades.magnet * 48) * dt;
      }

      if (circleRectOverlap(pickup.x, pickup.y, pickup.r * 0.78, playerHitbox())) {
        pickup.collected = true;
        state.runGpu += 1;
        state.bankGpu += 1;
        state.score += 45 * (1 + state.upgrades.multiplier * 0.12);
        spawnBurst(pickup.x, pickup.y, "#f7c948", 10);
        save();
      }
    }

    state.pickups = state.pickups.filter((pickup) => !pickup.collected && pickup.x + pickup.r > -40);
  }

  function updateParticles(dt) {
    for (const particle of state.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 420 * dt;
      particle.life -= dt;
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);
  }

  function updateGhosts(dt) {
    for (const ghost of state.ghosts) ghost.life -= dt;
    state.ghosts = state.ghosts.filter((ghost) => ghost.life > 0);
  }

  function spawnObstacle() {
    const types = ["region", "latency", "storm", "dns", "rate"];
    const type = types[(state.spawnIndex + Math.floor(Math.random() * 4)) % types.length];
    state.spawnIndex += 1;

    if (type === "storm") {
      const count = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i += 1) {
        state.obstacles.push(makeObstacle("storm", i));
      }
      state.obstacleTimer = randomRange(1.25, 1.75);
      announceIncident("503 STORM: scattered edge traffic");
      state.shake = Math.max(state.shake, 3.6);
      return;
    }

    const obstacle = makeObstacle(type, 0);
    state.obstacles.push(obstacle);
    state.obstacleTimer = randomRange(1.02, 1.72) - Math.min(0.42, state.distance / 26000);
    if (type === "region") announceIncident("REGION OUTAGE: hard failover required");
    if (type === "rate") announceIncident("RATE LIMIT ZONE: stay low");
  }

  function makeObstacle(type, offset) {
    const ground = groundY();
    const x = state.view.w + 70 + offset * randomRange(58, 88);
    if (type === "region") {
      return {
        type,
        label: "Region Outage",
        x,
        y: ground - 138,
        w: 48,
        h: 138,
        speedScale: 1,
        age: 0
      };
    }
    if (type === "latency") {
      return {
        type,
        label: "API Latency Spike",
        x,
        y: ground - 76,
        w: 58,
        h: 76,
        speedScale: 1,
        age: 0
      };
    }
    if (type === "dns") {
      return {
        type,
        label: "DNS Failure",
        x,
        y: ground - 92,
        w: 66,
        h: 92,
        speedScale: 1,
        age: 0,
        triggered: false
      };
    }
    if (type === "rate") {
      return {
        type,
        label: "Rate Limit Zone",
        x,
        y: ground - 182,
        w: 166,
        h: 92,
        speedScale: 1,
        age: 0
      };
    }
    return {
      type,
      label: "503 Storm",
      x,
      y: ground - randomRange(56, 150),
      w: 34,
      h: 34,
      speedScale: randomRange(1.06, 1.24),
      age: 0
    };
  }

  function spawnPickupLine() {
    const ground = groundY();
    const count = 3 + Math.floor(Math.random() * 4);
    const arc = Math.random() > 0.48;
    for (let i = 0; i < count; i += 1) {
      const y = arc
        ? ground - 108 - Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 52
        : ground - randomRange(70, 174);
      state.pickups.push({
        x: state.view.w + 70 + i * 42,
        y,
        r: 13,
        spin: Math.random() * Math.PI,
        collected: false
      });
    }
    state.pickupTimer = randomRange(1.05, 1.9);
  }

  function endRun(label) {
    if (state.mode !== "playing") return;
    state.mode = "gameover";
    state.upgradeReturnMode = "gameover";
    state.shake = 10;
    state.flash = 1;
    const finalScore = Math.floor(state.score);
    if (finalScore > state.best) state.best = finalScore;
    save();
    dom.finalScore.textContent = formatNumber(finalScore);
    dom.finalGpus.textContent = formatNumber(state.runGpu);
    dom.finalBest.textContent = formatNumber(state.best);
    dom.failureCause.textContent = `incident report // ${label}`;
    toggleOverlay(dom.gameOverOverlay, true);
    announceIncident(`${label.toUpperCase()} triggered game over`);
    updateHud();
    updateControls();
    focusFirst(dom.gameOverOverlay);
  }

  function playerHitbox() {
    const p = state.player;
    return {
      x: p.x + p.w * 0.18,
      y: p.y + p.h * 0.12,
      w: p.w * 0.64,
      h: p.h * 0.78
    };
  }

  function obstacleHitbox(obstacle) {
    if (obstacle.type === "storm") {
      return {
        x: obstacle.x + 6,
        y: obstacle.y + 7,
        w: obstacle.w - 12,
        h: obstacle.h - 12
      };
    }
    if (obstacle.type === "rate") {
      return {
        x: obstacle.x + 8,
        y: obstacle.y + 9,
        w: obstacle.w - 16,
        h: obstacle.h - 16
      };
    }
    return {
      x: obstacle.x + 5,
      y: obstacle.y + 4,
      w: obstacle.w - 10,
      h: obstacle.h - 6
    };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function circleRectOverlap(cx, cy, r, rect) {
    const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return dx * dx + dy * dy <= r * r;
  }

  function render() {
    const shakeX = state.shake ? randomRange(-state.shake, state.shake) : 0;
    const shakeY = state.shake ? randomRange(-state.shake, state.shake) : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawBackground();
    drawPickups();
    drawObstacles();
    drawGhosts();
    drawPlayer();
    drawParticles();
    drawForeground();
    ctx.restore();

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 77, 93, ${state.flash * 0.22})`;
      ctx.fillRect(0, 0, state.view.w, state.view.h);
    }
  }

  function drawBackground() {
    const w = state.view.w;
    const h = state.view.h;
    const ground = groundY();
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#080b14");
    sky.addColorStop(0.58, "#101019");
    sky.addColorStop(1, "#090a0d");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "#64d9ff";
    ctx.lineWidth = 1;
    const gridOffset = -((state.distance * 0.08) % 48);
    for (let x = gridOffset; x < w; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 120, ground);
      ctx.stroke();
    }
    ctx.restore();

    for (const cloud of state.clouds) {
      drawCloudCluster(cloud);
    }

    drawDatacenter(w * 0.58 - (state.distance * 0.06) % (w * 0.85), ground - 142, 0.78);
    drawDatacenter(w * 1.05 - (state.distance * 0.04) % (w * 1.1), ground - 106, 0.58);

    ctx.fillStyle = "#11141a";
    ctx.fillRect(0, ground, w, h - ground);
    ctx.fillStyle = "rgba(53, 245, 159, 0.12)";
    for (let x = -((state.distance * 0.8) % 74); x < w; x += 74) {
      ctx.fillRect(x, ground + 16, 38, 3);
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(0, ground, w, 1);
  }

  function drawCloudCluster(cloud) {
    const color = cloud.hue > 0.55 ? "100, 217, 255" : "167, 139, 250";
    ctx.save();
    ctx.globalAlpha = 0.11 + cloud.layer * 0.08;
    ctx.fillStyle = `rgb(${color})`;
    ctx.beginPath();
    ctx.ellipse(cloud.x, cloud.y, cloud.r * 1.55, cloud.r * 0.44, 0, 0, Math.PI * 2);
    ctx.ellipse(cloud.x - cloud.r * 0.62, cloud.y + 4, cloud.r * 0.82, cloud.r * 0.36, 0, 0, Math.PI * 2);
    ctx.ellipse(cloud.x + cloud.r * 0.62, cloud.y + 6, cloud.r * 0.9, cloud.r * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawDatacenter(x, y, scale) {
    const width = 210 * scale;
    const height = 112 * scale;
    const repeatX = state.view.w + width * 1.8;
    while (x < -width) x += repeatX;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(255, 255, 255, 0.045)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.11)";
    ctx.lineWidth = 1;
    roundRect(0, 24, 210, 88, 8, true, true);
    ctx.fillStyle = "rgba(100, 217, 255, 0.16)";
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        ctx.fillRect(18 + col * 26, 42 + row * 18, 12, 6);
      }
    }
    ctx.fillStyle = "rgba(53, 245, 159, 0.1)";
    ctx.beginPath();
    ctx.ellipse(64, 28, 54, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(116, 25, 70, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPickups() {
    for (const pickup of state.pickups) {
      const pulse = Math.sin(pickup.spin) * 0.18 + 1;
      ctx.save();
      ctx.translate(pickup.x, pickup.y);
      ctx.scale(pulse, pulse);
      ctx.rotate(pickup.spin * 0.32);
      ctx.fillStyle = "#f7c948";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
      ctx.lineWidth = 1.5;
      roundRect(-12, -10, 24, 20, 5, true, true);
      ctx.fillStyle = "#16130a";
      ctx.fillRect(-6, -5, 12, 10);
      ctx.fillStyle = "#35f59f";
      ctx.fillRect(-4, -3, 8, 6);
      ctx.restore();
    }
  }

  function drawObstacles() {
    for (const obstacle of state.obstacles) {
      const drawX = state.dnsGlitch > 0 && Math.random() > 0.4
        ? obstacle.x + randomRange(-24, 24)
        : obstacle.x;
      if (obstacle.type === "region") drawRegionOutage(drawX, obstacle);
      if (obstacle.type === "latency") drawLatencySpike(drawX, obstacle);
      if (obstacle.type === "storm") drawStorm(drawX, obstacle);
      if (obstacle.type === "dns") drawDnsFailure(drawX, obstacle);
      if (obstacle.type === "rate") drawRateLimit(drawX, obstacle);
    }
  }

  function drawRegionOutage(x, obstacle) {
    ctx.save();
    ctx.fillStyle = "#ff4d5d";
    ctx.shadowColor = "rgba(255, 77, 93, 0.46)";
    ctx.shadowBlur = 18;
    roundRect(x, obstacle.y, obstacle.w, obstacle.h, 5, true, false);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#19070b";
    ctx.font = "800 10px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.translate(x + obstacle.w * 0.5, obstacle.y + obstacle.h * 0.5);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("REGION OUTAGE", 0, 4);
    ctx.restore();
  }

  function drawLatencySpike(x, obstacle) {
    ctx.save();
    const wobble = Math.sin(obstacle.age * 22) * 5;
    ctx.strokeStyle = "#a78bfa";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x + obstacle.w * 0.5 + wobble, obstacle.y);
    ctx.lineTo(x + obstacle.w - 6 - wobble, obstacle.y + obstacle.h * 0.45);
    ctx.lineTo(x + 18 + wobble, obstacle.y + obstacle.h * 0.45);
    ctx.lineTo(x + obstacle.w * 0.5 - wobble, obstacle.y + obstacle.h);
    ctx.stroke();
    ctx.fillStyle = "rgba(167, 139, 250, 0.18)";
    roundRect(x + 6, obstacle.y + 12, obstacle.w - 12, obstacle.h - 20, 6, true, false);
    ctx.fillStyle = "#f6f7f8";
    ctx.font = "800 9px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.fillText("API", x + obstacle.w * 0.5, obstacle.y + obstacle.h * 0.5 - 2);
    ctx.fillText("LAG", x + obstacle.w * 0.5, obstacle.y + obstacle.h * 0.5 + 10);
    ctx.restore();
  }

  function drawStorm(x, obstacle) {
    ctx.save();
    ctx.translate(x + obstacle.w * 0.5, obstacle.y + obstacle.h * 0.5);
    ctx.rotate(obstacle.age * 5);
    ctx.fillStyle = "#ffb020";
    ctx.strokeStyle = "#261703";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = i % 2 ? obstacle.w * 0.28 : obstacle.w * 0.5;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#201104";
    ctx.font = "800 9px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.fillText("503", 0, 3);
    ctx.restore();
  }

  function drawDnsFailure(x, obstacle) {
    ctx.save();
    ctx.fillStyle = "#64d9ff";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.52)";
    ctx.lineWidth = 1.5;
    roundRect(x, obstacle.y, obstacle.w, obstacle.h, 8, true, true);
    ctx.fillStyle = "#071016";
    ctx.font = "800 10px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.fillText("DNS", x + obstacle.w * 0.5, obstacle.y + 31);
    ctx.fillText("FAIL", x + obstacle.w * 0.5, obstacle.y + 46);
    ctx.fillStyle = "rgba(7, 16, 22, 0.7)";
    ctx.fillRect(x + 12, obstacle.y + 60, obstacle.w - 24, 6);
    ctx.restore();
  }

  function drawRateLimit(x, obstacle) {
    ctx.save();
    ctx.fillStyle = "rgba(247, 201, 72, 0.9)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.52)";
    ctx.lineWidth = 1.5;
    roundRect(x, obstacle.y, obstacle.w, obstacle.h, 8, true, true);
    ctx.fillStyle = "#181103";
    ctx.font = "800 11px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.fillText("RATE LIMIT", x + obstacle.w * 0.5, obstacle.y + 34);
    ctx.fillText("LOW LANE", x + obstacle.w * 0.5, obstacle.y + 53);
    ctx.fillStyle = "rgba(24, 17, 3, 0.24)";
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(x + 10 + i * 31, obstacle.y + obstacle.h - 18, 18, 4);
    }
    ctx.restore();
  }

  function drawGhosts() {
    for (const ghost of state.ghosts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ghost.life / 0.28) * 0.2;
      ctx.fillStyle = "#a78bfa";
      roundRect(ghost.x, ghost.y, ghost.w, ghost.h, 8, true, false);
      ctx.restore();
    }
  }

  function drawPlayer() {
    const p = state.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (state.grace > 0) {
      ctx.strokeStyle = "rgba(53, 245, 159, 0.72)";
      ctx.lineWidth = 2;
      roundRect(-5, -5, p.w + 10, p.h + 10, 10, false, true);
    }
    ctx.fillStyle = "#f6f7f8";
    roundRect(0, 0, p.w, p.h, 8, true, false);
    ctx.fillStyle = "#111317";
    roundRect(p.w * 0.18, p.h * 0.16, p.w * 0.64, p.h * 0.3, 5, true, false);
    ctx.fillStyle = "#35f59f";
    ctx.fillRect(p.w * 0.29, p.h * 0.26, p.w * 0.12, p.h * 0.07);
    ctx.fillRect(p.w * 0.58, p.h * 0.26, p.w * 0.12, p.h * 0.07);
    ctx.fillStyle = "#64d9ff";
    ctx.fillRect(p.w * 0.2, p.h * 0.66, p.w * 0.6, p.h * 0.08);
    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    ctx.fillRect(p.w * 0.1, p.h - 5, p.w * 0.8, 5);
    ctx.restore();
  }

  function drawParticles() {
    for (const particle of state.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      ctx.restore();
    }
  }

  function drawForeground() {
    const ground = groundY();
    const p = state.player;
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(p.x + p.w * 0.5, ground + 7, p.w * 0.7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function spawnBurst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(60, 230);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 70,
        size: randomRange(2, 5),
        color,
        life: randomRange(0.35, 0.72),
        maxLife: 0.72
      });
    }
  }

  function announceIncident(text) {
    state.incidentText = text;
    state.incidentTimer = 1.7;
    dom.incidentFeed.textContent = text;
    dom.incidentFeed.classList.add("is-visible");
    window.clearTimeout(announceIncident.timeoutId);
    announceIncident.timeoutId = window.setTimeout(() => {
      if (state.incidentTimer <= 0.15) dom.incidentFeed.classList.remove("is-visible");
    }, 1500);
  }

  function updateHud() {
    const score = Math.floor(state.score);
    dom.score.textContent = formatNumber(score);
    dom.runGpu.textContent = formatNumber(state.runGpu);
    dom.bankGpu.textContent = formatNumber(state.bankGpu);
    dom.best.textContent = formatNumber(state.best);
    dom.startBest.textContent = formatNumber(state.best);
    dom.startBank.textContent = formatNumber(state.bankGpu);
    updateUpgradePanel();
    updateControls();
  }

  function updateControls() {
    const canPause = state.mode === "playing" || state.mode === "paused";
    dom.pauseButton.disabled = !canPause;
    dom.pauseButton.textContent = state.mode === "paused" ? "Resume" : "Pause";
  }

  function updateUpgradePanel() {
    dom.upgradeBank.textContent = formatNumber(state.bankGpu);
    dom.jumpLevel.textContent = `${state.upgrades.jump}/${MAX_LEVEL}`;
    dom.magnetLevel.textContent = `${state.upgrades.magnet}/${MAX_LEVEL}`;
    dom.multiplierLevel.textContent = `${state.upgrades.multiplier}/${MAX_LEVEL}`;

    for (const button of dom.buyButtons) {
      const key = button.dataset.upgrade;
      const level = state.upgrades[key];
      const atMax = level >= MAX_LEVEL;
      const cost = upgradeCost(key);
      button.textContent = atMax ? "Max" : `Buy ${cost}`;
      button.disabled = atMax || state.bankGpu < cost;
    }
  }

  function upgradeCost(key) {
    const meta = upgradeMeta[key];
    return meta.base + state.upgrades[key] * meta.step;
  }

  function buyUpgrade(key) {
    if (!upgradeMeta[key]) return;
    const level = state.upgrades[key];
    if (level >= MAX_LEVEL) return;
    const cost = upgradeCost(key);
    if (state.bankGpu < cost) return;
    state.bankGpu -= cost;
    state.upgrades[key] += 1;
    save();
    updateHud();
    spawnBurst(state.player.x + state.player.w * 0.5, state.player.y, "#35f59f", 12);
  }

  function toggleOverlay(element, show) {
    element.classList.toggle("overlay--active", show);
  }

  function pauseGame() {
    if (state.mode !== "playing") return;
    state.mode = "paused";
    toggleOverlay(dom.pauseOverlay, true);
    toggleOverlay(dom.upgradeOverlay, false);
    updateControls();
    focusFirst(dom.pauseOverlay);
  }

  function resumeGame() {
    if (state.mode !== "paused") return;
    state.mode = "playing";
    state.upgradeReturnMode = "playing";
    toggleOverlay(dom.pauseOverlay, false);
    toggleOverlay(dom.upgradeOverlay, false);
    state.grace = Math.max(state.grace, 0.45);
    state.lastTime = performance.now();
    updateControls();
    canvas.focus({ preventScroll: true });
  }

  function openUpgrades() {
    state.upgradeReturnMode = state.mode;
    if (state.mode === "playing") state.mode = "paused";
    toggleOverlay(dom.startOverlay, false);
    toggleOverlay(dom.pauseOverlay, false);
    toggleOverlay(dom.gameOverOverlay, false);
    toggleOverlay(dom.upgradeOverlay, true);
    updateUpgradePanel();
    updateControls();
    focusFirst(dom.upgradeOverlay);
  }

  function closeUpgrades() {
    toggleOverlay(dom.upgradeOverlay, false);
    if (state.upgradeReturnMode === "playing" || state.upgradeReturnMode === "paused") {
      state.mode = "paused";
      toggleOverlay(dom.pauseOverlay, true);
      focusFirst(dom.pauseOverlay);
    } else if (state.upgradeReturnMode === "gameover") {
      state.mode = "gameover";
      toggleOverlay(dom.gameOverOverlay, true);
      focusFirst(dom.gameOverOverlay);
    } else {
      state.mode = "menu";
      toggleOverlay(dom.startOverlay, true);
      focusFirst(dom.startOverlay);
    }
    updateControls();
  }

  function focusFirst(container) {
    window.setTimeout(() => {
      const focusable = container.querySelector("button:not([disabled]), a[href]");
      if (focusable) focusable.focus({ preventScroll: true });
    }, 0);
  }

  function isControlTarget(target) {
    return Boolean(target && target.closest && target.closest("button, a, input, select, textarea"));
  }

  function upgradeOverlayActive() {
    return dom.upgradeOverlay.classList.contains("overlay--active");
  }

  function formatNumber(value) {
    return Math.floor(value).toLocaleString("en-US");
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function roundRect(x, y, w, h, radius, fill, stroke) {
    const r = Math.min(radius, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function loop(time) {
    if (!state.lastTime) state.lastTime = time;
    const dt = Math.min(0.033, (time - state.lastTime) / 1000);
    state.lastTime = time;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  dom.startButton.addEventListener("click", resetRun);
  dom.pauseButton.addEventListener("click", () => {
    if (state.mode === "playing") pauseGame();
    else if (state.mode === "paused") resumeGame();
  });
  dom.resumeButton.addEventListener("click", resumeGame);
  dom.pauseRestartButton.addEventListener("click", resetRun);
  dom.pauseUpgradesButton.addEventListener("click", openUpgrades);
  dom.restartButton.addEventListener("click", resetRun);
  dom.openUpgradesButton.addEventListener("click", openUpgrades);
  dom.gameOverUpgradesButton.addEventListener("click", openUpgrades);
  dom.closeUpgradesButton.addEventListener("click", closeUpgrades);
  dom.buyButtons.forEach((button) => {
    button.addEventListener("click", () => buyUpgrade(button.dataset.upgrade));
  });

  canvas.addEventListener("pointerdown", () => {
    if (state.mode === "playing") jump();
  });

  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyP" || event.code === "Escape") {
      if (event.code === "KeyP" && isControlTarget(event.target)) return;
      event.preventDefault();
      if (upgradeOverlayActive()) closeUpgrades();
      else if (state.mode === "playing") pauseGame();
      else if (state.mode === "paused") resumeGame();
      return;
    }

    if (event.code !== "Space" || event.repeat || isControlTarget(event.target)) return;
    event.preventDefault();
    if (upgradeOverlayActive()) return;
    if (state.mode === "menu") resetRun();
    else if (state.mode === "playing") jump();
    else if (state.mode === "gameover") resetRun();
  });

  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.mode === "playing") pauseGame();
  });

  resizeCanvas();
  updateHud();
  requestAnimationFrame(loop);
})();
