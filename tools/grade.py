#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Haru — grade màu điện ảnh đồng bộ (Phase 0).
Kéo mọi ảnh photographic về 1 tông amber cinematic ấm, tối chân, vignette + grain nhẹ,
để menu / hero / space cùng "1 cuộn phim". GIỮ ảnh gốc, xuất sang assets/graded/<sub>/.

Chạy thử:  python tools/grade.py --preview
Chạy full: python tools/grade.py --all
"""
import sys, os, argparse
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, "assets")
OUT  = os.path.join(ROOT, "assets", "graded")

# ---- Tham số grade (tinh chỉnh ở đây) ----------------------------------------
G = dict(
    # cân bằng trắng: đẩy về amber (R+, B-) — ĐẬM
    wb_r=1.070, wb_g=1.00, wb_b=0.895,
    # chân đen sâu hơn (lift thấp) + highlight ngả kem ấm
    lift=np.array([0.014, 0.008, 0.004]),      # đen sâu hơn → cinematic
    gain=np.array([1.028, 1.006, 0.945]),      # highlight ngả kem đậm
    gamma=1.005,                                # ~1 = midtone tối hơn bản nhẹ
    contrast=1.155,                             # S-curve mạnh hơn
    saturation=0.905,                           # "phim" hơn, tránh chói
    warm_mid=0.042,                             # ấm vùng trung rõ
    vignette=0.44,                              # 4 góc tối sâu → gom nét
    grain=0.022,                                # hạt phim
)

def _srgb_to_lin(x):  return np.where(x <= 0.04045, x/12.92, ((x+0.055)/1.055)**2.4)
def _lin_to_srgb(x):  return np.where(x <= 0.0031308, x*12.92, 1.055*np.clip(x,0,None)**(1/2.4)-0.055)

def grade(img: Image.Image) -> Image.Image:
    rgb = img.convert("RGB")
    a = np.asarray(rgb).astype(np.float32) / 255.0
    h, w, _ = a.shape

    # white balance (ở không gian gamma, đủ tốt & ấm)
    a[..., 0] *= G["wb_r"]; a[..., 1] *= G["wb_g"]; a[..., 2] *= G["wb_b"]

    # làm việc tuyến tính cho lift/gain/contrast
    lin = _srgb_to_lin(np.clip(a, 0, 1))
    lin = lin * G["gain"] + G["lift"]
    lin = np.clip(lin, 0, 1) ** G["gamma"]
    # S-curve contrast quanh 0.5
    lin = np.clip((lin - 0.5) * G["contrast"] + 0.5, 0, 1)
    out = _lin_to_srgb(lin)

    # saturation (luma-preserving)
    luma = (out * np.array([0.2126, 0.7152, 0.0722])).sum(-1, keepdims=True)
    out = luma + (out - luma) * G["saturation"]

    # thêm ấm vùng midtone (mask parabol quanh 0.5)
    mid = 1.0 - np.abs(luma - 0.5) * 2.0
    out[..., 0] += G["warm_mid"] * mid[..., 0]
    out[..., 2] -= G["warm_mid"] * 0.7 * mid[..., 0]

    out = np.clip(out, 0, 1)

    # vignette
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w/2.0, h/2.0
    r = np.sqrt(((xx-cx)/cx)**2 + ((yy-cy)/cy)**2) / np.sqrt(2)
    vig = 1.0 - G["vignette"] * np.clip((r-0.45)/0.55, 0, 1)**2.2
    out *= vig[..., None]

    # grain phim (mịn, cùng 1 hạt cho 3 kênh → không lem màu)
    rng = np.random.default_rng(12345)
    n = rng.standard_normal((h, w, 1)).astype(np.float32) * G["grain"]
    out = np.clip(out + n, 0, 1)

    return Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGB")

def process(rel_src, rel_out, max_w=2000, q=86):
    src = os.path.join(SRC, rel_src)
    dst = os.path.join(OUT, rel_out)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im = Image.open(src)
    if im.width > max_w:
        im = im.resize((max_w, round(im.height*max_w/im.width)), Image.LANCZOS)
    grade(im).save(dst, "WEBP", quality=q, method=6)
    return dst

def preview():
    samples = [
        ("hero/concept-harumarch2-copy.webp", "_preview/hero.webp"),
        ("menu/dish-sushi-haru-34446-copy-2.webp", "_preview/menu.webp"),
        ("space/q7-a-30.webp", "_preview/space.webp"),
    ]
    for s, o in samples:
        print("graded:", process(s, o))

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()
    if args.all:
        # grade toàn bộ ảnh photographic; GIỮ drinks/ + float/ (cutout/màu pop)
        folders = ["hero", "menu", "dishes", "space"]
        total = 0
        for f in folders:
            d = os.path.join(SRC, f)
            if not os.path.isdir(d):
                continue
            for name in sorted(os.listdir(d)):
                if not name.lower().endswith((".webp", ".jpg", ".jpeg", ".png")):
                    continue
                if os.path.isdir(os.path.join(d, name)):
                    continue  # bỏ qua subfolder (vd menu chả có, dishes/cut có)
                try:
                    process(f"{f}/{name}", f"{f}/{name}")
                    total += 1
                    if total % 25 == 0:
                        print(f"  ...{total} imgs")
                except Exception as e:
                    print("  ERR:", f, name, repr(e))
        print(f"DONE: {total} imgs -> assets/graded/")
    elif args.preview:
        preview()
    else:
        print("dùng --preview (3 ảnh mẫu) hoặc --all")
