import dotenv from "dotenv";
import fs from "fs/promises";
import fsSync from "fs";
import { createWriteStream } from "fs";
import path from "path";
import fetch from "node-fetch";
import sharp from "sharp";
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import AWS from 'aws-sdk';

dotenv.config();

// Configure AWS
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Lambda API configuration for image generation
const LAMBDA_IMAGE_URL = "https://kns2nsl3g3.execute-api.us-east-1.amazonaws.com/default/deepInfraImageGeneration";
const REPLICATE_LAMBDA_URL = "https://lnkng70jke.execute-api.us-east-1.amazonaws.com/default/minimaxReplicateImageGeneration";

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Helper function to wait
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to fetch with retry
async function fetchWithRetry(url, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        timeout: 15000 // 15 seconds timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.log(`Attempt ${i + 1} failed: ${error.message}`);
      lastError = error;
      
      if (i < maxRetries - 1) {
        // Wait before retrying, with exponential backoff
        await delay(initialDelay * Math.pow(2, i));
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
}

// Helper function to call Lambda for image generation
async function callFluxAPI(prompt, size = "1024x1024", referenceImage = null) { // kept name to avoid refactors
  const requestBody = {
    function: "generate-image",
    prompt: prompt,
    link: "writecream.com"
  };

  const response = await fetch(LAMBDA_IMAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  console.log(response, 'response');
  

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lambda image API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(data, "datas");
  

  // If Lambda returns a direct base64 data URL or raw base64
  if (data.imageData) {
    const imageData = typeof data.imageData === "string" ? data.imageData : "";
    const base64 = imageData.includes("base64,") ? imageData.split("base64,")[1] : imageData;
    if (base64) return base64;
  }

  // If Lambda returns an image URL, fetch it and convert to base64
  const imageUrl = data.s3Url || data.image_link || data.imageUrl || data.url;
  if (imageUrl) {
    // Return the URL directly; caller will decide how to handle it
    return imageUrl;
  }

  // As a last resort, support DeepInfra-like structure if Lambda forwards it
  if (data.data && data.data[0] && data.data[0].b64_json) {
    return data.data[0].b64_json;
  }

  throw new Error("Invalid response format from Lambda image API");
}

export const uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploadPromises = req.files.map(async (file) => {
      try {
        const fileContent = await fs.readFile(file.path);
        const random_id = Math.floor(Math.random() * Date.now());
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `asset_file/new/asset-${random_id}.${file.originalname.split('.').pop()}`,
          Body: fileContent,
          ACL: "public-read"
        };

        const uploadResult = await s3.upload(params).promise();
        
        // Delete the local file after successful upload
        await fs.unlink(file.path);

        return {
          url: uploadResult.Location,
          key: uploadResult.Key,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          fileType: file.mimetype.includes("video") ? "video" : "image",
        };
      } catch (error) {
        // If there's an error, try to clean up the local file
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error deleting local file:', unlinkError);
        }
        console.error(`Error uploading file ${file.originalname}:`, error);
        throw error;
      }
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    res.status(200).json({
      message: "Files uploaded successfully to S3",
      files: uploadedFiles,
      count: uploadedFiles.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ 
      message: "Error uploading files to S3", 
      error: error.message 
    });
  }
};

export const generatePrompt = async (req, res) => {
  try {
    const { categoryName, categorySlug, categoryImage, type, prompt } = req.body;

    if (!categoryName) {
      return res.status(400).json({ message: "Category name is required" });
    }

    let text;
    if (type === "prompt") {
      text = `create a unique and professional single prompt of 15-20 words that will generate a beautiful image for ${categoryName}.Just return the prompt. Do not include any explanations, or additional text.`;
    } else if (type === "meta") {
      text = `You are an expert SEO assistant. Based on the provided category details, generate a fully optimized <head> HTML section for an AI tool web page.Everything should be inside the <head> tag.Don't put html at the start. Use the following placeholders:

- ${categoryName}
- description of category ${categoryName}
- keywords of category ${categoryName}
- ${categoryImage}
- https://www.airbrush.ai/${categorySlug}

Generate the complete <head> section including:

1. <head> and </head> tags
2. <title> — Use ${categoryName}
3. <meta name="description"> — Use description of category ${categoryName} (within 160 characters)
4. <meta name="keywords"> — Use keywords of category ${categoryName} (comma-separated SEO terms)
5. Basic meta tags:
   - charset
   - viewport
   - robots = "index, follow"
   - author = "Airbrush.ai"
   - theme-color = "#000000"
   - content-language = "en-US"
6. <link rel="canonical"> — Use https://www.airbrush.ai/${categorySlug}
7. Favicons:
   - <link rel="icon" href="https://ai4chat-files.s3.amazonaws.com/images/airbrush/image-1737741097321.jpg">
   - <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
   - <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
   - <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
8. Open Graph tags:
   - og:title = ${categoryName}
   - og:description = description of category ${categoryName}
   - og:image = ${categoryImage}
   - og:url = https://www.airbrush.ai/${categorySlug}
   - og:type = "website"
   - og:site_name = "Airbrush.ai"
9. Twitter Card tags:
   - twitter:card = "summary_large_image"
   - twitter:title = ${categoryName}
   - twitter:description = description of category ${categoryName}
   - twitter:image = ${categoryImage}
   - twitter:url = https://www.airbrush.ai/${categorySlug}
   - twitter:site = "@AirbrushAI"
   - twitter:creator = "@AirbrushAI"
10. JSON-LD (WebApplication schema) with:
    - name = ${categoryName}
    - description = description of category ${categoryName}
    - url = https://www.airbrush.ai/${categorySlug}
    - image = ${categoryImage}
    - applicationCategory = "Graphics Application"
    - operatingSystem = "Windows, Linux, Mac, iOS, Android"
    - price = "0.00 USD"

⚠️ Return only the full <head>...</head> HTML block with values filled in or as placeholders. Do not add comments, explanations, or extra text.`;
    } else if (type === "blog_content") {
      text = `create a unique blog content of 350-400 words related to the topic ${categoryName}`;
    } else { text = prompt; }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",  // you can also use "google/gemini-pro"
        messages: [
          {
            role: "user",
            content: text,
          }
        ]
      })
    });

    const data = await response.json();
    console.log("Gemini Response:", data.choices[0].message.content);
    return res.status(200).json(data.choices[0].message.content)
  } catch (error) {
    console.error("Prompt generation error:", error);
    res
      .status(500)
      .json({ message: "Error generating prompt", error: error.message });
  }
};

export const generateImage = async (req, res) => {
  try {
    const { 
      prompt, 
      subject_reference, // Add support for reference image
      format = 'webp', // webp provides better compression
      quality = 80,    // 0-100, lower means more compression
      compression = 6  // 0-9 for PNG compression level
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    // Clean the prompt if it contains the "**Prompt:**" prefix
    const cleanedPrompt = prompt.split("**Prompt:**")[1]?.trim() || prompt;

    const input = {
      prompt: cleanedPrompt,
      aspect_ratio: "1:1"  // You can make this configurable through req.body if needed
    };

    // Add subject_reference if provided
    if (subject_reference) {
      input.subject_reference = subject_reference;
    }

    let imageSource;
    try {
      imageSource = await callFluxAPI(cleanedPrompt, input.aspect_ratio, subject_reference);
      console.log("Image source received from Lambda image API");
      
      if (!imageSource) {
        throw new Error("No output received from Deepinfra");
      }
    } catch (error) {
      console.error("Lambda image API error:", error);
      return res.status(500).json({
        message: "Error generating image with Lambda",
        error: error.message
      });
    }

    try {
      // Ensure we have a Buffer regardless of URL or base64
      let buffer;
      if (typeof imageSource === 'string' && /^https?:\/\//i.test(imageSource)) {
        const response = await fetchWithRetry(imageSource);
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else if (typeof imageSource === 'string') {
        buffer = Buffer.from(imageSource, 'base64');
      } else {
        throw new Error('Unsupported image source format');
      }

      // Process the image with Sharp focusing on compression
      let sharpInstance = sharp(buffer);
      
      // Configure compression based on format
      switch(format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          sharpInstance = sharpInstance.jpeg({ quality });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ 
            quality,
            effort: 6, // 0-6, higher means better compression but slower
            lossless: false
          });
          break;
        case 'avif':
          sharpInstance = sharpInstance.avif({ 
            quality,
            effort: 6  // 0-9, higher means better compression but slower
          });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ 
            compressionLevel: compression,
            effort: 10  // 1-10, higher means better compression but slower
          });
          break;
        default:
          sharpInstance = sharpInstance.webp({ quality }); // default to webp
      }

      const processedImageBuffer = await sharpInstance.toBuffer();
      const stats = await sharp(processedImageBuffer).stats();
      
      // Get original size for comparison
      const originalSize = buffer.length;
      const compressedSize = processedImageBuffer.length;
      const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
      
      // Log detailed compression information
      console.log('\nImage Compression Details:');
      console.log('------------------------');
      console.log(`Format: ${format}`);
      console.log(`Original Size: ${(originalSize / 1024).toFixed(2)} KB`);
      console.log(`Compressed Size: ${(compressedSize / 1024).toFixed(2)} KB`);
      console.log(`Compression Ratio: ${compressionRatio}%`);
      console.log(`Space Saved: ${((originalSize - compressedSize) / 1024).toFixed(2)} KB`);
      console.log(`Quality Setting: ${quality}`);
      if (format.toLowerCase() === 'png') {
        console.log(`PNG Compression Level: ${compression}`);
      }
      console.log('------------------------\n');

      const base64String = processedImageBuffer.toString('base64');
      const mimeType = `image/${format.toLowerCase()}`;

      res.status(200).json({
        message: "Image generated and compressed successfully",
        imageData: `data:${mimeType};base64,${base64String}`,
        stats: {
          format,
          originalSize: originalSize,
          compressedSize: compressedSize,
          compressionRatio: `${compressionRatio}%`,
          quality,
          channels: stats.channels,
          isOpaque: stats.isOpaque
        }
      });
    } catch (error) {
      console.error("Error processing generated image:", error);
      res.status(500).json({
        message: "Error processing generated image",
        error: error.message
      });
    }
  } catch (error) {
    console.error("Image generation error:", error);
    res.status(500).json({
      message: "Error generating image",
      error: error.message
    });
  }
};

export const generateImageWithReference = async (req, res) => {
  try {
    const { 
      prompt,
      format = 'webp',
      quality = '80',
      compression = '6',
      aspect_ratio = "1:1"
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    // Convert string parameters to numbers
    const qualityNum = parseInt(quality) || 80;
    const compressionNum = parseInt(compression) || 6;

    // Clean the prompt if it contains the "**Prompt:**" prefix
    const cleanedPrompt = prompt.split("**Prompt:**")[1]?.trim() || prompt;

    // Prepare subject reference data URL if an image is uploaded
    let subjectReferenceDataUrl = undefined;
    if (req.file) {
      try {
        const imageBuffer = req.file.buffer;
        const base64Image = imageBuffer.toString('base64');
        const mimeType = req.file.mimetype;
        subjectReferenceDataUrl = `data:${mimeType};base64,${base64Image}`;
        console.log("Subject reference image prepared for Lambda");
      } catch (error) {
        console.error("Error processing reference image:", error);
        return res.status(400).json({ 
          message: "Error processing reference image", 
          error: error.message 
        });
      }
    }

    // Call the Lambda for Minimax/Replicate-backed image generation
    let base64Output;
    try {
      const requestBody = {
        function: "generate-image-with-reference",
        prompt: cleanedPrompt,
        link: "writecream.com",
        aspect_ratio,
        image_url: subjectReferenceDataUrl
      };

      const response = await fetch(REPLICATE_LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Lambda reference image API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Prefer base64 if provided
      if (data.imageData) {
        const imageData = typeof data.imageData === 'string' ? data.imageData : '';
        const base64 = imageData.includes('base64,') ? imageData.split('base64,')[1] : imageData;
        if (base64) {
          base64Output = base64;
        }
      }

      // If URL provided, fetch and convert
      if (!base64Output) {
        const imageUrl = data.s3Url || data.image_link || data.imageUrl || data.url;
        if (!imageUrl) {
          // Also support DeepInfra-like structure if forwarded
          if (data.data && data.data[0] && data.data[0].b64_json) {
            base64Output = data.data[0].b64_json;
          } else {
            throw new Error('Invalid response format from Lambda reference image API');
          }
        } else {
          // Return URL directly; later stage handles URL vs base64
          base64Output = imageUrl;
        }
      }

      if (!base64Output) {
        throw new Error('No image data received from Lambda reference image API');
      }
      console.log('Image source received from Lambda reference image API');
    } catch (error) {
      console.error('Lambda reference image API error:', error);
      return res.status(500).json({
        message: 'Error generating image with Lambda (reference)',
        error: error.message
      });
    }

    try {
      // Ensure we have a Buffer regardless of URL or base64
      let buffer;
      if (typeof base64Output === 'string' && /^https?:\/\//i.test(base64Output)) {
        const response = await fetchWithRetry(base64Output);
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else if (typeof base64Output === 'string') {
        buffer = Buffer.from(base64Output, 'base64');
      } else {
        throw new Error('Unsupported image source format');
      }

      // Process the image with Sharp focusing on compression
      let sharpInstance = sharp(buffer);
      
      // Configure compression based on format using the converted numbers
      switch(format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          sharpInstance = sharpInstance.jpeg({ quality: qualityNum, progressive: true });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ 
            compressionLevel: compressionNum,
            progressive: true 
          });
          break;
        case 'webp':
        default:
          sharpInstance = sharpInstance.webp({ 
            quality: qualityNum,
            effort: 6 // Maximum compression effort
          });
          break;
      }

      const compressedBuffer = await sharpInstance.toBuffer();
      const base64Data = compressedBuffer.toString('base64');

      res.status(200).json({
        message: 'Image generated successfully',
        imageData: `data:image/${format};base64,${base64Data}`,
        compression: {
          format,
          quality: qualityNum,
          originalSize: buffer.length,
          compressedSize: compressedBuffer.length,
          compressionRatio: ((1 - compressedBuffer.length / buffer.length) * 100).toFixed(2) + '%'
        }
      });

    } catch (processingError) {
      console.error('Image processing error:', processingError);
      return res.status(500).json({
        message: 'Error processing generated image',
        error: processingError.message
      });
    }

  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({
      message: 'Error generating image',
      error: error.message
    });
  }
};

export const downloadImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ message: "Image URL is required" });
    }

    // Fetch the image from S3
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Get the content type
    const contentType = response.headers.get('content-type');
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'attachment');
    
    // Pipe the response to the client
    response.body.pipe(res);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ 
      message: "Error downloading image", 
      error: error.message 
    });
  }
};
