---
name: cloudinary-node-integration
description: >
  Cloudinary Node.js SDK overview — install cloudinary npm, CLOUDINARY_URL config,
  v2 import patterns. Load for server SDK setup before topic-specific references.
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

# Node.js SDK

[sample-projects-link]:node_sample_projects
[changelog-link]: https://github.com/cloudinary/cloudinary_npm/blob/master/CHANGELOG.md

The Cloudinary Node.js SDK provides simple, yet comprehensive image and video upload, transformation, optimization, and delivery capabilities through the [Cloudinary APIs](cloudinary_references#url_and_rest_apis), that you can implement using code that integrates seamlessly with your existing Node.js application.
> **INFO**: :title=SDK security upgrade, June 2025

We recently released an enhanced security version of this SDK that improves the validation and handling of input parameters. We recommend upgrading to the [latest version][changelog-link] of the SDK to benefit from these security improvements.

## How would you like to learn?

{table:class=no-borders overview}Resource | Description 
--|--
[Node.js quick start](node_quickstart) | Get up and running in five minutes with a walk through of installation, configuration, upload, management and transformations.
[Video tutorials](node_video_tutorials) | Watch tutorials relevant to your use cases, from getting started with the Node.js SDK, to uploading, transforming and analyzing your images and videos. 
[Sample projects](node_sample_projects) | Explore sample projects to see how to implement Cloudinary functionality such as upload and delivery with transformations.
[Cloudinary Node.js SDK GitHub repo](https://github.com/cloudinary/cloudinary_npm) | Explore the source code and see the [CHANGELOG][changlog-link] for details on all new features and fixes from previous versions. 
 | Try the free [Introduction to Cloudinary for Node.js Developers](https://training.cloudinary.com/courses/introduction-for-api-users-developers) online course, where you can learn how to upload, manage, transform and optimize your digital assets.

Other helpful resources...

This guide focuses on how to set up and implement popular Cloudinary capabilities using the Node.js SDK, but it doesn't cover every feature or option. Check out these other resources to learn about additional concepts and functionality in general. 

{table:class=no-borders overview}Resource | Description 
--|--
[Developer kickstart](dev_kickstart) |A hands-on, step-by-step introduction to Cloudinary features.
[Glossary](cloudinary_glossary) | A helpful resource to understand Cloudinary-specific terminology.
[Guides](programmable_media_guides) | In depth guides to help you understand the many, varied capabilities provided by the product. 
[References](cloudinary_references) | Comprehensive references for all APIs, including Node.js code examples.

## Install

Cloudinary's Node.js integration library is available as an open-source NPM package. To install the library, run:

```
npm install cloudinary
```

> **NOTE**: Check that you're using a [supported version](https://github.com/cloudinary/cloudinary_npm#version-support) of Node.js.

## Configure

Include Cloudinary's Node.js classes in your code:

```nodejs
const cloudinary = require('cloudinary');
```

> **INFO**:
>
> The Node.js SDK upload and admin method syntax examples shown throughout this documentation use the **v2** signature. To avoid confusion, all code examples use the format `cloudinary.v2...`.  &nbsp;
> In your own code, it's recommended to include `v2` of the Node.js classes as follows:
> ```nodejs
const cloudinary = require('cloudinary').v2;
```
> Alternatively, from within a module, you can use an ES6 import statement:
> ```nodejs
import { v2 as cloudinary } from 'cloudinary'
```
> Following either of these, your upload and Admin API calls should omit the `.v2` shown in the code examples of this guide. For example, a simple image upload:
> ```nodejs
cloudinary.uploader
  .upload("my_image.jpg")
  .then(result=>console.log(result)); 
```

### Set required configuration parameters

You can set the required configuration parameters, `cloud_name`, `api_key` and `api_secret` either using the `CLOUDINARY_URL` environment variable, or using the `config` method in your code.

To define the `CLOUDINARY_URL` environment variable:

1. Copy the **API environment variable** format from the [API Keys](https://console.cloudinary.com/app/settings/api-keys) page of the Cloudinary Console Settings. 
2. Replace `<your_api_key>` and `<your_api_secret>` with your actual values. Your cloud name is already correctly included in the format. 
 
For example:

```
CLOUDINARY_URL=cloudinary://my_key:my_secret@my_cloud_name
```
> **NOTE**: When using Cloudinary through a PaaS add-on, such as Heroku, this environment variable is automatically defined in your deployment environment.

Alternatively, you can use the `config` method to set your `cloud_name`, `api_key` and `api_secret`, for example:

```nodejs
cloudinary.config({ 
  cloud_name: 'my_cloud_name', 
  api_key: 'my_key', 
  api_secret: 'my_secret'
});
```

> **INFO**:
>
> * When writing your own applications, follow your organization's policy on storing secrets and don't expose your API secret. * If you use a method that involves writing your environment variable to a file (e.g. `dotenv`), exclude the file from your version control system, so as not to expose it publicly.
> **TIP**: To generate transformation URLs, you only need to configure the cloud name. The API key and API secret aren't required for URL generation.
### Set additional configuration parameters

In addition to the required configuration parameters, you can define a number of optional [configuration parameters](cloudinary_sdks#configuration_parameters) if relevant.

You can append configuration parameters, for example `upload_prefix` and `secure_distribution`, to the environment variable:

```
CLOUDINARY_URL=cloudinary://my_key:my_secret@my_cloud_name?secure_distribution=mydomain.com&upload_prefix=https://api-eu.cloudinary.com
```

Or you can use the `config` method in your code, for example:

```nodejs
cloudinary.config({ 
  cloud_name: 'my_cloud_name', 
  api_key: 'my_key', 
  api_secret: 'my_secret',
  secure_distribution: 'mydomain.com',
  upload_prefix: 'https://api-eu.cloudinary.com'
});
```

> **NOTE**: By default, URLs generated with this SDK include an appended SDK-usage query parameter. Cloudinary tracks aggregated data from this parameter to improve future SDK versions. We don't collect any individual data. If needed, you can disable the `urlAnalytics` configuration option. [Learn more](cloudinary_sdks#analytics_config).

### Configuration video tutorials

The following tutorials can help you install and set up your SDK:

  
  
  
    Find Your Credentials
    Find your Cloudinary credentials for APIs and SDKs 
  

  
  
  
    Configure the Node.js SDK
    Install and configure the Cloudinary Node.js SDK 
  

  
  
  
    Get Started in Node.js
    Get started with Cloudinary in Node.js, including setup and image optimization 
  

See more [Node.js video tutorials](node_video_tutorials).

## Use

Once you've installed and configured the Node.js SDK, you can use it for:
* **Uploading files to your product environment**: You can upload any files, not only images and videos, set your own naming conventions and overwrite policies, moderate and tag your assets on upload, and much more. [See&nbsp;example](#quick_example_file_upload)
* **Transforming and optimizing images and videos**: Keeping your original assets intact in your product environment, you can deliver different versions of your media - different sizes, formats, with effects and overlays, customized for your needs. [See&nbsp;example](#quick_example_transform_and_optimize)
* **Managing assets**: Using methods from the Admin and Upload APIs, you can organize your assets, for example, list, rename and delete them, add tags and metadata and use advanced search capabilities. [See&nbsp;example](#quick_example_get_details_of_a_single_asset)

Capitalization and data type guidelines...

When using the Node.js SDK, keep these guidelines in mind:  

* Parameter names: `snake_case`. For example: **public\_id**
* Classes: `PascalCase`. For example: **PreloadedFile**
* Methods: `snake_case`. For example: **image\_upload\_tag**
* Pass parameter data as: `Object`
* You can optionally use TypeScript. For details, see the [TypeScript declaration file](https://github.com/cloudinary/cloudinary_npm/blob/master/types/index.d.ts).

### Quick example: File upload

The following Node.js code uploads the `dog.mp4` video using the public\_id, `my_dog`. The video overwrites the existing `my_dog` video if it exists. When the video upload finishes, the specified notification URL receives details about the uploaded media asset.

```nodejs
cloudinary.v2.uploader
.upload("dog.mp4", {
  resource_type: "video", 
  public_id: "my_dog",
  overwrite: true, 
  notification_url: "https://mysite.example.com/notify_endpoint"})
.then(result=>console.log(result)); 
```

> **Learn more about upload**:
>
> * Read the [Upload guide](upload_images) to learn more about customizing uploads, using upload presets and more.

> * See more examples of [image and video upload](node_image_and_video_upload) using the Cloudinary Node.js library.  

> * Explore the [Upload API reference](image_upload_api_reference) to see all available methods and options.

### Quick example: Transform and optimize

Take a look at the following transformation code and the image it delivers:

![sample transformation](https://res.cloudinary.com/demo/image/upload/c_thumb,g_face,h_150,w_150/r_20/e_sepia/l_cloudinary_icon/e_brightness:90/o_60/c_scale,w_50/fl_layer_apply,g_south_east,x_5,y_5/a_10/q_auto/front_face.png "disable_all_tab: true, with_url: false, frameworks:nodejs")

```nodejs
cloudinary.image("front_face.png", {transformation: [
  {gravity: "face", height: 150, width: 150, crop: "thumb"},
  {radius: 20},
  {effect: "sepia"},
  {overlay: "cloudinary_icon"},
  {effect: "brightness:90"},
  {opacity: 60},
  {width: 50, crop: "scale"},
  {flags: "layer_apply", gravity: "south_east", x: 5, y: 5},
  {angle: 10},
  {quality: "auto"}
  ]})
```

This relatively simple code performs all of the following on the original front_face.jpg image before delivering it:

* **Crop** to a 150x150 thumbnail using face-detection gravity to automatically determine the location for the crop
* **Round the corners** with a 20 pixel radius
* Apply a **sepia effect**
* **Overlay the Cloudinary logo** on the southeast corner of the image (with a slight offset). Scale the logo overlay down to a 50 pixel width, with increased brightness and partial transparency (opacity = 60%).
* **Rotate** the resulting image (including the overlay) by 10 degrees
* **Optimize** the image to reduce the size of the image without impacting visual quality.
* **Convert** and deliver the image in PNG format (the originally uploaded image was a JPG)

And here's the URL that's automatically generated and included in an image tag from the above code:

![sample transformation](https://res.cloudinary.com/demo/image/upload/c_thumb,g_face,h_150,w_150/r_20/e_sepia/l_cloudinary_icon/e_brightness:90/o_60/c_scale,w_50/fl_layer_apply,g_south_east,x_5,y_5/a_10/q_auto/front_face.png "disable_all_tab: true, with_code:false, with_image:false")

In a similar way, you can [transform a video](node_video_manipulation#video_transformation_examples).

> **Learn more about transformations**:
>
> * Read the [image](image_transformations) and [video](video_manipulation_and_delivery) transformation guides to learn about the different ways to transform your assets.

> * See more examples of [image](node_image_manipulation) and [video](node_video_manipulation) transformations using the Cloudinary Node.js library.  

> * See all possible transformations in the [Transformation URL API reference](transformation_reference).

### Quick example: Get details of a single asset

The following Node.js example uses the Admin API [resource](admin_api#get_details_of_a_single_resource_by_public_id) method to return details of the image with public ID `cld-sample`:

```nodejs
cloudinary.v2.api
  .resource('cld-sample')
  .then(result=>console.log(result));
```

#### Sample response

```json
{
  "asset_id": "bf98540caf22ed65775ee0951f4746c9",
  "public_id": "cld-sample",
  "format": "jpg",
  "version": 1719304891,
  "resource_type": "image",
  "type": "upload",
  "created_at": "2024-06-25T08:41:31Z",
  "bytes": 476846,
  "width": 1870,
  "height": 1250,
  "backup": true,
  "asset_folder": "",
  "display_name": "cld-sample",
  "url": "http://res.cloudinary.com/cld-docs/image/upload/v1719304891/cld-sample.jpg",
  "secure_url": "https://res.cloudinary.com/cld-docs/image/upload/v1719304891/cld-sample.jpg",
  "next_cursor": "497b323dcb9883a15a5e6a7cfb75d439e4de1ca882f5cbe8de6a8b322c37bdad",
  "derived": [
    {
      "transformation": "c_scale,w_500",
      "format": "jpg",
      "bytes": 22871,
      "id": "ce3d7bf3068809656dc5aa76572535da",
      "url": "http://res.cloudinary.com/cld-docs/image/upload/c_scale,w_500/v1719304891/cld-sample.jpg",
      "secure_url": "https://res.cloudinary.com/cld-docs/image/upload/c_scale,w_500/v1719304891/cld-sample.jpg"
    }
  ]
}

 ```

> **Learn more about managing assets**:
>
> * Check out the [Manage and analyze assets](asset_management) guide for all the different capabilities.

> * Get an overview of [asset management](node_asset_administration) using the Node.js SDK.

> * Select the **Node.js** tab in the [Admin API](admin_api) and [Upload API](image_upload_api_reference) references to see example code snippets.

 
## Sample projects
Take a look at the [Node.js sample projects][sample-projects-link] page to help you get started integrating Cloudinary into your Node.js application.> **TIP**: Check out our collection of [Node.js sample apps](code_explorers) too!

> **READING**:
>
> * Try out the Node.js SDK using the [quick start](node_quickstart).

> * Learn more about [uploading images and videos](node_image_and_video_upload) using the Node.js SDK.    

> * See examples of powerful [image](node_image_manipulation) and [video](node_video_manipulation) transformations using Node.js code, and see our [image transformations](image_transformations) and [video transformation](video_manipulation_and_delivery) docs.   

> * Check out Cloudinary's [asset management](node_asset_administration) capabilities, for example, renaming and deleting assets, adding tags and metadata to assets, and searching for assets.

> * Stay tuned for updates by following the [Release Notes](programmable_media_release_notes) and the [Cloudinary Blog](https://cloudinary.com/blog).
