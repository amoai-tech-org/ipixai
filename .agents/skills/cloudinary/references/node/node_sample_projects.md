---
name: cloudinary-node-sample-projects
description: >
  Node.js Cloudinary sample projects — photo album and reference server apps. Load
  when looking for end-to-end Node integration examples.
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

# Node.js sample projects


[app-gallery-link]: https://app-gallery.cloudinary.com/gallery?tag=NodeJS

We've created some sample projects to get you started with integrating Cloudinary into your Node.js application. 
> **TIP**: Check out our collection of [Node.js sample apps](code_explorers) too!

## Photo Album

The [Photo Album app](https://github.com/cloudinary-devs/nodejs-photo-album) demonstrates best practices for integrating Cloudinary within a Node.js environment.

This sample project provides several RESTful API endpoints — some designed for CLI-based use cases and others for showcasing how to use Node.js as the backend for a browser-based application.

The browser-based implementation utilizes **LIT**, one of many options available for building a UI around a Node.js REST API.

Two endpoints, `/upload-from-local` and `/upload-large-from-local`, can be accessed directly. These endpoints perform operations using Node.js's built-in file system module.

All other endpoints demonstrate various methods for uploading files via a browser-based UI.

Here's the Photo Album app in action, showcasing its browser-based UI:

Here's an excerpt from the code showing the `uploadFromBrowser` route handler:

routeHandlers.js

```nodejs

const uploadFromBrowser = async (request, reply) => {
  console.log('Uploading files from the browser');
  try {
    const data = await request.file();

    const buffer = await data.toBuffer();
    await new Promise((resolve) => {
      cloudinary.uploader
        .upload_chunked_stream({ tags }, (error, uploadResult) => {
          if (error) {
            reply.code(500).send({ error: 'Failed to upload image' });
          } else {
            resolve(uploadResult);
            reply.send({
              url: uploadResult.secure_url,
              public_id: uploadResult.public_id,
            });
          }
        })
        .end(buffer);
    });
  } catch (error) {
    console.error(error);
  }
};

```

> **See the full code**:
>
> * [Explore the Photo Album app on GitHub](https://github.com/cloudinary-devs/nodejs-photo-album).

## App Gallery
The [Cloudinary app gallery][app-gallery-link] provides a variety of fully working apps that incorporate Cloudinary as part of the tech stack, built in various popular programming languages.

Each app in the gallery presents an overview of the functionality, a link to the open-source repo, and complete setup instructions, so that you can grab the code and easily build your own version.

  
    
  

