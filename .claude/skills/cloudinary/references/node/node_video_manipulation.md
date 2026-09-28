---
name: cloudinary-node-video-transformations
description: >
  Node.js video transformation URLs — transcode, trim, streaming formats from server
  code. Load when building programmatic video URLs or transforms in Node.
license: MIT
metadata:
  author: cloudinary
  hub: cloudinary
  topic: node
  version: '1.0.0'
---

> ## Documentation Index
> This page is part of the Image and Video APIs product. Fetch the complete documentation index for Image and Video APIs at: https://cloudinary.com/documentation/llms-image-and-video-apis.txt?referrer=docpage and then use it to discover all relevant pages before exploring further.
> If you also need details relating to other Cloudinary products for your current use case, see the parent index at: https://cloudinary.com/documentation/llms.txt?referrer=docpage

# Node.js video transformations

## Overview

After uploading videos to Cloudinary, they can be transformed in many ways. 

The syntax for transforming and delivering videos is generally the same as that for images, and you can apply the majority of available image transformations to video as well. For example, you can resize, crop, rotate, set video quality and format or use auto quality and/or auto_format, add text or image overlays to your videos, and more. 

There are also a number of special options you can use for transforming and delivering video content. For example, you can adjust their size, shape, speed, duration, quality, and appearance. There are also some features that are specific to audio.  

This section introduces you to the basics of Node.js video streaming and transformation.   
For complete details on all video transformation functionality, see [Video transformations](video_manipulation_and_delivery) and the [Transformation URL API Reference](transformation_reference).

## Video transformation functionality
In addition to transformation features that are equally relevant for images and video, such as resizing, cropping, rotating, adding text or image overlays, and setting video quality or format, there are a variety of special transformations you can use for video. For example, you can:
 
* [Transcode videos](video_transcoding) from one format to another
* Apply [video effects](video_effects_and_enhancements) such as fade-in/out, accelerating or decelerating, adjusting volume, playing in reverse
* Play [video-in-video](video_layers#video_overlays), [trim](video_trimming#trimming_videos) videos, or [concatenate](video_concatenation) multiple videos
* Set [video](video_manipulation_and_delivery#video_codec_settings) and [audio](audio_transformations#audio_settings) quality options such as bitrate, video codec, audio sampling frequency, or audio codec
* Adjust the visual tone of your video with [3-color-dimension LUTs](video_color_effects#3_color_dimension_luts_3d_luts)
* Generate [thumbnails](video_previews_and_posters#video_thumbnails) or [animated](videos_to_animated_images) images from video
* Deliver your video using [adaptive bitrate streaming](adaptive_bitrate_streaming) in HLS or MPEG-DASH

You can optionally specify all of the above transformations to videos using methods that generate image tags or via direct URL-building directives.

### Video tag helper method

You can optionally specify all of the above transformations within a `cloudinary.video` method, which automatically generates an HTML5 video tag including the transformation URL sources for the main formats supported by web browsers (`webm`, `mp4` and `ogv`), as well as a poster thumbnail image. This enables the browser to automatically select and play the video format it supports. The video files are created dynamically when first accessed by your users. 

For example:

```nodejs
cloudinary.video("blue_sports_car",
    {loop:true, controls:true,
     transformation:
        {height: 360, width: 480, quality: 70, duration: 10, crop: "pad"},
     fallback_content:"Your browser does not support HTML5 video tags."}
    )
```  

The above statement results in the following HTML:

```html
<video controls loop poster=\'https://res.cloudinary.com/demo/video/upload/c_pad,du_10,h_360,q_70,w_480/blue_sports_car.jpg\'>
  <source src=\'https://res.cloudinary.com/demo/video/upload/c_pad,du_10,h_360,q_70,w_480/blue_sports_car.webm\' type=\'video/webm\'>
  <source src=\'https://res.cloudinary.com/demo/video/upload/c_pad,du_10,h_360,q_70,w_480/blue_sports_car.mp4\' type=\'video/mp4\'>
  <source src=\'https://res.cloudinary.com/demo/video/upload/c_pad,du_10,h_360,q_70,w_480/blue_sports_car.ogv\' type=\'video/ogg\'>
  Your browser does not support HTML5 video tags.
</video>
```

You can also add other, non-transformation parameters to the `cloudinary.video` method such as the asset version, configuration parameters and HTML5 video tag attributes.
* The `version` parameter is added to the delivery URL as explained in [Asset versions](advanced_url_delivery_options#asset_versions).
* [Configuration parameters](cloudinary_sdks#configuration_parameters) that you specify here override any that you have set globally.
* [HTML5 video tag attributes](https://www.w3schools.com/tags/tag_video.asp) are added to the resulting `<video>` tag. The video is delivered from Cloudinary using the width and height in the transformation but is displayed at the dimensions specified in the tag.

For details, see the [video tag](video_manipulation_and_delivery#embedding_videos_in_web_pages_using_sdks) documentation and the [HTML5 Video Player](https://cloudinary.com/blog/how_to_get_the_most_from_the_html5_video_player) blog post.

### Direct URL builder

The `cloudinary.video` method described above generates an HTML5 video tag. In certain conditions, you might want to generate a transformation URL directly, without the containing video tag. To return only the URL, use the `cloudinary.url` helper method. 

Here's an example:

```nodejs
cloudinary.url("docs/sunglasses.mp4", 
  {resource_type: "video",
  transformation: [
    {startOffset: "7.5", endOffset: "10"},
    {effect: "boomerang"},
    {width: "0.2", crop: "scale"}
  ]})

// Output: "https://res.cloudinary.com/demo/video/upload/so_7.5,eo_10.0/e_boomerang/c_scale,w_0.2/v1/docs/sunglasses.mp4"
```

## Video transformation examples 
This section provides examples of using Node.js to apply some of the video transformation features mentioned in the previous section.

#### Example 1: 
The following example resizes the video to 30% of it's original size and rounds the corners by 20 pixels. It also adds a semi-transparent Cloudinary logo in the bottom right corner, using a southeast gravity with adjusted x and y coordinates to reach the corner of the video.

```nodejs
cloudinary.video("glide-over-coastal-beach", {controls:true, transformation: [
    {width: 0.3, radius: 20},
    {overlay: "cloudinary_icon_white", width: 60, opacity: 50, gravity: "south_east", y: 15, x: 60}
    ]})
```

![video with cloudinary icon](https://res.cloudinary.com/demo/video/upload/w_0.3,r_20/l_cloudinary_icon_white,w_60,o_50,g_south_east,y_15,x_60/glide-over-coastal-beach.mp4 "with_url: false, with_code: false, poster:https://res.cloudinary.com/demo/video/upload/w_0.3,r_20/l_cloudinary_icon_white,w_60,o_50,g_south_east,y_15,x_60/glide-over-coastal-beach.png")

#### Example 2: 
The following example adjusts the brightness of the video, and sets its radius to max in order to give a telescope-like effect. It then appends a copy of the video in reverse, and plays forward again, but in slow motion. 

```nodejs
cloudinary.video("old_camera", {controls:true, transformation: [
    {overlay: "video:old_camera", flags: "splice", effect: "reverse"},
    {overlay: "video:old_camera", flags: "splice", effect: "accelerate:-50"},
    {effect: "brightness:10", radius: "max"}
    ]})
```

![video forward and reverse](https://res.cloudinary.com/demo/video/upload/l_video:old_camera,fl_splice,e_reverse/l_video:old_camera,fl_splice,e_accelerate:-50/e_brightness:10,r_max/old_camera.mp4 "with_url: false, with_code: false, width:400, poster: https://res.cloudinary.com/demo/video/upload/l_video:old_camera,fl_splice,e_reverse/l_video:old_camera,fl_splice,e_accelerate:-50/e_brightness:10,r_max/old_camera.png")

#### Example 3:
The following example generates a `<video>` tag for a video whose first 10 seconds will loop continuously in an HTML5 video player with default controls. The video is cropped to 360X480, using the pad cropping method, and it is generated at 70% quality to control file size.

```nodejs
cloudinary.video("blue_sports_car",
    {loop:true, controls:true,
     transformation:
        {height: 360, width: 480, quality: 70, duration: 10, crop: "pad"},
     fallback_content:"Your browser does not support HTML5 video tags."}
    )
```  

  
  
  
  Your browser does not support HTML5 video tags.

#### Example 4:

The following example uses direct URL building. It delivers the 2 seconds of a video between seconds 1 and 3 and loops 3 times. The video is resized to a fraction of its width.

```nodejs
cloudinary.url("docs/sunglasses.mp4", {
    resource_type: "video", 
    transformation: [
      {start_offset: "1", end_offset: "3"},
      {effect: "loop:3"},
      {width: "0.2", crop: "scale"}
  ]})
```
![sunglasses video with loop](https://res.cloudinary.com/demo/video/upload/so_1,eo_3/e_loop:3/c_scale,w_0.2/v1/docs/sunglasses "with_url: true, with_code: false")

#### Example 5:

The following example uses direct URL building. It delivers the 2.5 seconds of a video between seconds 7.5 and 10 with a light blue border, and then appends a boomeranged (reversed) version of that same clip, resizing the video to a fraction of its original size. An overlay is applied to the top right corner (`north_east`) of the video with a height 25 pixels and opacity of 90.

```nodejs
cloudinary.url("docs/sunglasses.mp4", {
  resource_type: "video",
  transformation: [
    {start_offset: "7.5", end_offset: "10.0"},
    {effect: "boomerang"},
    {width: "0.2", crop: "scale"},
    {overlay: "cloudinary"},
    {opacity: 90},
    {height: 25, crop: "scale"},
    {flags: "layer_apply", gravity: "north_east"}
  ]})
```
![sunglasses video with loop](https://res.cloudinary.com/demo/video/upload/eo_10.0,so_7.5/e_boomerang/c_scale,w_0.2/l_cloudinary/o_90/c_scale,h_25/fl_layer_apply,g_north_east/v1/docs/sunglasses "with_url: true, with_code: false")


## Tutorial for building an e-commerce video

Watch this tutorial to learn how to build a video showing products being used in different ways, using Node.js. Step-by-step instructions are provided for chaining several different transformations together to create a unique product video.

  This video is brought to you by Cloudinary's video player - embed your own!Use the controls to set the playback speed, navigate to chapters of interest and select subtitles in your preferred language.
{videoTranscript:publicId=training/video_transformations}

### Tutorial contents This tutorial presents the following topics. Click a timestamp to jump to that part of the video.

#### Introduction

{table:class=tutorial-bullets}|  |
| --- | ---|
| {videotime:id=videoTransformations :min=0 :sec=14 :player=cld} | In this video, you'll see some examples of how Cloudinary's transformations and AI capabilities can help you manage and edit your videos, programmatically and on the fly. |

#### Get the delivery URL of a video stored in Cloudinary

{table:class=tutorial-bullets}|  |
| --- | ---|
| {videotime:id=videoTransformations :min=0 :sec=25 :player=cld} | Use the `url` method of the Node.js SDK that takes an asset's public ID and returns its delivery URL. Specify the video's public ID and set the `resource_type` to `video`. |

```nodejs
(async () => {
let videoURL = cloudinary.url("docs/video_features_tutorial/hair", {
      resource_type: "video"
    }
})();
```

#### Step 1 - Add a transformation to trim and resize the video

{table:class=tutorial-bullets}|  |
| --- | ---|
| {videotime:id=videoTransformations :min=1 :sec=10 :player=cld} | To trim and resize the video, add a `transformation` object. Specify a `duration`, for example, 5 seconds, and crop to width of 250 pixels with an aspect ratio of 3:4. Set the `crop` parameter to `fill` so that your video will be cropped to fit the specified dimensions without distortions. |

```nodejs
(async () => {
  let videoURL = cloudinary.url("docs/video_features_tutorial/hair", {
      resource_type: "video",
      transformation: [
        { aspect_ratio: "3:4", crop: "fill", width: 250 },
        { duration: "5"}
      ],
    });
})();
```
 
#### Step 2 - Change the video focal point  

{table:class=tutorial-bullets}|  |
| --- | ---|
| {videotime:id=videoTransformations :min=1 :sec=54 :player=cld} | To center the face in the video, set the `gravity` parameter. In this case, we'll set it to `north`, to focus the video toward the top. |

```nodejs
(async () => {
  let videoURL = cloudinary.url("docs/video_features_tutorial/hair", {
      resource_type: "video",
      transformation: [
        { aspect_ratio: "3:4", crop: "fill", gravity: "north", width: 250 },
        { duration: "5"},
      ],
    });
})();
```

#### Step 3 - Concatenate another video

{table:class=tutorial-bullets}|  |
| --- | ---|
| {videotime:id=videoTransformations :min=2 :sec=23 :player=cld} | To concatenate another video, specify its public ID as an overlay, and use the `splice` flag to indicate that it should be concatenated, and not overlaid. The concatenated video must be resized to the same dimensions as the base video. Add the `duration` parameter to trim the concatenated video. The `layer_apply` flag indicates the end of the overlay transformation.

```nodejs
(async () => {
  let videoURL = cloudinary.url("docs/video_features_tutorial/hair", {
      resource_type: "video",
      transformation: [
        { aspect_ratio: "3:4", crop: "fill", gravity: "north", width: 250 },
        { duration: "5"},
        { duration: "5", flags: "splice", 
            overlay: "video:docs:video_features_tutorial:makeup"},
        { aspect_ratio: "3:4", crop: "fill", gravity: "north", width: 250 },
        { flags: "layer_apply" },
    });
})();
```

#### Step 4 - Add captions

{table:class=tutorial-bullets}|  |
| --- | ---|
| {videotime:id=videoTransformations :min=3 :sec=01 :player=cld} | Add an SRT file stored in Cloudinary as an overlay, specifying its public ID. Set the `resource_type` to `subtitles`, and end the overlay transformation with the `layer apply` flag. |

```nodejs
(async () => {
  let videoURL = cloudinary.url("docs/video_features_tutorial/hair", {
      resource_type: "video",
      transformation: [
        { aspect_ratio: "3:4", crop: "fill", gravity: "north", width: 250 },
        { duration: "5"},
        { duration: "5", flags: "splice", 
            overlay: "video:docs:video_features_tutorial:makeup"},
        { aspect_ratio: "3:4", crop: "fill", gravity: "north", width: 250 },
        { overlay: {resource_type: "subtitles", 
            public_id: "docs/video_features_tutorial/captions.srt"}},
        { flag: "layer_apply" }
      ],
    });
})();
```

#### Step 5 - Add background music

{table:class=tutorial-bullets}|  |
| --- | ---|
| {videotime:id=videoTransformations :min=3 :sec=16 :player=cld} | Add a music clip stored in Cloudinary as an overlay, specifying its public ID. End the overlay transformation with the `layer_apply` flag. |

```nodejs
(async () => {
  let videoURL = cloudinary.url("docs/video_features_tutorial/hair", {
      resource_type: "video",
      transformation: [
        { aspect_ratio: "3:4", crop: "fill", gravity: "north", width: 250 },
        { duration: "5"},
        { duration: "5", flags: "splice", 
            overlay: "video:docs:video_features_tutorial:makeup"},
        { aspect_ratio: "3:4", crop: "fill", gravity: "north", width: 250 },
        { flags: "layer_apply" },
        { overlay: "video:docs:video_features_tutorial:romeo_and_juliet" },
				{ flags: "layer_apply"},
        { overlay: {resource_type: "subtitles", 
            public_id: "docs/video_features_tutorial/captions.srt"}},
        { flag: "layer_apply" }
      ],
    });
})();
```

#### Step 6 - Add a watermark
{table:class=tutorial-bullets}|  |
| --- | ---|
| {videotime:id=videoTransformations :min=3 :sec=39 :player=cld} | Brand your video by overlaying an image saved in Cloudinary as a watermark. Place it in the top right corner by setting the `gravity` parameter to `north_east`, with right and top margins of 10 pixels (`x:10, y:10`). Size the watermark to a width of 40 pixels, and set its `opacity` to 80%. End the overlay transformation with the `layer_apply` flag. Here's the finished code: |

```nodejs
(async () => {
  let videoURL = cloudinary.url("docs/video_features_tutorial/hair", {
      resource_type: "video",
      transformation: [
        { aspect_ratio: "3:4", crop: "fill", gravity: "north", width: 250 },
        { duration: "5"},
        { duration: "5", flags: "splice", 
            overlay: "video:docs:video_features_tutorial:makeup"},
        { aspect_ratio: "3:4", crop: "fill", gravity: "north", width: 250 },
        { flags: "layer_apply" },
        { overlay: "video:docs:video_features_tutorial:romeo_and_juliet" },
				{ flags: "layer_apply"},
        { overlay: "cloudinary_icon"},
        { width: 40, x:10, y:10 },
				{ opacity: 80 },
        { flags: "layer_apply", gravity: "north_east"},
        { overlay: {resource_type: "subtitles", 
            public_id: "docs/video_features_tutorial/captions.srt"}},
        { flag: "layer_apply" }
      ],
    });
})();
```

#### More information
{table:class=tutorial-bullets}|  |
| --- | ---|
| {videotime:id=videoTransformations :min=4 :sec=44 :player=cld} | Check out our [Transformation reference](transformation_reference) for a listing of all the transformations you can apply to your videos. Filter the page to see only the transformations that are relevant to videos using the asset type filter on the top right of the page. See the [Node.js SDK documentation](node_integration), especially the [quick start](node_quickstart) to get up and running in minutes. |
Here's the code used in the video:

> **NOTE**:
>
> To run this code, set your product environment **API environment variable** as an environment variable. Copy the **API environment variable** format from the [API Keys](https://console.cloudinary.com/app/settings/api-keys) page of the Cloudinary Console Settings. Replace `<your_api_key>` and `<your_api_secret>` with your actual values, while your cloud name is already correctly included in the format.

```nodejs
// Require the cloudinary library
const cloudinary = require('cloudinary').v2;

// Return "https" URLs by setting secure: true
cloudinary.config({
  secure: true
});

// Log the configuration
// console.log(cloudinary.config());


//////////////////
//
// Main function
//
//////////////////
(async () => {

  let videoURL = cloudinary.url("docs/video_features_tutorial/hair", {
      resource_type: "video",
      transformation: [
        { aspect_ratio: "3:4", crop: "fill", gravity: "north", width: 250 },
        { duration: "5"},
        { duration: "5", flags: "splice", 
            overlay: "video:docs:video_features_tutorial:makeup"},
        { aspect_ratio: "3:4", crop: "fill", gravity: "north", width: 250 },
        { flags: "layer_apply" },
        { overlay: "video:docs:video_features_tutorial:romeo_and_juliet" },
				{ flags: "layer_apply"},
        { overlay: {resource_type: "subtitles", 
            public_id: "docs/video_features_tutorial/captions.srt"}},
        { flag: "layer_apply" }
      ],

    });
  console.log(videoURL);

})();
```

