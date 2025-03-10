import { Client, Events, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { createCanvas, Image, loadImage } from 'canvas';
import pixelmatch from 'pixelmatch';
import * as db from'./db';
import fs from "fs"
import path from "path"

// Helper to extract data types from promises
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T
type ItemData = UnwrapPromise<ReturnType<typeof db.getAllItemsData>>
type PlayerData = UnwrapPromise<ReturnType<typeof db.getAllPlayersData>>

// Declaring Constants, so less calls are being made to the database
// Items won't change, whereas players and playersItemsTable depends on incoming data
const ITEMS: ItemData = await db.getAllItemsData()

// Inserting into DB
//insertItem("src/assets")
//console.log("items added to db")

// Return type for adding item function
type flagAndScore = {
  flag: boolean,
  totalScore: number,
}

// Player interface to help sort PlayerData
type Player = {
  discordId: string;
  discordName: string;
  score: number;
}

// Interface for image object to help with JSON to Image Object conversion
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

// Function to compare images using html canvases. lhs is a screenshot incoming from user. rhs is coming from database
async function compareImages(screenshotUrl: string, dbUrl: string):  Promise<number[]> {
  
  //Array of numbers of pixel difference comparison
  const diffArray: number[] = []

  // Loading images from the url extracted from image object
  const [img1, img2] = await Promise.all([loadImage(screenshotUrl), loadImage(dbUrl)])
  
  // TESTING
  //console.log("Images loaded successfully")

  // Checking spots from screenshot based on DIMENSIONS of images from db
  const width1 = img1.width
  const height1 = img1.height
  const width2 = img2.width
  const height2 = img2.height

  // Creation of Canvases
  const canvas1 = createCanvas(width1, height1)
  const canvas2 = createCanvas(width2, height2)
  const context1 = canvas1.getContext("2d")
  const context2 = canvas2.getContext("2d")

  // Draw the images onto canvases 
  context1.drawImage(img1, 0, 0, width1, height1)
  context2.drawImage(img2, 0, 0, width2, height2)

  // Creating a diff canvas
  const diffCanvas = createCanvas(width1, height1)
  const diffContext = diffCanvas.getContext("2d")

  // Screenshot height and width
  const screenWidth = img1.width
  const screenHeight = img1.height

  // 16 hardcoded positions of screenshots with a resolution of 1920 x 1080
  // FUTURE: Could caculate coordinates if png sent to chat != 1920 x 1080 ex x: screenWidth*0.84 &
  // Account for windowed mode and screen sizes with resolutions larger/smaller than 1920 x 1080
  const spots = [
   //First inventory row
   {x: 1580, y: 688},
   {x: 1663, y: 688},
   {x: 1746, y: 688},
   {x: 1829, y: 688},
   //Second
   {x: 1580, y: 771},
   {x: 1663, y: 771},
   {x: 1746, y: 771},
   {x: 1829, y: 771},
   //Third
   {x: 1580, y: 913},
   {x: 1663, y: 913},
   {x: 1746, y: 913},
   {x: 1829, y: 913},
   //Fourth
   {x: 1580, y: 996},
   {x: 1663, y: 996},
   {x: 1746, y: 996},
   {x: 1829, y: 996},
  ]   
  
  // Compare each inventory slot in screenshot to rhs
  for (const {x, y} of spots){

    // Getting pixel data from images
    const imgData1 = context1.getImageData(x, y, width2, height2)
    const imgData2 = context2.getImageData(0,0, width2, height2)
    const diff = diffContext.createImageData(width2, height2)

    const numDiffPixels = pixelmatch(imgData1.data, imgData2.data, diff.data, width2, height2, { threshold: 0.1 })

    //TESTING
    //console.log(`Slot first pixel: R${imgData1.data[0]}, G${imgData1.data[1]}, B${imgData1.data[2]}`);
    //console.log(`Item first pixel: R${imgData2.data[0]}, G${imgData2.data[1]}, B${imgData2.data[2]}`);

    //TESTING
    //console.log(numDiffPixels.toString())

    diffArray.push(numDiffPixels)
  }

  return diffArray
}

// Slash Command
const commandData = new SlashCommandBuilder()
  .setName('bot')
  .setDescription('Makes buttons appear from bot')

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user?.tag}`);

  const guildId = process.env.GUILD_ID
  const guild = client.guilds.cache.get(guildId)
  if (guild) {
      await guild.commands.create(commandData)
      console.log('Slash command registered.')
  }
});

// HANDLE Commands
client.on(Events.InteractionCreate, async (interaction) => {

  if (interaction.isChatInputCommand()){

    if (interaction.commandName === 'bot'){
      //// Creating a buttons
      const row = new ActionRowBuilder<ButtonBuilder>()

      // LeaderBoard button
      row.addComponents(
        new ButtonBuilder()
          .setCustomId("leaderboard")
          .setLabel("Leader Board")
          .setStyle(ButtonStyle.Primary)
      )
      // List left button
      row.addComponents(
        new ButtonBuilder()
          .setCustomId("listRemaining")
          .setLabel("Left to Get")
          .setStyle(ButtonStyle.Success)
      )
      // Display buttons
      await interaction.reply ({
        content: "Click a button below",
        components: [row],
        withResponse: true
      })
    }
  }
})

// HANDLE Buttons
client.on(Events.InteractionCreate, async (interaction) => {

  if (interaction.isButton()){

    const PLAYERS: PlayerData = await db.getAllPlayersData()
      // Leaderboard 
      if (interaction.customId === "leaderboard"){
      
        const playerScoreDesc : PlayerData = PLAYERS
        // Sort Player data for score descending
        playerScoreDesc.sort((a, b) => b.score - a.score)
      
        // Formig output
        let outLeaderboardMessage: string = "LeaderBoard: \n"
        for(let ii = 0; ii < playerScoreDesc.length ; ii++){
          outLeaderboardMessage += `${ii + 1}: ${playerScoreDesc[ii].discordName} score: ${playerScoreDesc[ii].score} \n`
        }
        interaction.reply(outLeaderboardMessage)
        await interaction.message.delete()
      }
    
      // list of remaining items to get
      if (interaction.customId === "listRemaining"){
        interaction.reply("Not implemented yet... Pls hold.... New phone who dis??")
      }
  } 
})

client.on(Events.MessageCreate, async (message) => {
  //TESTING author
  console.log(message.author.toString())
  console.log(message.author.username.toString()) // original usename 
  console.log(message.author.id.toString()) // id 
  console.log(message.author.displayName) // current display name

  // Check if user sending message is New or The bot itself. if True insert new user in db. if False do nothing.
  if(!(message.author.id === process.env.DISCORD_BOT_ID)){
    await db.createPlayer(message.author.id, message.author.displayName)
  }

  // Check if the message contains any attachments
  if (message.attachments.size > 0){

    // Images are attached to a message as a collection of <string>
    message.attachments.forEach(async (attachment) => {

      //TESTING
      //console.log(attachment)

      // Convert attachment to JSON
      const imgJSON: unknown = await attachment.toJSON()

      // Parsing JSON to create an image object
      const img: myImageObject = JSON.parse(JSON.stringify(imgJSON))

      // Retrieving url key/value from image object and storing it
      const imgUrl: string = img["url"]

      // Compare the 16 slots in the screenshot to every image in db
      for(const item of ITEMS){ 

        // Comparing images returning a number
        const results: number[] = await compareImages(imgUrl, item.itemImage)

        // Checking results for matching based on criteria ( 0 pixels different between images)
        for(let ii = 0; ii < 16; ii++) {
          if(results[ii] <= 71) {
            const flagScore: flagAndScore = await db.addItemToPlayer(item.id, message.author.id)

            if (flagScore.flag === true){
              await message.reply(`${message.author.displayName} Acquired: ${item.itemName} for ${item.itemPointValue} points, bringing them to ${flagScore.totalScore} total points`)
            }
          }
        }
      }
    })
  }
});

// Function to insert intems into DB
async function insertItem(folderPath: string){
  const files = fs.readdirSync(folderPath)

  for(const file of files){
    let pathToChange = `src/assets/${path.parse(file).name}.png`
    const pathToImage = pathToChange.replace(/\//g, "\\\\")
    await db.addItemToDB(path.parse(file).name, pathToImage)
  }
}

await client.login(process.env.DISCORD_BOT_TOKEN);