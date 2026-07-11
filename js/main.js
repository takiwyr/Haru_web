/* ============================================================
   HARU SUSHI — interaction & animation engine
   Lenis smooth scroll + GSAP/ScrollTrigger + micro-interactions
   ============================================================ */
(function () {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const isTouch = matchMedia('(hover:none)').matches || innerWidth < 900;
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  if (gsap && ST) gsap.registerPlugin(ST);

  /* ---------- BRANCHES (mã khớp booking-availability.gs) ---------- */
  const BRANCHES = [
    { code: 'PXL', name: 'Phan Xích Long',      area: 'Q. Phú Nhuận' },
    { code: 'LVS', name: 'Lê Văn Sỹ',           area: 'Quận 3' },
    { code: 'NTP', name: 'Nguyễn Tri Phương',   area: 'Quận 10' },
    { code: 'NTT', name: 'Nguyễn Thị Thập',     area: 'Quận 7' },
    { code: 'NTH', name: 'Nguyễn Thái Học',     area: 'Quận 1' }
  ];
  /* Nếu đã deploy Web App /exec của booking-availability.gs, dán URL vào đây
     để form kiểm tra tình trạng bàn theo khung giờ. Để '' nếu chưa có. */
  const BOOKING_API_URL = '';

  /* ---------- PRELOADER ---------- */
  const preloader = document.getElementById('preloader');
  function killPreloader() {
    if (!preloader) return;
    preloader.classList.add('done');
    setTimeout(() => preloader.remove(), 900);
  }
  window.addEventListener('load', () => setTimeout(killPreloader, RM ? 0 : 1400));
  // safety: never trap the user
  setTimeout(killPreloader, 4200);

  /* ---------- HERO SLIDESHOW (ảnh chạy luân phiên, crossfade) ---------- */
  (function heroSlides() {
    const box = document.querySelector('[data-hero-slides]');
    if (!box) return;
    const slides = [...box.querySelectorAll('.hslide')];
    if (slides.length < 2 || RM) return;
    // nạp ảnh còn lại (đang để data-src cho nhẹ lần đầu)
    slides.forEach(img => { if (img.dataset.src && !img.src) img.src = img.dataset.src; });
    let i = 0;
    setInterval(() => {
      slides[i].classList.remove('is-active');
      i = (i + 1) % slides.length;
      slides[i].classList.add('is-active');
    }, 5200);
  })();

  /* ---------- LENIS smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !RM) {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on('scroll', () => { if (ST) ST.update(); });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (gsap) gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
  }
  // anchor links -> lenis
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeDrawer();
      if (lenis) lenis.scrollTo(target, { offset: -70, duration: 1.2 });
      else target.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
    });
  });

  /* ---------- HEADER scrolled state ---------- */
  const header = document.getElementById('header');
  const onScroll = () => header.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- MOBILE DRAWER ---------- */
  const burger = document.getElementById('burger');
  const drawer = document.getElementById('drawer');
  function closeDrawer() { drawer.classList.remove('open'); burger.classList.remove('open'); }
  burger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = drawer.classList.toggle('open');
    burger.classList.toggle('open', open);
  });
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));
  // dropdown: đóng khi bấm ra ngoài hoặc cuộn trang
  document.addEventListener('click', (e) => {
    if (drawer.classList.contains('open') && !drawer.contains(e.target)) closeDrawer();
  });
  addEventListener('scroll', () => { if (drawer.classList.contains('open')) closeDrawer(); }, { passive: true });

  /* ---------- CUSTOM CURSOR + magnetic ---------- */
  if (!isTouch) {
    const dot = document.getElementById('cursor');
    const ring = document.getElementById('cursorRing');
    const label = document.getElementById('cursorLabel');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    });
    (function ring_raf() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(ring_raf);
    })();
    document.querySelectorAll('[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => {
        ring.classList.add('hover');
        label.textContent = el.getAttribute('data-cursor') || '';
      });
      el.addEventListener('mouseleave', () => { ring.classList.remove('hover'); label.textContent = ''; });
    });
    // magnetic buttons
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.28;
        const y = (e.clientY - r.top - r.height / 2) * 0.4;
        btn.style.transform = `translate(${x}px,${y}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- BUILD branch chips / select / footer ---------- */
  const chips = document.getElementById('branchChips');
  const branchSelect = document.getElementById('branchSelect');
  const footBranches = document.getElementById('footBranches');
  BRANCHES.forEach(b => {
    if (chips) {
      const a = document.createElement('a');
      a.className = 'chip'; a.href = 'https://www.google.com/maps/search/' + encodeURIComponent('Haru Sushi ' + b.name);
      a.target = '_blank'; a.rel = 'noopener'; a.setAttribute('data-cursor', 'Bản đồ');
      a.textContent = b.name + ' · ' + b.area;
      chips.appendChild(a);
    }
    if (branchSelect) {
      const o = document.createElement('option'); o.value = b.code; o.textContent = 'Haru — ' + b.name + ' (' + b.area + ')';
      branchSelect.appendChild(o);
    }
    if (footBranches) {
      const p = document.createElement('a');
      p.href = 'https://www.google.com/maps/search/' + encodeURIComponent('Haru Sushi ' + b.name);
      p.target = '_blank'; p.rel = 'noopener'; p.textContent = b.name;
      footBranches.appendChild(p);
    }
  });
  // re-bind cursor for freshly created chips
  if (!isTouch) {
    const ring = document.getElementById('cursorRing'), label = document.getElementById('cursorLabel');
    document.querySelectorAll('.chip[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => { ring.classList.add('hover'); label.textContent = 'Bản đồ'; });
      el.addEventListener('mouseleave', () => { ring.classList.remove('hover'); label.textContent = ''; });
    });
  }

  /* ---------- TIME slots + date min ---------- */
  const timeSelect = document.getElementById('timeSelect');
  const SLOTS = ['11:00', '11:30', '12:00', '12:30', '13:00', '17:00', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];
  if (timeSelect) SLOTS.forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; timeSelect.appendChild(o); });
  const dateInput = document.getElementById('dateInput');
  if (dateInput) { const d = new Date(); dateInput.min = d.toISOString().split('T')[0]; }

  /* ============================================================
     GSAP ANIMATIONS
     ============================================================ */
  if (gsap && ST && !RM) {

    /* hero giờ chỉ còn ẢNH (không chữ) — bỏ hiệu ứng chữ rise/parallax. */

    /* (Bỏ auto so-le trái/phải cho list — anh thấy trượt hai bên nhức mắt.
       Giờ .mitem/.mrow/.ncard/.pillar/.foot-col chỉ HIỆN LÊN NHẸ, không trượt ngang.) */

    /* generic reveals — editorial calm: CHỦ YẾU fade + rise nhẹ. Chỉ các khối có
       data-reveal="left/right" (story/signature/reserve) giữ chút hướng ngang ±46px.
       NO rotation, NO blur. fromTo so the CSS pre-hide isn't captured as destination. */
    gsap.utils.toArray('[data-reveal]').forEach(el => {
      const dir = el.getAttribute('data-reveal');
      const from = { opacity: 0 };
      const ease = 'power3.out';
      if (dir === 'left')       { from.x = -46; }
      else if (dir === 'right') { from.x = 46;  }
      else if (dir === 'down')  { from.y = -40; }
      else if (dir === 'zoom')  { from.scale = 0.96; }
      else                      { from.y = 30; }
      const delay = parseFloat(el.getAttribute('data-reveal-delay')) || 0;
      const to = { opacity: 1, x: 0, y: 0, scale: 1,
        duration: 1.0, ease, delay,
        scrollTrigger: { trigger: el, start: 'top 86%' } };
      gsap.fromTo(el, from, to);
    });

    /* split-text headings (word by word, preserves spaces) */
    gsap.utils.toArray('[data-split]').forEach(h => {
      const words = h.textContent.trim().split(/\s+/);
      h.innerHTML = words.map(w => `<span class="reveal-word"><span>${w}</span></span>`).join(' ');
      // fromTo with explicit y:0 — gsap reads the CSS translateY(110%) as a px `y`
      // offset, so we must zero it out or yPercent stays additive on top of it
      gsap.fromTo(h.querySelectorAll('.reveal-word > span'),
        { y: 0, yPercent: 110 },
        { yPercent: 0, duration: 0.8, ease: 'power4.out', stagger: 0.05,
          scrollTrigger: { trigger: h, start: 'top 88%' } });
    });

    /* image mask reveal (curtain + inner scale) */
    gsap.utils.toArray('.imgmask').forEach(box => {
      const img = box.querySelector('[data-mask-img], img');
      gsap.set(box, { clipPath: 'inset(0 0 100% 0)' });
      if (img) gsap.set(img, { scale: 1.16 });
      const tl = gsap.timeline({ scrollTrigger: { trigger: box, start: 'top 84%' } });
      tl.to(box, { clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: 'power3.out' })
        .to(img, { scale: 1, duration: 1.5, ease: 'power3.out' }, 0);
    });

    /* rule scale */
    gsap.utils.toArray('.rule').forEach(r => {
      gsap.from(r, { scaleX: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: r, start: 'top 90%' } });
    });

    /* count-up */
    gsap.utils.toArray('[data-count]').forEach(el => {
      const target = +el.dataset.count, pad = +(el.dataset.pad || 0), suf = el.dataset.suffix || '';
      const obj = { v: 0 };
      ST.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(obj, {
          v: target, duration: 1.6, ease: 'power2.out',
          onUpdate: () => { const val = Math.round(obj.v); el.textContent = (pad ? String(val).padStart(pad, '0') : val) + suf; }
        })
      });
    });

    /* watermark parallax */
    gsap.utils.toArray('[data-parallax]').forEach(el => {
      gsap.to(el, {
        y: +el.dataset.parallax, ease: 'none',
        scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    /* reservation bg parallax */
    gsap.utils.toArray('[data-parallax-bg]').forEach(el => {
      gsap.fromTo(el, { yPercent: -12 }, {
        yPercent: 12, ease: 'none',
        scrollTrigger: { trigger: el.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    /* floating PNG items (continuous bob) + scroll drift */
    gsap.utils.toArray('[data-float]').forEach((el, i) => {
      gsap.to(el, { y: '+=18', duration: 2.6 + i * 0.4, ease: 'sine.inOut', repeat: -1, yoyo: true });
      gsap.to(el, {
        y: -(+el.dataset.float), ease: 'none',
        scrollTrigger: { trigger: el.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    /* ---- MENU horizontal scroll (pin) ---- */
    if (!isTouch) {
      const track = document.getElementById('hscrollTrack');
      const wrap = document.getElementById('hscroll');
      const bar = document.getElementById('hscrollBar');
      if (track && wrap) {
        const getScrollAmt = () => track.scrollWidth - innerWidth + 80;
        const tween = gsap.to(track, {
          x: () => -getScrollAmt(), ease: 'none',
          scrollTrigger: {
            trigger: wrap, start: 'top top', end: () => '+=' + getScrollAmt(),
            pin: true, scrub: 1, invalidateOnRefresh: true, refreshPriority: 5,
            onUpdate: (self) => { if (bar) bar.style.width = (self.progress * 100).toFixed(1) + '%'; }
          }
        });
      }
    }

    /* ---- SIGNATURE cinematic pinned moment ---- */
    const sigPin = document.querySelector('.sig-pin');
    if (sigPin) {
      const photo = sigPin.querySelector('[data-sig-photo] img');
      const kanji = sigPin.querySelector('[data-sig-kanji]');
      const lines = gsap.utils.toArray(sigPin.querySelectorAll('[data-sig-line]'));
      // scrub timeline while the scene is pinned: photo settles, kanji brushes in,
      // copy lines rise in sequence, then a slow parting drift as you leave.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sigPin, start: 'top top', end: '+=120%',
          pin: true, scrub: 0.6, invalidateOnRefresh: true,
          anticipatePin: 1,
          // refresh SAU các pin phía trên (2 cine pins) để tính đủ pin-spacer → start đúng
          refreshPriority: 1
        }
      });
      if (photo) tl.fromTo(photo, { scale: 1.18, yPercent: -4 }, { scale: 1.0, yPercent: 4, ease: 'none', duration: 3 }, 0);
      if (kanji) tl.fromTo(kanji, { clipPath: 'inset(0 100% 0 0)', opacity: 0 },
        { clipPath: 'inset(0 0% 0 0)', opacity: 0.16, ease: 'power2.out', duration: 1.4 }, 0.15);
      lines.forEach((el, i) => {
        tl.fromTo(el, { opacity: 0, y: 26 },
          { opacity: 1, y: 0, ease: 'power3.out', duration: 0.7 }, 0.2 + i * 0.28);
      });
    }

    /* ---- CINEMATIC pinned scenes: Câu chuyện + Triết lý ----
       Cùng ngôn ngữ với Signature: ảnh full-bleed lắng lại, kanji thư pháp vẽ nét,
       chữ hiện so-le khi cảnh được GHIM. Chỉ desktop; touch → cảnh tĩnh, chữ hiện sẵn. */
    const cinePins = gsap.utils.toArray('.cine .cine-pin');
    if (!isTouch) {
      cinePins.forEach((pin, i) => {
        const photo = pin.querySelector('[data-cine-photo] img');
        const kanji = pin.querySelector('[data-cine-kanji]');
        const fade = pin.querySelector('[data-cine-fade]');
        const lines = gsap.utils.toArray(pin.querySelectorAll('[data-cine-line]'));
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: pin, start: 'top top', end: '+=135%',
            pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1,
            // pin CAO trên trang → refresh TRƯỚC (ưu tiên cao) để các pin/section dưới tính đúng vị trí
            refreshPriority: 10 - i
          }
        });
        // VÀO: ảnh lắng lại, kanji vẽ nét, chữ hiện so-le
        if (photo) tl.fromTo(photo, { scale: 1.18, yPercent: -4 }, { scale: 1.0, yPercent: 5, ease: 'none', duration: 4 }, 0);
        if (kanji) tl.fromTo(kanji, { clipPath: 'inset(0 100% 0 0)', opacity: 0 },
          { clipPath: 'inset(0 0% 0 0)', opacity: 0.16, ease: 'power2.out', duration: 1.4 }, 0.15);
        lines.forEach((el, i) => {
          tl.fromTo(el, { opacity: 0, y: 26 },
            { opacity: 1, y: 0, ease: 'power3.out', duration: 0.7 }, 0.2 + i * 0.24);
        });
        // RA (đuôi ~cuối pin): chỉ chữ + kanji tan đi, ẢNH GIỮ NGUYÊN.
        // Hai pin cách nhau ~1 màn cuộn thường → KHÔNG phủ đen (sẽ tạo hố đen nửa màn);
        // để ảnh full-bleed của cảnh này trượt lên trong khi ảnh cảnh kế trượt vào từ dưới,
        // mép gặp nhau vốn đã tối nhờ dải veil trên/dưới = chuyển cảnh liền mạch ảnh-sang-ảnh.
        tl.to(lines, { opacity: 0, y: -22, ease: 'power2.in', duration: 0.7 }, 2.9);
        if (kanji) tl.to(kanji, { opacity: 0, ease: 'power2.in', duration: 0.7 }, 2.9);
        if (fade) gsap.set(fade, { opacity: 0 });
      });
    } else {
      // touch (mọi bề rộng): không ghim → hiện chữ, ảnh tĩnh (phòng khi >900px không dính media query)
      cinePins.forEach(pin => {
        gsap.set(pin.querySelectorAll('[data-cine-line]'), { opacity: 1, y: 0 });
        const kanji = pin.querySelector('[data-cine-kanji]');
        if (kanji) gsap.set(kanji, { clipPath: 'inset(0 0% 0 0)', opacity: 0.13 });
        const photo = pin.querySelector('[data-cine-photo] img');
        if (photo) gsap.set(photo, { scale: 1.05 });
      });
    }

    /* ---- DRINKS marquee (infinite, scroll-reactive) ---- */
    const mTrack = document.getElementById('marqueeTrack');
    if (mTrack) {
      // duplicate for seamless loop
      mTrack.innerHTML += mTrack.innerHTML;
      let mx = 0, dir = -1, speed = 0.5, half = mTrack.scrollWidth / 2;
      const refresh = () => { half = mTrack.scrollWidth / 2; };
      addEventListener('resize', refresh);
      gsap.ticker.add(() => {
        mx += dir * speed;
        if (mx <= -half) mx += half; if (mx > 0) mx -= half;
        mTrack.style.transform = `translateX(${mx}px)`;
      });
      // scroll velocity nudges direction/speed
      let last = scrollY;
      addEventListener('scroll', () => {
        const v = scrollY - last; last = scrollY;
        speed = Math.min(3, 0.5 + Math.abs(v) * 0.05);
        if (v !== 0) dir = v > 0 ? -1 : 1;
      }, { passive: true });
    }

    /* ---- CROSS-FADE ĐIỆN ẢNH giữa các section ----
       Mỗi section mờ + đẩy chiều sâu nhẹ khi vào/ra khỏi khung nhìn (scrub theo cuộn):
       section đang rời mờ dần ở đỉnh trong khi section tới hiện dần từ đáy → hai lớp
       chồng-tan vào nhau trên nền tối chung = chuyển cảnh liền mạch như phim.
       Vùng giữa GIỮ opacity đầy (đọc rõ). Loại trừ hero & signature (đã có hiệu ứng pin riêng).
       Chỉ desktop (!isTouch) để mượt & tiết kiệm pin trên mobile. */
    if (!isTouch) {
      gsap.utils.toArray('#menu, #drinks, #spaces, #reserve, #news').forEach(sec => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true }
        });
        // enter (mờ→rõ, đẩy nhẹ lên) · giữ rõ ở giữa (dài) · exit (rõ→mờ, trôi nhẹ lên)
        tl.fromTo(sec, { opacity: 0.4, scale: 0.99, y: 46 },
                       { opacity: 1, scale: 1, y: 0, ease: 'none', duration: 1 })
          .to(sec, { opacity: 1, scale: 1, y: 0, ease: 'none', duration: 3.4 })
          .to(sec, { opacity: 0.4, y: -40, ease: 'none', duration: 1 });
      });
    }

    ST.refresh();
    // ảnh tải xong có thể đổi layout → refresh lại để vị trí pin/section luôn đúng
    window.addEventListener('load', () => ST.refresh());
  } else {
    // reduced motion / no gsap: reveal everything, split not needed
    document.querySelectorAll('[data-hero-word]').forEach(e => e.style.transform = 'none');
    document.querySelectorAll('[data-count]').forEach(el => {
      const suf = el.dataset.suffix || ''; el.textContent = el.dataset.count + suf;
    });
  }

  /* ============================================================
     RESERVATION FORM
     ============================================================ */
  const form = document.getElementById('bookingForm');
  const msg = document.getElementById('formMsg');
  const branchSel = document.getElementById('branchSelect');

  // Optional: fetch availability from Apps Script and disable full slots
  async function loadAvailability() {
    if (!BOOKING_API_URL || !branchSel.value) return;
    try {
      const url = BOOKING_API_URL + (BOOKING_API_URL.includes('?') ? '&' : '?') + 'branch=' + encodeURIComponent(branchSel.value);
      const res = await fetch(url);
      const data = await res.json();
      if (!data.ok || !data.branches) return;
      const str = data.branches[branchSel.value] || '';
      // "10:30: 0, 11:00: 2, ..." -> map slot->booked
      const booked = {};
      str.split(',').forEach(part => {
        const m = part.split(':');
        if (m.length >= 2) booked[m.slice(0, 2).join(':').trim()] = +m[m.length - 1];
      });
      const CAP = 20; // ngưỡng bàn/khung giờ (điều chỉnh theo thực tế)
      [...timeSelect.options].forEach(o => {
        if (!o.value) return;
        const n = booked[o.value];
        o.disabled = (typeof n === 'number' && n >= CAP);
        o.textContent = o.value + (o.disabled ? ' — hết bàn' : '');
      });
    } catch (e) { /* im lặng, không chặn đặt bàn */ }
  }
  if (branchSel) branchSel.addEventListener('change', loadAvailability);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if (!data.name || !data.phone || !data.branch || !data.date || !data.time) {
        msg.className = 'form-msg err'; msg.textContent = 'Vui lòng điền đủ các mục có dấu *.'; return;
      }
      msg.className = 'form-msg'; msg.textContent = 'Đang gửi yêu cầu...';
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        if (BOOKING_API_URL) {
          await fetch(BOOKING_API_URL, {
            method: 'POST', mode: 'no-cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(data).toString()
          });
        }
        const bName = (BRANCHES.find(b => b.code === data.branch) || {}).name || data.branch;
        msg.className = 'form-msg ok';
        msg.innerHTML = 'Cảm ơn <b>' + esc(data.name) + '</b>! Yêu cầu đặt bàn tại <b>Haru ' + esc(bName) +
          '</b> lúc <b>' + esc(data.time) + ' ngày ' + esc(data.date) + '</b> đã được ghi nhận. Haru sẽ gọi xác nhận qua ' + esc(data.phone) + '.';
        form.reset();
        if (dateInput) { const d = new Date(); dateInput.min = d.toISOString().split('T')[0]; }
      } catch (err) {
        msg.className = 'form-msg err';
        msg.textContent = 'Có lỗi xảy ra. Vui lòng gọi hotline 1900 555 506 để đặt bàn.';
      } finally { btn.disabled = false; }
    });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

})();
