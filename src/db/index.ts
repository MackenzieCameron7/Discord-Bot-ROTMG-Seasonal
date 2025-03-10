import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from "@libsql/client";
import { playersTable, itemTable, playersItemsTable } from './schema';
import * as schema from './schema';
import { sql, eq, and } from 'drizzle-orm';

const client = createClient({
  url: process.env.DB_FILE_NAME!,
});
const db = drizzle(client, {schema});

// Adding Items to db
export async function addItemToDB(fileName: string, itemImage: string): Promise<void>{
  const newItem = {
    itemName: fileName,
    itemPointValue: 0,
    itemImage: itemImage,
  }
  await db.insert(itemTable).values(newItem)
}

// Creating a new Player
export async function createPlayer(discordId: string, discordName: string): Promise<boolean> {
  let isNew = false
  try {
    await db.insert(playersTable).values({ discordId, discordName }).onConflictDoNothing()
    isNew = true
  } catch (error) {
    console.error(error)
    isNew = false
  }
  return isNew
}

// Getting item count
export async function getItemCount(): Promise<number> {
  const numItems = await db.select({ count: sql<number>`COUNT(*)` }).from(itemTable)
  const actualNumber = Number(numItems[0].count)
  return actualNumber
}

// Getting All Item data
export async function getAllItemsData() {
  return await db.select().from(itemTable)
}

// Getting All items owned by a player
export async function getAllPlayersItems(discordId : string) {
  await db.select().from(playersItemsTable)
    .where(eq(playersItemsTable.discordId, discordId))
}

// Getting All Player data
export async function getAllPlayersData() {
  return await db.select().from(playersTable)
}

// Return type
type flagAndScore = {
  flag: boolean,
  totalScore: number,
}
// Extractable type
type scoreObject = {
  score: number
}
// Add item to player
export async function addItemToPlayer(itemId: number, discordId: string): Promise<flagAndScore> {
  let flag: flagAndScore = {flag: false, totalScore: 0}

  // Check if bridging table record already made and isAcquired is false
  const entryExists = await db.select().from(playersItemsTable)
  .where( 
    and(  eq(playersItemsTable.discordId, discordId),
          eq(playersItemsTable.itemId, itemId)
        ))
  .limit(1)
  
  // Do nothing if it exists and itemsAcquired is True
  if (entryExists.length > 0 && entryExists[0].itemAcquired === 1) {
    console.log("Item is already acquired, skipping insertion")
    return flag
  }

  // Make new entry & set itemsAcquired to True
  await db.insert(playersItemsTable).values({
    itemAcquired: 1,
    discordId,
    itemId,
  })

  console.log("Item Successfully given to the player")

  // Setting new total points
  await db.update(playersTable).set({
    score:(await db.select({ score: playersTable.score }).from(playersTable)
          .where(eq(playersTable.discordId, discordId))
          .get())!.score +
          (await db.select({ itemPointValue: itemTable.itemPointValue }).from(itemTable)
          .where(eq(itemTable.id, itemId))
          .get())!.itemPointValue
  })
  .where(eq(playersTable.discordId, discordId))

  const objectArray: scoreObject[] = (await db.select({ score: playersTable.score }).from(playersTable).where(eq(playersTable.discordId, discordId)))
  flag.totalScore = objectArray[0].score
  flag.flag = true
  
  return flag
}