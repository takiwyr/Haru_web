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

  /* ---------- HEADER: chỉ hiện ở hero, cuộn xuống thì ẩn, rê chuột lên mép trên gọi lại ----------
     Thanh này trong suốt và nằm đè lên nội dung; qua khỏi hero thì nó chỉ còn
     che chữ chứ không giúp gì, nên cho nó lui ra.
     Gọi lại bằng mousemove chứ không bằng :hover trên chính header: khi đã
     translateY(-100%) thì header nằm ngoài màn hình, không có gì để rê chuột
     vào cả — phải nghe con trỏ tới gần MÉP TRÊN của viewport.
     Ngưỡng ẩn lấy theo đáy hero (trừ 80px) chứ không phải một con số cứng, để
     thanh biến mất đúng lúc rời mục 1 dù màn hình cao thấp khác nhau. */
  const header = document.getElementById('header');
  const heroSec = document.getElementById('hero');
  const HOVER_ZONE = 90;   // px tính từ mép trên viewport
  let nearTop = false;
  const syncHeader = () => {
    const pastHero = scrollY > (heroSec ? heroSec.offsetHeight - 80 : 40);
    header.classList.toggle('scrolled', scrollY > 40);
    header.classList.toggle('is-hidden', pastHero && !nearTop && !drawer.classList.contains('open'));
  };
  addEventListener('scroll', syncHeader, { passive: true });
  addEventListener('mousemove', (e) => {
    const n = e.clientY <= HOVER_ZONE;
    if (n !== nearTop) { nearTop = n; syncHeader(); }
  }, { passive: true });

  /* ---------- MOBILE DRAWER ---------- */
  const burger = document.getElementById('burger');
  const drawer = document.getElementById('drawer');
  // syncHeader đọc drawer nên chỉ chạy được từ đây trở đi
  syncHeader();
  function closeDrawer() { drawer.classList.remove('open'); burger.classList.remove('open'); syncHeader(); }
  burger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = drawer.classList.toggle('open');
    burger.classList.toggle('open', open);
    syncHeader();
  });
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));
  // dropdown: đóng khi bấm ra ngoài hoặc cuộn trang
  document.addEventListener('click', (e) => {
    if (drawer.classList.contains('open') && !drawer.contains(e.target)) closeDrawer();
  });
  addEventListener('scroll', () => { if (drawer.classList.contains('open')) closeDrawer(); }, { passive: true });

  /* ---------- CUSTOM CURSOR + magnetic — ĐÃ GỠ ----------
     Phong cách Ryo là tĩnh: bỏ con trỏ tuỳ biến và hiệu ứng nam châm cho nút.
     Các thuộc tính data-cursor còn lại trong HTML giờ vô hại. */

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
  if (!isTouch && document.getElementById('cursorRing')) {
    const ring = document.getElementById('cursorRing'), label = document.getElementById('cursorLabel');
    document.querySelectorAll('.chip[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => { ring.classList.add('hover'); label.textContent = 'Bản đồ'; });
      el.addEventListener('mouseleave', () => { ring.classList.remove('hover'); label.textContent = ''; });
    });
  }

  /* ---------- SPACES accordion (rê chuột mở, chạm để mở trên mobile) ---------- */
  const accordion = document.getElementById('spaceAccordion');
  if (accordion) {
    const panels = [...accordion.querySelectorAll('.spanel')];
    const open = p => { panels.forEach(x => x.classList.toggle('is-open', x === p)); };
    panels.forEach(p => {
      if (!isTouch) p.addEventListener('mouseenter', () => open(p));
      p.addEventListener('click', () => open(p));
    });
    if (!isTouch) accordion.addEventListener('mouseleave', () => open(panels[0]));
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
      const dist = parseFloat(el.getAttribute('data-reveal-dist')) || 46;
      if (dir === 'left')       { from.x = -dist; }
      else if (dir === 'right') { from.x = dist;  }
      else if (dir === 'down')  { from.y = -40; }
      else if (dir === 'zoom')  { from.scale = 0.96; }
      else                      { from.y = 30; }
      const delay = parseFloat(el.getAttribute('data-reveal-delay')) || 0;
      const to = { opacity: 1, x: 0, y: 0, scale: 1,
        duration: 1.0, ease, delay,
        scrollTrigger: { trigger: el, start: 'top 86%' } };
      gsap.fromTo(el, from, to);
    });

    /* split-text headings (word by word, preserves spaces)
       Dấu "|" trong nội dung = điểm xuống dòng do người viết chỉ định, để tiêu đề
       luôn ngắt đúng cụm nghĩa thay vì để trình duyệt bẻ tuỳ bề rộng. Mỗi cụm thành
       một .reveal-line (display:block); cụm nào vẫn dài quá thì mới tự wrap tiếp. */
    gsap.utils.toArray('[data-split]').forEach(h => {
      const lines = h.textContent.trim().split('|').map(s => s.trim()).filter(Boolean);
      h.innerHTML = lines.map(line =>
        `<span class="reveal-line">` +
        line.split(/\s+/).map(w => `<span class="reveal-word"><span>${w}</span></span>`).join(' ') +
        `</span>`).join('');
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

    /* ---- BA ĐIỀU (Our Story): trượt bất đối xứng theo cuộn ----
       Ảnh tràn mép trượt vào từ phía mép của nó, chữ trôi CÙNG chiều rồi lắng lại
       (ảnh đi xa hơn chữ → sinh chiều sâu). Khối .reverse đảo hướng. Chỉ desktop;
       mobile/cảm ứng/giảm-chuyển-động đã được CSS hiện sẵn (opacity:1). */
    if (!isTouch) {
      gsap.utils.toArray('.story3 .s3-item').forEach(item => {
        const media = item.querySelector('.s3-media');
        const img   = media && media.querySelector('img');
        const copy  = item.querySelector('.s3-copy');
        const rev   = item.classList.contains('reverse');
        if (media) gsap.fromTo(media,
          { xPercent: rev ? 18 : -18, opacity: 0 },
          { xPercent: 0, opacity: 1, ease: 'none',
            scrollTrigger: { trigger: item, start: 'top 90%', end: 'top 46%', scrub: 0.6 } });
        if (img) gsap.fromTo(img,
          { scale: 1.12 },
          { scale: 1, ease: 'none',
            scrollTrigger: { trigger: item, start: 'top 90%', end: 'top 30%', scrub: 0.6 } });
        if (copy) gsap.fromTo(copy,
          { x: rev ? 64 : -64, opacity: 0 },
          { x: 0, opacity: 1, ease: 'none',
            scrollTrigger: { trigger: item, start: 'top 84%', end: 'top 50%', scrub: 0.6 } });
      });
    }

    /* rule scale */
    gsap.utils.toArray('.rule').forEach(r => {
      gsap.from(r, { scaleX: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: r, start: 'top 90%' } });
    });

    /* watermark parallax */
    gsap.utils.toArray('[data-parallax]').forEach(el => {
      gsap.to(el, {
        y: +el.dataset.parallax, ease: 'none',
        scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    /* reservation bg parallax */
    /* Biên độ đọc từ chính thuộc tính (data-parallax-bg="6"), mặc định 12.
       Vì sao cần chỉnh riêng: mask làm mờ mép ảnh được vẽ trong HỆ TOẠ ĐỘ CỦA
       CHÍNH PHẦN TỬ, nên khi phần tử bị dịch xuống thì vùng tan cũng đi theo —
       nó tụt xuống dưới mép section và bị overflow:hidden cắt phăng, để lộ lại
       đúng đường kẻ ngang mà mask sinh ra để xoá. Ở hero, dịch 12% = 87px là quá
       nhiều so với dải tan; hạ xuống 6% thì vùng tan luôn nằm trong khung. */
    gsap.utils.toArray('[data-parallax-bg]').forEach(el => {
      const amt = parseFloat(el.dataset.parallaxBg) || 12;
      gsap.fromTo(el, { yPercent: -amt }, {
        yPercent: amt, ease: 'none',
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

    /* ---- CROSS-FADE ĐIỆN ẢNH giữa các section ----
       Mỗi section mờ + đẩy chiều sâu nhẹ khi vào/ra khỏi khung nhìn (scrub theo cuộn):
       section đang rời mờ dần ở đỉnh trong khi section tới hiện dần từ đáy → hai lớp
       chồng-tan vào nhau trên nền tối chung = chuyển cảnh liền mạch như phim.
       Vùng giữa GIỮ opacity đầy (đọc rõ). Loại trừ hero & signature (đã có hiệu ứng pin riêng).
       Chỉ desktop (!isTouch) để mượt & tiết kiệm pin trên mobile. */
    if (!isTouch) {
      // #reserve giờ là footer (phần tử cuối trang) — bỏ khỏi danh sách cross-fade
      // để chân trang không bị mờ đi khi cuộn đến đáy (không còn nội dung phía dưới)
      gsap.utils.toArray('#menu, #spaces, #news').forEach(sec => {
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

  /* ---------- ĐẶT BÀN 2 BƯỚC (theo web.pdf) ----------
     Bước 1 tìm bàn → còn bàn thì mở bước 2 (điền thông tin), hết bàn thì
     cảnh báo + gợi ý khung giờ trống gần nhất.
     CHƯA CÓ BACKEND: tình trạng bàn đang được GIẢ LẬP ở hàm checkAvailability()
     bên dưới (khung giờ cao điểm cuối tuần = kín). Khi có API thật, chỉ cần
     thay thân hàm đó bằng một lời gọi fetch — phần UI không phải sửa gì. */
  const step1 = document.getElementById('bkStep1');
  const step2 = document.getElementById('bkStep2');
  const bkFind = document.getElementById('bkFind');
  const bkBack = document.getElementById('bkBack');
  const bkAlert = document.getElementById('bkAlert');
  const bkSuggest = document.getElementById('bkSuggest');
  const bkRecap = document.getElementById('bkRecap');
  const PEAK = ['18:30', '19:00', '19:30'];   // khung giờ hay kín

  function readStep1() {
    return {
      branch: branchSel ? branchSel.value : '',
      date: dateInput ? dateInput.value : '',
      time: timeSelect ? timeSelect.value : '',
      guests: +(document.getElementById('rvGuests') || {}).value || 0
    };
  }
  // GIẢ LẬP: cuối tuần + khung giờ cao điểm + nhóm trên 6 khách ⇒ báo kín bàn.
  function checkAvailability(q) {
    const day = new Date(q.date + 'T00:00:00').getDay();   // 0 CN, 6 T7
    const weekend = day === 0 || day === 6;
    return !(weekend && PEAK.includes(q.time) && q.guests > 6);
  }
  // các khung giờ còn trống gần nhất quanh giờ đã chọn
  function suggestSlots(q) {
    const i = SLOTS.indexOf(q.time);
    return SLOTS
      .map((t, j) => ({ t, d: Math.abs(j - i) }))
      .filter(o => o.d > 0 && checkAvailability({ ...q, time: o.t }))
      .sort((a, b) => a.d - b.d).slice(0, 4).map(o => o.t);
  }
  function showStep(n) {
    if (!step1 || !step2) return;
    step1.hidden = n !== 1; step2.hidden = n !== 2;
    step1.classList.toggle('is-active', n === 1);
    step2.classList.toggle('is-active', n === 2);
    if (lenis) lenis.scrollTo(document.getElementById('reserve'), { offset: -70, duration: .8 });
  }
  if (bkFind) {
    bkFind.addEventListener('click', () => {
      const q = readStep1();
      if (!q.branch || !q.date || !q.time || !q.guests) {
        msg.className = 'form-msg err'; msg.textContent = 'Vui lòng chọn chi nhánh, ngày, giờ và số khách.'; return;
      }
      msg.className = 'form-msg'; msg.textContent = '';
      if (checkAvailability(q)) {
        bkAlert.hidden = true;
        const bName = (BRANCHES.find(b => b.code === q.branch) || {}).name || q.branch;
        bkRecap.innerHTML = '<b>' + esc(String(q.guests)) + ' người</b><span></span><b>' +
          esc(q.date.split('-').reverse().join('-')) + '</b><span></span><b>' + esc(q.time) +
          '</b><span></span>Haru ' + esc(bName);
        showStep(2);
      } else {
        bkSuggest.innerHTML = '';
        suggestSlots(q).forEach(t => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'bk-slot'; b.textContent = t;
          b.addEventListener('click', () => { timeSelect.value = t; bkAlert.hidden = true; bkFind.click(); });
          bkSuggest.appendChild(b);
        });
        bkAlert.hidden = false;
      }
    });
  }
  if (bkBack) bkBack.addEventListener('click', () => { showStep(1); });

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
        showStep(1);
      } catch (err) {
        msg.className = 'form-msg err';
        msg.textContent = 'Có lỗi xảy ra. Vui lòng gọi hotline 1900 555 506 để đặt bàn.';
      } finally { btn.disabled = false; }
    });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

})();
