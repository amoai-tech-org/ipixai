---
name: cloudinary-node-asset-administration
description: >
  Node.js Admin API — list, rename, delete, tags, metadata, rate limits. Load for
  asset management, cleanup, or DAM automation from server code.
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

# Node.js asset management

While using Cloudinary, all your images, videos, and other raw files are uploaded to Cloudinary. You can use our [Media Library](https://console.cloudinary.com/console/media_library/search) web interface to browse through and manage your uploaded media assets. In addition, you can use methods from the [Upload](image_upload_api_reference) and [Admin](admin_api) APIs, which offer methods for managing, organizing, and creating media assets.

* **Upload API** methods can be used as needed. 
* **Admin API** methods are rate-limited. 
You can view the number of hourly Admin API requests allowed by your Cloudinary plan in the **Account** page of your Console Settings. 

## Upload API 

In addition to the `upload` method, this API includes methods for:

* [renaming](image_upload_api_reference#rename_method) and [permanently deleting](image_upload_api_reference#destroy_method) individual assets
* adding [tags](image_upload_api_reference#tags_method), [contextual metadata](image_upload_api_reference#context_method) and [structured metadata](image_upload_api_reference#metadata_method) to assets 
* creating new assets such as [text images](image_upload_api_reference#text_method), [archives (zip or tgz)](image_upload_api_reference#generate_archive_method), and [animated images](image_upload_api_reference#multi)
* [modifying existing assets](image_upload_api_reference#explicit_method).

## Admin API

A secure API with methods for managing and organizing your media assets, including:

* [listing](admin_api#get_resources) and [restoring](admin_api#restore_resources) assets
* [bulk asset deleting](admin_api#delete_resources) 
* managing [upload presets](admin_api#upload_presets), [upload mappings](admin_api#upload_mappings), [transformations](admin_api#transformations), and [folders](admin_api#folders)
* [updating existing assets](admin_api#update_details_of_an_existing_resource)
* performing [advanced searches](search_method) on the assets in your product environment
* generating a [usage](admin_api#usage) report

	and [more](admin_api)...

> **INFO**: The default resource type for most API requests is `image`. When working with videos, remember to explicitly set the `resource_type` to `video`.

> **TIP**: If your code is listening for the global event `process.on('unhandledRejection')`, you can disable the Cloudinary Upload API internal promises by also including the `disable_promise` parameter set to `true`.

## Upload API example - delete a single asset

The following Node.js example uses the Upload API [destroy](image_upload_api_reference#destroy) method to delete the video with public ID `sample`:

```nodejs
var cloudinary = require('cloudinary');
cloudinary.v2.uploader
.destroy('sample', resource_type: 'video')
.then(result=>console.log(result)); 
```

Sample output:  

```json
{
  "result": "ok"
}
```

> **TIP**: To delete multiple assets use the Admin API [delete_resources](admin_api#delete_resources) method.

For more Upload API examples in Node.js, select the `Node.js` tab in the [Upload API](image_upload_api_reference) reference.

## Admin API example - get details of a single asset

The following Node.js example uses the Admin API [resource](admin_api#get_details_of_a_single_resource_by_public_id) method to return details of the image with public ID `sample`:

```nodejs
var cloudinary = require('cloudinary');
cloudinary.v2.api
.resource('sample')
.then(result=>console.log(result));
```

Sample output:  

```json
{
  "asset_id": "d86882d7788f5d1d702cb63418f082a6",
  "public_id": "sample",
  "format": "jpg",
  "version": 1312461204,
  "resource_type": "image",
  "type": "upload",
  "created_at": "2017-08-04T12:33:24Z",
  "bytes": 120253,
  "width": 864,
  "height": 576,
  "url": "http://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
  "secure_url": "https://.../image/upload/v1312461204/sample.jpg",
  "next_cursor": "041a39fc10971b9eabd4993470f6bfaf",
  "derived": [
    {
      "transformation": "c_fill,w_100,h_100",
      "format": "jpg",
      "bytes": 7112,
      "id": "8267a869b62a93a59248f35d7f124c1f",
      "url": "http://.../demo/image/upload/c_fill,w_100,h_100/v1312461204/sample.jpg",
      "secure_url": "https://.../image/upload/c_fill,w_100,h_100/v1312461204/sample.jpg"
    },
    {
      "transformation": "w_230,h_168,c_fit",
      "format": "jpg",
      "bytes": 19173,
      "id": "383e22a57167445552a3cdc16f0a0c85",
      "url": "http://.../demo/image/upload/w_230,h_168,c_fit/v1312461204/sample.jpg",
      "secure_url": "https://.../image/upload/w_230,h_168,c_fit/v1312461204/sample.jpg"
    }
  ]
 }
 ```

For more Admin API examples in Node.js, select the `Node.js` tab in the [Admin API](admin_api) reference.

