---
name: cloudinary-node-image-transformations
description: >
  Node.js image transformation URLs — cloudinary.url, chainable transforms, delivery
  from server code. Load when building programmatic image URLs in Node.
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

# Node.js image transformations


After you or your users have uploaded image assets to Cloudinary, you can deliver them via dynamic URLs. You can include instructions in your dynamic URLs that tell Cloudinary to transform your assets using a set of transformation parameters. All transformations are performed automatically in the cloud and your transformed assets are automatically optimized before they are routed through a fast CDN to the end user for optimal user experience.

For example, you can resize and crop, add overlay images, blur or pixelate faces, apply a large variety of special effects and filters, and apply settings to optimize your images and to deliver them responsively.

Cloudinary's Node.js SDK simplifies the generation of transformation URLs for easy embedding of assets in your Node.js application.

See also: [Node.js video transformation](node_video_manipulation)

## Deliver and transform images

You can deliver your images using methods that generate image tags or via direct URL-building directives. 

### The cloudinary.image method

You can add images to your Node.js view using Cloudinary's `cloudinary.image` helper method. This method generates the full image resource URL based on the given transformation parameters and adds the image tag to your HTML code:

```nodejs
cloudinary.image("sample.jpg")
```

The code above generates the following HTML image tag:

```html
<img src='https://res.cloudinary.com/demo/image/upload/sample.jpg' />

```

You can also include transformation parameters in the request, for example, to deliver a JPEG image padded to a width of 400 pixels:
 
 
```nodejs
cloudinary.image("sample.jpg", { width: 400, crop: "pad" })
```

You can either add transformations directly to your `cloudinary.image` method (all transformations will be in a single, flat component of the resulting URL source, as above), or you can define them with the `transformation` parameter. 

```nodejs
cloudinary.image("sample.jpg", { transformation: { width: 400, crop: "pad" }})
```

Additionally, you can add other, non-transformation parameters to the `cloudinary.image` method such as the asset version, configuration parameters and HTML5 image tag attributes.
* The `version` parameter is added to the delivery URL as explained in [Asset versions](advanced_url_delivery_options#asset_versions).
* [Configuration parameters](cloudinary_sdks#configuration_parameters) that you specify here override any that you have set globally.
* [HTML5 image tag attributes](https://www.w3schools.com/tags/tag_img.asp) (e.g., alt or class) are added to the resulting `<img>` tag.

For example: 

```nodejs
cloudinary.image("docs/casual", { width: 500, height: 500, crop: "fill", version: "1573726751", cloud_name: "demo", alt: "Casual Jacket"})
```

is compiled to:

```html
<img src="https://res.cloudinary.com/demo/image/upload/c_fill,h_500,w_500/v1573726751/docs/casual" alt="Casual Jacket">
```

> **TIP**:
>
> In general, when using an SDK, you will probably take advantage of the SDK parameter names for improved readability and maintenance of your code. However, you can also optionally pass a **raw_transformation** parameter, whose value is a literal [URL transformation](transformation_reference) definition. Note that the string you pass as the raw transformation value will be appended as is (with no processing or validation) to the **end** of any other transformation parameters passed in the same component of the transformation chain. 
> For example:
> ```nodejs
cloudinary.image("sample.jpg", { transformation: { raw_transformation: "w_400,c_pad" }})
```

### Chaining transformations

Cloudinary supports powerful transformations. You can even combine multiple transformations together as part of a single transformation request, e.g. crop an image and add a border. In certain cases you may want to perform additional transformations on the result of the previous transformation request. To do that, you can use chained transformations.

To apply chained transformations in a transformation URL, you include multiple transformation components separated by '/'. Each transformation component is applied to the result of the previous one. In Node.js, applying multiple transformations is done by specifying the `transformation` parameter as an array of transformation arrays. The following example first fills the image within a 250px square, then rounds the result to a circle, and finally delivers the image in the optimal transparent format:

![3 chained transformations applied to an image](https://res.cloudinary.com/demo/image/upload/ar_1.0,c_fill,w_250/r_max/f_auto/livingroom-yellow-chair.png "disable_all_tab:true, frameworks:nodejs")

```nodejs
cloudinary.image("livingroom-yellow-chair.png", {transformation: [
  {aspect_ratio: "1.0", width: 250, crop: "fill"},
  {radius: "max"},
  {fetch_format: "auto"}
  ]})
```

The following example applies 4 chained transformations: fill to a 250*400px portrait, then rotate the result by 20 degrees, then add a brown outline to the rotated image, and optimize the resulting image to deliver with the best compression that gives good visual quality and in the optimal transparent format:

![4 chained transformations applied to an image](https://res.cloudinary.com/demo/image/upload/c_fill,h_400,w_250/a_20/e_outline,co_brown/q_auto/f_auto/kitchen-island.png "thumb:h_350,dpr_2, height:350, disable_all_tab:true, frameworks:nodejs")

```nodejs
cloudinary.image("kitchen-island.png", {transformation: [
  {height: 400, width: 250, crop: "fill"},
  {angle: 20},
  {effect: "outline", color: "brown"},
  {quality: "auto"},
  {fetch_format: "auto"}
  ]})
```

For more information on image transformations, see [Apply common image transformations](#apply_common_image_transformations).

### Direct URL building

The `cloudinary.image` method described above generates an HTML image tag. In certain conditions, you might want to generate a transformation URL directly, without the containing image tag. To return only the URL, use the `cloudinary.url` helper method. Here are few examples:

```nodejs
cloudinary.url("sample.jpg", {width: 100, height: 150, crop: "fill"})      
// Output: "https://res.cloudinary.com/demo/image/upload/w_100,h_150,c_fill/sample.jpg"
```

```nodejs
cloudinary.url("sample_spreadsheet.xls", {resource_type: "raw"})
// Output: "https://res.cloudinary.com/demo/raw/upload/sample_spreadsheet.xls"
```

## Apply common image transformations

This section provides an overview and examples of the following commonly used image transformation features, along with links to more detailed documentation on these features:

* [Resizing and cropping](#resizing_and_cropping)
* [Converting to another image format](#converting_to_another_image_format)
* [Applying image effects and filters](#applying_image_effects_and_filters)
* [Adding text and image overlays](#adding_text_and_image_overlays)
* [Image optimizations](#image_optimizations)
* [Responsive image settings](#responsive_image_settings)
  
Keep in mind that this section is only intended to introduce you to the basics of using image transformations with Node.js. 

For comprehensive explanations of how to implement a wide variety of transformations, see [Image transformations](image_transformations).
For a full list of all supported image transformations and their usage, see the [Transformation URL API Reference](transformation_reference).

### Resizing and cropping

There are a variety of different ways to resize and/or crop your images, and to control the area of the image that is preserved during a crop. 

The following example uses the `fill` cropping method to generate and deliver an image that completely fills the requested 250x250 size while retaining the original aspect ratio. It uses face detection gravity to ensure that all the faces in the image are retained and centered when the image is cropped:

![Crop an image using face recognition](https://res.cloudinary.com/demo/image/upload/w_250,h_250,c_fill,g_faces/family_bench.jpg "disable_all_tab: true, with_url:false, with_image:false, frameworks:nodejs")

```nodejs
cloudinary.image("family_bench.jpg", {width: 250, height: 250, gravity: "faces", crop: "fill"})
```

Original image

Fill cropping with 'faces' gravity

You can also use automatic gravity to determine what to keep in the crop automatically.

![Crop an image using automatic gravity in Node.js](https://res.cloudinary.com/demo/image/upload/w_200,h_300,c_fill,g_auto/basketball_in_net.jpg "disable_all_tab: true, with_image:false, with_url:false, frameworks:nodejs" )

Original image

Fill cropping with 'auto' gravity

For details on all resizing and cropping options, see [resizing and cropping images](resizing_and_cropping).

### Converting to another image format

You can deliver any image uploaded to Cloudinary in essentially any image format. There are three main ways to convert and deliver in another format:

* Specify the image's public ID with the desired extension. 
* Explicitly set the desired format using the `fetch_format` parameter. 
* Use the `auto` fetch_format to instruct Cloudinary to deliver the image in the most optimized format for each browser that requests it.

For example:

1. Deliver a .jpg file in .gif format: 
  ![Deliver a .jpg file as a .gif](https://res.cloudinary.com/demo/image/upload/sample.gif "disable_all_tab: true, with_url:false, with_image:false, frameworks:nodejs")

```nodejs
cloudinary.image("sample.gif")
```
2. Let Cloudinary select the optimal format for each browser. For example, in Chrome, this image may deliver in **.avif** or **.webp** format (depending on your product environment setup):
  ![Let Cloudinary select the optimal format to deliver for each browser.](https://res.cloudinary.com/demo/image/upload/c_scale,w_350/f_auto/cloud_castle.jpg  "disable_all_tab: true, with_url:false, with_image:false, frameworks:nodejs")

```nodejs
cloudinary.image("cloud_castle.jpg", {transformation: [
  {width: 350, crop: "scale"},
  {fetch_format: "auto"}
  ]})
```
  The above code generates a URL with the `f_auto` parameter:
  ![Let Cloudinary select the optimal format to deliver for each browser.](https://res.cloudinary.com/demo/image/upload/c_scale,w_350/f_auto/cloud_castle.jpg  "with_code:false, with_url:true, with_image:false")

For more details, see:

* [Delivering images in different formats](image_format_support#delivering_in_a_different_format)
* [Automatic format selection (f_auto)](image_optimization#automatic_format_selection_f_auto)
* [Tips and considerations for using f_auto](image_optimization#tips_and_considerations_for_using_f_auto)

### Applying image effects and filters

You can select from a large selection of image effects, enhancements, and filters to apply to your images. The available effects include a variety of color balance and level effects, tinting, blurring, pixelating, sharpening, automatic improvement effects, artistic filters, image and text overlays, distortion and shape changing effects, outlines, backgrounds, shadows, and more.

For example, the code below applies a cartoonify effect, rounding corners effect, and background color effect (and then scales the image down to a height of 300 pixels).

![An image with several transformation effects](https://res.cloudinary.com/demo/image/upload/e_cartoonify/r_max/e_outline:100,co_lightblue/b_lightblue/h_300/actor.jpg "disable_all_tab: true, with_url:false, frameworks:nodejs")

```nodejs
cloudinary.image("actor.jpg", {transformation: [
  {effect: "cartoonify"},
  {radius: "max"},
  {effect: "outline:100", color: "lightblue"},
  {background: "lightblue"},
  {height: 300, crop: "scale"}
  ]})
```

For more details on the available image effects and filters, see [Visual image effects and enhancements](effects_and_artistic_enhancements).

### Adding text and image overlays

You can add images and text as overlays on your main image. You can apply the same types of transformations on your overlay images as you can with any image and you can use gravity settings or x and y coordinates to control the location of the overlays. You can also apply a variety of transformations on text, such as color, font, size, rotation, and more.

For example, the code below overlays a couple's photo on a mug image. The overlay photo is cropped using face detection with adjusted color saturation and a vignette effect applied. The word love is added in a brown, fancy font and placed to fit the design.  Additionally, the final image is cropped and the corners are rounded.

![An image with many transformations and overlays applied](https://res.cloudinary.com/demo/image/upload/w_400,h_250,c_fill,g_south/l_nice_couple,w_1.3,h_1.3,g_faces,c_crop,fl_region_relative/e_saturation:50/e_vignette/fl_layer_apply,w_100,r_max,g_center,y_15,x_-20/l_text:Cookie_23_bold:Love,co_rgb:744700/fl_layer_apply,x_-23,y_50/c_crop,w_300,h_250,x_30/r_60/coffee_cup.png "disable_all_tab: true, frameworks:nodejs, with_url:false")

```nodejs
cloudinary.image("coffee_cup.png", {transformation: [
  {width: 400, height: 250, gravity: "south", crop: "fill"},
  {overlay: "nice_couple", width: "1.3", height: "1.3", gravity: "faces", flags: "region_relative", crop: "crop"},
  {effect: "saturation:50"},
  {effect: "vignette"},
  {flags: "layer_apply", width: 100, radius: "max", gravity: "center", y: 15, x: -20, crop: "scale"},
  {overlay: {font_family: "Cookie", font_size: 23, font_weight: "bold", text: "Love"}, color: "#744700"},
  {flags: "layer_apply", x: -23, y: 50},
  {width: 300, height: 250, x: 30, crop: "crop"},
  {radius: 60}
  ]})
```

### Image optimizations

By default, Cloudinary automatically performs certain optimizations on all transformed images. There are also a number of additional features that enable you to further optimize the images you use in your application. These include optimizations to image quality, format, and size, among others.

For example, you can use the `auto` value for the `fetch_format` and `quality` attributes to automatically deliver the image in the format and quality that minimize file size while meeting the required quality level. In addition, resize the image to make it even lighter. Below, these parameters are applied, resulting in a 25.66 KB AVIF file (in Chrome) instead of a 1.34 MB JPG with no visible change in quality. 

![Efficient file size optimization using auto format and auto quality features](https://res.cloudinary.com/demo/image/upload/w_500/f_auto,q_auto/pond_reflect.jpg "disable_all_tab: true, with_url:false, frameworks:nodejs")

```nodejs
cloudinary.image("pond_reflect.jpg", {transformation: [
  {width: 500, crop: "scale"},
  {quality: "auto", fetch_format: "auto"}
  ]})
```

For an in-depth review of the many ways you can optimize your images, see [Image optimization](image_optimization).

### Responsive image settings

Responsive web design is a method of designing websites to provide an optimal viewing experience to users, irrespective of the device, viewport size, orientation, or resolution used to view it. Ensuring that optimal experience means you should avoid sending high resolution images that get resized client side, with significant bandwidth waste for users of small displays. Instead, you should always deliver the right size image for each device and screen size. 

For example, you can ensure that each user receives images at the size and device pixel ratio (dpr) that fit their device using the `auto` value for the `dpr` and `width` attributes. The `auto` value is replaced with actual values on the client side based on the screen properties and viewport width:

```nodejs
cloudinary.image("myphoto", 
  { transformation: [
    { dpr: "auto", responsive: true, width: "auto", crop: "scale", angle: 20 }, 
    { effect: "art:hokusai", border: "3px_solid_rgb:00390b", radius: 20 }
  ]})
```
 
Cloudinary offers several options for simplifying the complexity of delivering responsive images. For a detailed guide on how to implement these options, see [Responsive images](responsive_images).

