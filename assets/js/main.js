(() => {
  "use strict";

  const particleCanvas = document.querySelector("[data-particle-background]");
  const pageContent = document.querySelector("#content");

  if (particleCanvas && pageContent && window.matchMedia("(min-width: 1081px)").matches) {
    const context = particleCanvas.getContext("2d");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = { x: -1000, y: -1000, active: false };
    let particles = [];
    let frameId = 0;
    let viewportWidth = 0;
    let viewportHeight = 0;
    let contentLeft = 0;
    let contentRight = 0;

    const random = (min, max) => min + Math.random() * (max - min);

    const createParticle = (side) => {
      const xMin = side === "left" ? 8 : contentRight + 8;
      const xMax = side === "left" ? contentLeft - 8 : viewportWidth - 8;

      return {
        side,
        x: random(xMin, Math.max(xMin + 1, xMax)),
        y: random(8, Math.max(9, viewportHeight - 8)),
        vx: random(-0.18, 0.18),
        vy: random(-0.18, 0.18),
        radius: random(0.65, 1.15),
      };
    };

    const resizeParticles = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const bounds = pageContent.getBoundingClientRect();
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      contentLeft = Math.max(0, bounds.left);
      contentRight = Math.min(viewportWidth, bounds.right);

      particleCanvas.width = Math.round(viewportWidth * ratio);
      particleCanvas.height = Math.round(viewportHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const leftWidth = Math.max(0, contentLeft);
      const rightWidth = Math.max(0, viewportWidth - contentRight);
      const totalGutterWidth = leftWidth + rightWidth;
      const particleCount = Math.max(14, Math.min(40, Math.round((totalGutterWidth * viewportHeight) / 30000)));
      const leftCount = totalGutterWidth ? Math.round(particleCount * (leftWidth / totalGutterWidth)) : 0;

      particles = Array.from({ length: particleCount }, (_, index) =>
        createParticle(index < leftCount ? "left" : "right"),
      );
    };

    const drawConnection = (first, second, distance, limit, strength = 0.22) => {
      if (distance >= limit) return;
      context.beginPath();
      context.moveTo(first.x, first.y);
      context.lineTo(second.x, second.y);
      context.strokeStyle = `rgba(115, 125, 135, ${(1 - distance / limit) * strength})`;
      context.lineWidth = 0.7;
      context.stroke();
    };

    const renderParticles = () => {
      context.clearRect(0, 0, viewportWidth, viewportHeight);

      particles.forEach((particle) => {
        if (!reducedMotion.matches) {
          particle.x += particle.vx;
          particle.y += particle.vy;

          const xMin = particle.side === "left" ? 6 : contentRight + 6;
          const xMax = particle.side === "left" ? contentLeft - 6 : viewportWidth - 6;
          if (particle.x <= xMin || particle.x >= xMax) particle.vx *= -1;
          if (particle.y <= 6 || particle.y >= viewportHeight - 6) particle.vy *= -1;

          if (pointer.active) {
            const dx = particle.x - pointer.x;
            const dy = particle.y - pointer.y;
            const distance = Math.hypot(dx, dy);
            if (distance > 0 && distance < 90) {
              const force = (90 - distance) / 9000;
              particle.x += dx * force;
              particle.y += dy * force;
            }
          }
        }

        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = "rgba(105, 115, 125, 0.42)";
        context.fill();
      });

      for (let firstIndex = 0; firstIndex < particles.length; firstIndex += 1) {
        const first = particles[firstIndex];

        for (let secondIndex = firstIndex + 1; secondIndex < particles.length; secondIndex += 1) {
          const second = particles[secondIndex];
          if (first.side !== second.side) continue;
          drawConnection(first, second, Math.hypot(first.x - second.x, first.y - second.y), 125);
        }

        if (pointer.active) {
          drawConnection(first, pointer, Math.hypot(first.x - pointer.x, first.y - pointer.y), 150, 0.32);
        }
      }

      if (!reducedMotion.matches) frameId = window.requestAnimationFrame(renderParticles);
    };

    const restartParticles = () => {
      window.cancelAnimationFrame(frameId);
      resizeParticles();
      renderParticles();
    };

    window.addEventListener("resize", restartParticles, { passive: true });
    window.addEventListener(
      "pointermove",
      (event) => {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        pointer.active = event.clientX < contentLeft || event.clientX > contentRight;
      },
      { passive: true },
    );
    document.documentElement.addEventListener("pointerleave", () => {
      pointer.active = false;
    });
    reducedMotion.addEventListener("change", restartParticles);
    restartParticles();
  }

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  document.querySelectorAll("[data-comparison]").forEach((comparison) => {
    const handle = comparison.querySelector(".comparison-handle");
    if (!handle) return;

    const update = (position) => {
      const nextPosition = clamp(position, 0, 100);
      comparison.style.setProperty("--position", `${nextPosition}%`);
      handle.setAttribute("aria-valuenow", String(Math.round(nextPosition)));
    };

    const updateFromPointer = (event) => {
      const bounds = comparison.getBoundingClientRect();
      update(((event.clientX - bounds.left) / bounds.width) * 100);
    };

    comparison.addEventListener("pointerdown", (event) => {
      comparison.setPointerCapture(event.pointerId);
      updateFromPointer(event);
    });

    comparison.addEventListener("pointermove", (event) => {
      if (comparison.hasPointerCapture(event.pointerId)) updateFromPointer(event);
    });

    handle.addEventListener("keydown", (event) => {
      const current = Number(handle.getAttribute("aria-valuenow")) || 50;
      let next = current;

      if (event.key === "ArrowLeft" || event.key === "ArrowDown") next -= 5;
      if (event.key === "ArrowRight" || event.key === "ArrowUp") next += 5;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = 100;

      if (next !== current) {
        event.preventDefault();
        update(next);
      }
    });

    update(50);
  });

  const copyButton = document.querySelector("[data-copy-bibtex]");
  const bibtex = document.querySelector("#bibtex");

  if (copyButton && bibtex) {
    copyButton.addEventListener("click", async () => {
      const originalLabel = copyButton.textContent;
      try {
        await navigator.clipboard.writeText(bibtex.textContent.trim());
        copyButton.textContent = "Copied";
      } catch {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(bibtex);
        selection?.removeAllRanges();
        selection?.addRange(range);
        copyButton.textContent = "Select & copy";
      }

      window.setTimeout(() => {
        copyButton.textContent = originalLabel;
      }, 1800);
    });
  }

})();
