---
name: cloudinary-node-upload
description: >
  Node.js upload API — cloudinary.uploader.upload, streaming, remote fetch, upload
  presets, large files. Load for server-side upload implementation or debugging.
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

# Node.js image and video upload


[githublink]: https://github.com/cloudinary-training/cld-upload-programmatically-node-tutorial

Cloudinary provides an API for uploading images, videos, and any other kind of file to the cloud. Files uploaded to Cloudinary are stored safely in the cloud with secure [backups and revision history](backups_and_version_management). Cloudinary's APIs allow secure uploading from your servers, directly from your visitors' browsers or mobile applications, or fetched via remote public URLs. 

Cloudinary's Node.js SDK wraps Cloudinary's upload API and simplifies the integration. Node.js methods are available for easily performing Node.js image and video uploads to the cloud and Node.js helper methods are available for uploading directly from a browser to Cloudinary.

This page covers common usage patterns for Node.js image and video upload with Cloudinary.

For details on all available upload functionality, see the [Upload](upload_images) guide, and the [upload](image_upload_api_reference#upload) method of the Upload API Reference.
> **TIP**: Cloudinary's [Upload widget](upload_widget) provides an alternative to using a Cloudinary SDK to add upload functionality to your application, eliminating the need to develop in-house interactive upload capabilities. The upload widget is an interactive, feature rich, simple-to-integrate user interface that enables you to add Cloudinary upload support to your website. The widget can be easily embedded in your web application with just a few lines of JavaScript code. See the [Upload widget](upload_widget) documentation for detailed information. 

![Upload widget main screen](https://cloudinary-res.cloudinary.com/image/upload/q_auto/f_auto/bo_1px_solid_grey/docs/upload_widget_dev_default_new.png "width: 600, with_code:false, with_url:false")

## Server-side upload
  
You can upload images, videos, or any other raw file to Cloudinary from your Node.js code. Uploading is done over HTTPS using a secure protocol based on your `api_key` and `api_secret` parameters. 


### Programmatic upload video tutorial

Watch this demo on how to quickly upload images, videos and other media files to Cloudinary for immediate deliverability using Cloudinary's Upload API in your development environment.

  This video is brought to you by Cloudinary's video player - embed your own!Use the controls to set the playback speed, navigate to chapters of interest and select subtitles in your preferred language.
{videoTranscript:publicId=training/upload-programmatically-tutorial-node-js}

> **TIP**: :title=View the code

You can find the code from this tutorial in [GitHub][githublink].
#### Tutorial contents This tutorial presents the following topics. Click a timestamp to jump to that part of the video.
#### Supported programming languages
{table:class=tutorial-bullets}|  | 
| --- | --- |
|{videotime:id=media :min=0 :sec=11 :player=cld} | Our tutorial uses [Node.js](node_integration) and server-side scripts to demonstrate the upload capabilities. However, we [support many popular programming languages](cloudinary_sdks), including [Ruby](rails_integration), [PHP](php_integration), [Python](dotnet_integration) and more. 
|

#### Write your script
{table:class=tutorial-bullets}|  | 
| --- | --- |
|{videotime:id=media :min=0 :sec=32 :player=cld} | Start writing a script that uses Cloudinary's Upload API to get the image into your Cloudinary product environment. Our example requires two different libraries - the [Cloudinary Node.js SDK](node_integration#installation) and [dotenv](https://www.npmjs.com/package/dotenv), which allows your development environment to [use your Cloudinary credentials](node_integration#configuration) and upload the assets in an authenticated way.
|

#### Retrieve your environment variable
{table:class=tutorial-bullets}|  | 
| --- | --- |
|{videotime:id=media :min=0 :sec=50 :player=cld} | Retrieve your environment variable from the [API Keys](product_environment_settings#api_keys) page of the Cloudinary Console Settings, then paste it into a **.env** file in your development project. Do not expose your Cloudinary product environment credentials in your site's frontend and public code.
|

> **NOTE**:
>
> You can no longer access your full credentials directly from the Dashboard. Find your **Cloud name** on the [Dashboard](https://console.cloudinary.com/app/home/dashboard), and all credentials, including **API Key**, **API Secret**, and **API environment variable**, on the [API Keys](https://console.cloudinary.com/app/settings/api-keys) page of the Cloudinary Console Settings.

#### Call the Upload API
{table:class=tutorial-bullets}|  | 
| --- | --- |
|{videotime:id=media :min=1 :sec=14 :player=cld} | Call the [Cloudinary Upload API](image_upload_api_reference), then [reference the file you want to upload](node_image_and_video_upload#server_side_upload). 
|

#### Add callback functions
{table:class=tutorial-bullets}|  | 
| --- | --- |
|{videotime:id=media :min=1 :sec=19 :player=cld} | Add your [callback functions](https://nodejs.org/en/learn/asynchronous-work/javascript-asynchronous-programming-and-callbacks#callbacks/). This tutorial [uses promises to handle the successes and failures in the code](https://tpiros.dev/blog/promises-in-javascript/).
|

### Ensure script libraries are installed
{table:class=tutorial-bullets}|  | 
| --- | --- |
|{videotime:id=media :min=1 :sec=26 :player=cld} | Make sure all of our script's libraries [are properly installed](https://docs.npmjs.com/cli/v7/commands/npm-install) with a simple `npm i` command. If you opening your **package.json** file, you can see all of the packages have been listed as dependencies.
|

#### Run the script and upload the local asset
{table:class=tutorial-bullets}|  | 
| --- | --- |
|{videotime:id=media :min=1 :sec=41 :player=cld} | You should have gotten [a successful JSON response](upload_images#upload_response) with lots of data about the uploaded file, including its resolution, file size, format, and more. The file is also now an immediately deliverable asset from a secure, HTTPS URL.
|

#### Upload an asset from a public URL
{table:class=tutorial-bullets}|  | 
| --- | --- |
|{videotime:id=media :min=2 :sec=00 :player=cld} | To upload a file from any public URL, [simply enter the full URL of the asset](upload_parameters#upload_from_a_remote_url), instead of the local file path.
|

#### Add parameters to the upload call
{table:class=tutorial-bullets}|  | 
| --- | --- |
|{videotime:id=media :min=2 :sec=19 :player=cld} | You can [edit the file's public ID](upload_parameters#public_id), so the asset is named exactly what you want it to be. It is also possible to [add tags to the asset](image_upload_api_reference#tags_method), so you can easily find and deliver it later. You can even [apply quality analysis features](image_quality_analysis) to provide automation, based on the blurriness or overall size of the asset.

> **You may find these Dev Hints videos useful too:**:
>
> * [Upload images in Node.js](upload_assets_in_node_tutorial)

> * [Upload videos in Node.js](upload_videos_in_node_tutorial)

> * [Upload multiple files in Node.js](upload_multiple_assets_in_node_tutorial)

### Node.js upload methods

There are several different methods that you can use to upload files to your product environment:

{table:class=no-borders overview wide-1stcol} Method | Description
---|---
[upload](#the_code_upload_code_method) | This method wraps the [upload](image_upload_api_reference#upload) method of the Upload API. You can use it for signed uploads to upload files up to 100 MB. 
[unsigned_upload](#the_code_unsigned_upload_code_method) | This method is similar to the `upload` method, but requires you to define an unsigned upload preset. You can use it for unsigned uploads to upload files up to 100 MB. Unsigned uploads are useful for low-security use cases, prototyping and testing.
[upload_stream](#the_code_upload_stream_code_method) | This method takes advantage of Node.js's **stream** functionality. It's useful when you receive a file as a stream from your users or if the file in your storage is large and you don't want to load it all to memory.
[unsigned_upload_stream](#the_code_unsigned_upload_stream_code_method) | This method is similar to the `upload_stream` method, but requires you to define an unsigned upload preset. Unsigned uploads are useful for low-security use cases, prototyping and testing.
[upload_chunked](#the_code_upload_chunked_code_method) | This method uploads a large file in chunks, offering a degree of tolerance for network issues.
[upload_chunked_stream](#the_code_upload_chunked_stream_code_method) | This method is similar to the `upload_chunked` method, but also takes advantage of Node.js's **stream** functionality. 
[upload_large](#the_code_upload_large_code_method) | This method is similar to the `upload_chunked` method, but automatically sets the `resource_type` parameter to `raw`.

> **NOTE**: Unless stated otherwise, all the methods assume that you are uploading an image. If you are uploading a video or a raw file, you need to set the `resource_type` parameter accordingly.

> **TIP**: Take a look at the [Photo Album sample project](node_sample_projects#photo_album) for examples of using different upload methods.



#### The `upload` method

Use the `upload` method to upload a file to your product environment:

For example, uploading a local image file named **my_image.jpg**:
  
```nodejs
cloudinary.v2.uploader
  .upload("/home/my_image.jpg")
  .then(result => console.log(result))
  .catch(error => console.error(error));
```

To upload a video, you need to set the `resource_type` parameter to `video`. In this example, we're also setting other parameters: the public ID to `dog_closeup`, two eager transformations that resize the video to a square and a small rectangle, and a notification URL to catch the webhook to say that the asynchronously processed transformations are ready. 

```nodejs
cloudinary.v2.uploader
.upload("dog.mp4", 
  { resource_type: "video", 
    public_id: "dog_closeup",
    eager: [
      { width: 300, height: 300, crop: "pad", audio_codec: "none" }, 
      { width: 160, height: 100, crop: "crop", gravity: "south", audio_codec: "none" } ],                                   
    eager_async: true,
    eager_notification_url: "https://mysite.example.com/notify_endpoint" })
.then(result => console.log(result))
.catch(error => console.error(error));
```

You can specify the file to upload as a local path, a remote HTTP or HTTPS URL, an allowlisted storage bucket (S3 or Google Storage) URL, a base64 data URI, or an FTP URL. 

For details and code examples of uploading using each of these data source types, see [Required upload parameters](upload_parameters#required_file_parameter). 

For details on all available upload functionality, see the [Upload](upload_images) guide, and the [upload](image_upload_api_reference#upload) method of the Upload API Reference.

> **TIP**:
>
> :title=Tips:

> * If your code is listening for the global event `process.on('unhandledRejection')`, you can disable the Cloudinary internal promises by also including the `disable_promise` parameter set to `true`.

> * The `upload` method supports uploading files up to 100 MB (subject to [account limitations](https://cloudinary.com/pricing/compare-plans)). To upload larger files, use one of the other methods, which use streaming or chunking functionality.

#### The `unsigned_upload` method

Use the `unsigned_upload` method to upload a file to your product environment when you don't require the security that a signed upload provides. You need to pass the name of an unsigned [upload preset](upload_presets).

For example, uploading a local image file named **my_image.jpg**, using an upload preset named **my_upload_preset**:
  
```nodejs
cloudinary.v2.uploader
  .unsigned_upload("/home/my_image.jpg", "my_upload_preset")
  .then(result => console.log(result))
  .catch(error => console.error(error));
```

To upload a video, you need to set the `resource_type` parameter to `video`.

```nodejs
cloudinary.v2.uploader
.unsigned_upload("dog.mp4", "my_upload_preset"
  { resource_type: "video" })
.then(result => console.log(result))
.catch(error => console.error(error));
```

Other details are the same as for the [upload](#the_code_upload_code_method) method.


#### The `upload_stream` method

The `upload_stream` method takes advantage of Node.js's **stream** functionality. It's useful when you receive a file as a stream from your users or if the file in your storage is large and you don't want to load it all to memory. 

The method returns a stream, so for simplicity we wrap it in a `Promise`:

```nodejs
const byteArrayBuffer = fs.readFileSync('shirt.jpg');
new Promise((resolve, reject) => {
    cloudinary.v2.uploader.upload_stream((error, uploadResult) => {
        if (error) {
            return reject(error);
        }
        return resolve(uploadResult);
    }).end(byteArrayBuffer);
}).then((uploadResult) => {
    console.log(`Buffer upload_stream wth promise success - ${uploadResult.public_id}`);
}).catch((error) => {
    console.error(error);
});
```

Using `await`:

```nodejs
const byteArrayBuffer = fs.readFileSync('shirt.jpg');
const uploadResult = await new Promise((resolve, reject) => {
    cloudinary.v2.uploader.upload_stream((error, uploadResult) => {
        if (error) {
            return reject(error);
        }
        return resolve(uploadResult);
    }).end(byteArrayBuffer);
});
```

For a video, set the `resource_type` parameter to `video`:

```nodejs
const byteArrayBuffer = fs.readFileSync('people.mp4');
new Promise((resolve, reject) => {
    cloudinary.v2.uploader.upload_stream({ resource_type: "video" }, (error, uploadResult) => {
        if (error) {
            return reject(error);
        }
        return resolve(uploadResult);
    }).end(byteArrayBuffer);
}).then((uploadResult) => {
    console.log(`Buffer upload_stream wth promise success - ${uploadResult.public_id}`);
}).catch((error) => {
    console.error(error);
});
```

Using `await`:

```nodejs
const byteArrayBuffer = fs.readFileSync('people.mp4');
const uploadResult = await new Promise((resolve, reject) => {
    cloudinary.v2.uploader.upload_stream({ resource_type: "video" }, (error, uploadResult) => {
        if (error) {
            return reject(error);
        }
        return resolve(uploadResult);
    }).end(byteArrayBuffer);
});
```

#### The `unsigned_upload_stream` method

The `unsigned_upload_stream` method takes advantage of Node.js's **stream** functionality. It's useful when you receive a file as a stream from your users or if the file in your storage is large and you don't want to load it all to memory. 

Use the `unsigned_upload_stream` method to upload a large file or stream to your product environment when you don't require the security that a signed upload provides. You need to pass the name of an unsigned [upload preset](upload_presets).

The method returns a stream, so for simplicity we wrap it in a `Promise`:

```nodejs
const byteArrayBuffer = fs.readFileSync('shirt.jpg');
new Promise((resolve, reject) => {
    cloudinary.v2.uploader.unsigned_upload_stream('my_upload_preset', (error, uploadResult) => {
        if (error) {
            return reject(error);
        }
        return resolve(uploadResult);
    }).end(byteArrayBuffer);
}).then((uploadResult) => {
    console.log(`Buffer unsigned_upload_stream wth promise success - ${uploadResult.public_id}`);
}).catch((error) => {
    console.error(error);
});
```

Using `await`:

```nodejs
const byteArrayBuffer = fs.readFileSync('shirt.jpg');
const uploadResult = await new Promise((resolve, reject) => {
    cloudinary.v2.uploader.unsigned_upload_stream('my_upload_preset', (error, uploadResult) => {
        if (error) {
            return reject(error);
        }
        return resolve(uploadResult);
    }).end(byteArrayBuffer);
});
```

For a video, set the `resource_type` parameter to `video`:

```nodejs
const byteArrayBuffer = fs.readFileSync('people.mp4');
new Promise((resolve, reject) => {
    cloudinary.v2.uploader.unsigned_upload_stream('my_upload_preset', { resource_type: "video" }, (error, uploadResult) => {
        if (error) {
            return reject(error);
        }
        return resolve(uploadResult);
    }).end(byteArrayBuffer);
}).then((uploadResult) => {
    console.log(`Buffer unsigned_upload_stream wth promise success - ${uploadResult.public_id}`);
}).catch((error) => {
    console.error(error);
});
```

Using `await`:

```nodejs
const byteArrayBuffer = fs.readFileSync('people.mp4');
const uploadResult = await new Promise((resolve, reject) => {
    cloudinary.v2.uploader.unsigned_upload_stream('my_upload_preset', { resource_type: "video" }, (error, uploadResult) => {
        if (error) {
            return reject(error);
        }
        return resolve(uploadResult);
    }).end(byteArrayBuffer);
});
```

#### The `upload_chunked` method

The `upload_chunked` method uploads a file to the cloud in chunks, which offers a degree of tolerance for network issues, particularly when uploading large files, like videos.

This method automatically sets to the `resource_type` parameter to `image` if you don't specify it.

> **NOTE**: For any file larger than 20 GB you also need to set the `async` parameter to `true`. If you need to upload very large files you can [contact support](https://support.cloudinary.com/hc/en-us/requests/new) to increase your upload limit up to 100 GB. You can see your current usage limits in your [Console Account Settings](https://console.cloudinary.com/app/settings/account).

The method returns a stream, so for simplicity we wrap it in a `Promise`:

For example, uploading a large video file named `my_large_video.mp4`:

```nodejs
const uploadResult = await new Promise((resolve, reject) => {
    cloudinary.v2.uploader.upload_chunked("my_large_video.mp4", { resource_type: "video" }, (error, uploadResult) => {
        if (error) {
            return reject(error);
        }
        return resolve(uploadResult);
    });
});
```
  
You can change the chunk size using the `chunk_size` parameter. It's 20 MB by default, but you can set it as low as 5 MB. For example, uploading a large video file named `my_large_video.mp4` and setting chunk size to 6 MB:

```nodejs
const uploadResult = await new Promise((resolve, reject) => {
    cloudinary.v2.uploader.upload_chunked("my_large_video.mp4", { resource_type: "video", chunk_size: 6000000 }, (error, uploadResult) => {
        if (error) {
            return reject(error);
        }
        return resolve(uploadResult);
    });
});
```

> **NOTE**: There are multiple responses to a chunked upload: one after each chunk that only includes basic information plus the `done : false` parameter, and a full upload response that's returned after the final chunk {valeExclude}is uploaded{/valeExclude} with `done: true` included in the response.

#### The `upload_chunked_stream` method

The `upload_chunked_stream` method uploads a file to the cloud in chunks, which offers a degree of tolerance for network issues, particularly when uploading large files, like videos. You can set the size of the chunks using the `chunk_size` parameter. This method also takes advantage of Node.js's **stream** functionality. 

This method automatically sets to the `resource_type` parameter to `image` if you don't specify it.

The method returns a stream, so for simplicity we wrap it in a `Promise`:

```nodejs
const byteArrayBuffer = fs.readFileSync('people.mp4');
const uploadResult = await new Promise((resolve, reject) => {
    cloudinary.v2.uploader.upload_chunked_stream({ resource_type: "video", chunk_size: 7000000}, (error, uploadResult) => {
        if (error) {
            return reject(error);
        }
        return resolve(uploadResult);
    }).end(byteArrayBuffer);
});
```

#### The `upload_large` method

The `upload_large` method uploads a file to the cloud in chunks, which offers a degree of tolerance for network issues, particularly when uploading large files, like videos.

This method automatically sets to the `resource_type` parameter to `raw` if you don't specify it.

The method's return type depends on the input:

* **Remote URL**: Returns a `Promise<UploadApiResponse>`
* **Local file path**: Returns an `UploadStream` (already piped internally)

> **NOTE**: For any file larger than 20 GB you also need to set the `async` parameter to `true`. If you need to upload very large files you can [contact support](https://support.cloudinary.com/hc/en-us/requests/new) to increase your upload limit up to 100 GB. You can see your current usage limits in your [Console Account Settings](https://console.cloudinary.com/app/settings/account).

**Uploading from a remote URL** (returns a Promise):

```nodejs
cloudinary.v2.uploader
  .upload_large("https://example.com/my_large_video.mp4", { resource_type: "video" })
  .then(result => console.log(result))
  .catch(error => console.error(error));
```

**Uploading from a local file path** (returns a Stream):

```nodejs
const uploadStream = cloudinary.v2.uploader
  .upload_large("my_large_video.mp4", { resource_type: "video" });

uploadStream.on('end', (result) => {
  console.log('Upload completed:', result);
});

uploadStream.on('error', (error) => {
  console.error('Upload failed:', error);
});
```
  
You can change the chunk size using the `chunk_size` parameter. It's 20 MB by default, but you can set it as low as 5 MB. For example, uploading a local video file with a custom chunk size:

```nodejs
const uploadStream = cloudinary.v2.uploader
  .upload_large("my_large_video.mp4", { resource_type: "video", chunk_size: 6000000 });

uploadStream.on('end', (result) => {
  console.log('Upload completed:', result);
});

uploadStream.on('error', (error) => {
  console.error('Upload failed:', error);
});
```

> **NOTE**: There are multiple responses to a chunked upload: one after each chunk that only includes basic information plus the `done : false` parameter, and a full upload response that's returned after the final chunk {valeExclude}is uploaded{/valeExclude} with `done: true` included in the response.

### Upload response

By default, uploads occur synchronously. Once finished, the uploaded image or video is immediately available for transformation and delivery. An upload call returns a Hash with content similar to the following:
  
```nodejs
{ 
  public_id: 'cr4mxeqx5zb8rlakpfkg',
  version: 1571218330,
  signature: '63bfbca643baa9c86b7d2921d776628ac83a1b6e',
  width: 864,
  height: 576,
  format: 'jpg',
  resource_type: 'image',
  created_at: '2017-06-26T19:46:03Z',
  bytes: 120253,
  type: 'upload',
  url: 'http://res.cloudinary.com/demo/image/upload/v1571218330/cr4mxeqx5zb8rlakpfkg.jpg',
  secure_url: 'https://res.cloudinary.com/demo/image/upload/v1571218330/cr4mxeqx5zb8rlakpfkg.jpg' 
}
```

The response includes HTTP and HTTPS URLs for accessing the uploaded media asset as well as additional information regarding the uploaded asset: The public ID, resource type, width and height, file format, file size in bytes, a signature for verifying the response and more.  
  

## Direct uploading from the browser

The upload methods mentioned above allow your server-side Node.js code to upload media assets to Cloudinary. In this flow, if you have a web form that allows your users to upload images or videos, the media file's data is first sent to your server and only then uploaded to Cloudinary.

A more efficient and powerful option is to allow your users to upload images and videos in your client-side code directly from the browser to Cloudinary instead of going through your servers. This method allows for faster uploading and a better user experience. It also reduces load from your servers and reduces the complexity of your Node.js applications.

You can upload directly from the browser using signed or unsigned calls to the upload endpoint, as shown in the [Upload multiple files using a form](client_side_uploading#sample_app_upload_multiple_files_using_a_form_unsigned) examples.

For signed uploads from your client-side code, a [secure signature](authentication_signatures) must be generated in your server-side Node.js code. You can use the `api_sign_request` method to [generate SHA signatures](authentication_signatures#using_cloudinary_backend_sdks_to_generate_sha_authentication_signatures):

```nodejs
cloudinary.utils.api_sign_request(params_to_sign, api_secret);
```

> **READING**:
>
> * For more information on uploading media assets, see the [Upload](upload_images) guide. 

> * For details on all available upload parameters, see the [upload](image_upload_api_reference#upload) method of the Upload API Reference.

