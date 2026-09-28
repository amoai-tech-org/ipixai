# Video-Specific Transformations

## Important: Format Parameter for Videos

**Critical:** When using `f_auto` on video URLs, you must specify `f_auto:video` to ensure a video is returned (not an image thumbnail):

```
f_auto:video                   # Returns video in optimal format (NOT an image)
f_auto                         # May return an image ⚠️
```

**Always use `f_auto:video` or a specific video format** (`f_mp4`, `f_webm`, etc.) when transforming videos.

## Video Codec (`vc_`)

```
vc_auto                        # Automatic codec selection (recommended)
vc_h264:high:4.1               # H.264 with profile and level
vc_h265, vc_vp8, vc_vp9, vc_av1  # Other codecs
vc_none                        # Remove video, keep audio only
```

**Key options:** h264 profiles (`baseline`, `main`, `high`), levels (`3.0`-`5.2`)

## Trimming Videos (`so_`, `eo_`, `du_`)

```
so_6.5                         # Start at 6.5 seconds
eo_10                          # End at 10 seconds
du_15                          # Duration of 15 seconds
so_10p, eo_90p, du_30p         # Percentage-based (0p-100p)
```

**Value formats:** Seconds (float) or percentage (`10p`)

## Audio Control (`ac_`)

```
ac_none                        # Remove audio track (for autoplay)
ac_aac, ac_mp3, ac_vorbis, ac_opus  # Audio codecs
```

## Frame Rate (`fps_`)

```
fps_30                         # Set FPS (ensures audio sync)
fps_20-25                      # FPS range
```

## Video Concatenation (`fl_splice`)

**Requires a video base.** `fl_splice` concatenates a clip onto a video timeline; the spliced-in asset can be a video or an [image](https://cloudinary.com/documentation/video_concatenation.md?install_source=skillspack&referrer=trans-skill#concatenate_videos_with_images) (set its duration with `du_<seconds>`). It is ignored on image-only transformations.

**Pattern:**
1. Declare: `fl_splice,l_video:<public_id>`
2. Transform overlay (optional)
3. Apply: `fl_layer_apply` (with `so_0` to splice at beginning)

```
c_fill,h_300,w_450/du_5/fl_splice,l_video:second_clip/c_fill,h_300,w_450/du_5/fl_layer_apply
```

**Important:** Both videos should be resized to matching dimensions before splicing

## Animated Images from Video

Use automatic format selection when the consumer accepts the best animated format supported by the requesting browser:

```
du_5/f_auto:animated/q_auto                 # First 5 seconds as the optimal animated format
du_5/e_loop/f_auto:animated/q_auto          # Looping optimal animated format
```

`f_auto:animated` may return animated AVIF, GIF, PNG, or WebP depending on browser support and Cloudinary account capabilities.

If the consumer specifically requires animated WebP, request WebP explicitly and use the required animation flags:

```
du_5/f_webp,fl_animated,fl_awebp/q_auto          # Explicit animated WebP
du_5/e_loop/f_webp,fl_animated,fl_awebp/q_auto   # Looping animated WebP
```

**WRONG — these do NOT explicitly request animated WebP:**
- `fl_animated` alone (missing `fl_awebp` and explicit WebP format)
- `fl_animated,fl_awebp` without `f_webp` or a `.webp` delivery extension
- describing `f_auto:animated` as WebP-only; it performs automatic animated-format selection

**Additional controls:** `e_loop` makes it loop; `vs_N` controls frame sampling rate; `dl_N` controls frame delay (milliseconds).

## Common Video Patterns

```
du_5/vc_auto/f_auto:video/q_auto                             # 5-second video preview
ac_none/vc_h264/f_mp4/q_auto                                 # Silent video (autoplay)
c_limit,h_720/vc_auto/f_auto:video/q_auto                    # 720p cap with auto format
```
