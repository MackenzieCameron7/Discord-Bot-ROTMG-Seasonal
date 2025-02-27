import { Client, Events, GatewayIntentBits } from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import fetch from "node-fetch";
import pixelmatch from 'pixelmatch';

// Interface for image object to help with JSON to object conversion
interface myImageObject {
  attachment: string;
  name: string;
  id: string;
  size: number;
  url: string;
  proxyUrl: string;
  height: number;
  width: number;
  contentType: string;
  description: string;
  ephemeral: boolean;
  duration: number;
  waveform: number;
  flags: number;
  title: string;
}

////////////// Saving this code here to modify/add to compare imgae functionality to check the 16 inventory
///////////// slots of a screenshot no matter the size... 

// // Screenshot height and width
// const screenWidth = img1.width
// const screenHeight = img1.height

// // Spots of the incoming screenshot based on where inventory slots sit in relation to screenshot
// // width and height in percentage% form. refer to "image png" for screenshot reference
// const spots = [
//   //First inventory row
//   {x: screenWidth * 0.84, y: screenHeight * 0.67},
//   {x: screenWidth * 0.88, y: screenHeight * 0.67},
//   {x: screenWidth * 0.92, y: screenHeight * 0.67},
//   {x: screenWidth * 0.96, y: screenHeight * 0.67},
//   //Second
//   {x: screenWidth * 0.84, y: screenHeight * 0.75},
//   {x: screenWidth * 0.88, y: screenHeight * 0.75},
//   {x: screenWidth * 0.92, y: screenHeight * 0.75},
//   {x: screenWidth * 0.96, y: screenHeight * 0.75},
//   //Third
//   {x: screenWidth * 0.84, y: screenHeight * 0.88},
//   {x: screenWidth * 0.88, y: screenHeight * 0.88},
//   {x: screenWidth * 0.92, y: screenHeight * 0.88},
//   {x: screenWidth * 0.96, y: screenHeight * 0.88},
//   //Fourth
//   {x: screenWidth * 0.84, y: screenHeight * 0.96},
//   {x: screenWidth * 0.88, y: screenHeight * 0.96},
//   {x: screenWidth * 0.92, y: screenHeight * 0.96},
//   {x: screenWidth * 0.96, y: screenHeight * 0.96},
// ]

// Function to compare images using html element canvases. lhs is icoming from user. rhs is coming from database
async function compareImages(url1: string, url2: string):  Promise<number> {

  // Loading images from the url extracted from image object
  const [img1, img2] = await Promise.all([loadImage(url1), loadImage(url2)])
  // TESTING
  console.log("Images loaded successfully")

  // Checking spots from screenshot based on DIMENSIONS of images from db
  const width = img2.width
  const height = img2.height

  // Creation of Canvases
  const canvas1 = createCanvas(width, height)
  const canvas2 = createCanvas(width, height)
  const context1 = canvas1.getContext("2d")
  const context2 = canvas2.getContext("2d")

  // Draw the images onto canvases 
  context1.drawImage(img1, 0, 0, width, height)
  context2.drawImage(img2, 0, 0, width, height)

  // Getting pixel data from images
  const imgData1 = context1.getImageData(0,0, width, height)
  const imgData2 = context2.getImageData(0,0, width, height)

  // Creating a diff canvas
  const diffCanvas = createCanvas(width, height)
  const diffContext = diffCanvas.getContext("2d")
  const diff = diffContext.createImageData(width, height)

  // Compare Images
  const numDiffPixels = pixelmatch(imgData1.data, imgData2.data, diff.data, width, height, {threshold: 0.1})

  return numDiffPixels
}


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user?.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  
  // Check if the message contains any attachments
  if (message.attachments.size > 0){

    // Images are attached to a message as a collection of <string>
    message.attachments.forEach(async (attachment) => {

      //TESTING
      console.log(attachment)

      // Convert attachment to JSON
      const imgJSON: unknown = await attachment.toJSON()

      // Parsing JSON to create an image object
      const img: myImageObject = JSON.parse(JSON.stringify(imgJSON))

      // Retrieving url key/value from image object and storing it
      const imgUrl: string = img["url"]

      // Comparing images returning a number
      //TESTING
      await compareImages(imgUrl, "src\\Candy Ring(Shiny).png")
    })

  }
});

await client.login(process.env.DISCORD_BOT_TOKEN);