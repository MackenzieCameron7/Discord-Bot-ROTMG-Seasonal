import { relations } from "drizzle-orm"
import { integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core'

//// Defining Table schemas

// Players
export const playersTable = sqliteTable('players', {
    discordId: text('discord_id').primaryKey().notNull().unique(),
    discordName: text('discord_name').notNull(),
    score: integer('score').notNull().default(0),
})
// Items
export const itemTable = sqliteTable('items', {
    id: integer('id').primaryKey({autoIncrement: true}),
    itemName: text('item_name').notNull(),
    itemPointValue: integer('item_point_value').notNull(),
    itemImage: text('item_image').notNull(),
})
// Bridging table: Players & Items
export const playersItemsTable = sqliteTable('playerItems', {
    itemAcquired: integer('item_acquired').default(0),
    discordId: text('player_id').notNull().references(() => playersTable.discordId, { onDelete: "cascade" }),
    itemId: integer('item_id').notNull().references(() => itemTable.id, { onDelete: "cascade" }),
}, (table) => ({
    pk: primaryKey(table.discordId, table.itemId)
}))

//// Defining Table relationships

// Players -> Items
export const playersRelations = relations(playersTable, ({ many }) => ({
    playerItems: many(playersItemsTable),
}))
// Items -> Players
export const itemsRelations = relations(itemTable, ({ many }) => ({
    itemOwners: many(playersItemsTable),
}))
// PlayersItems -> Players AND Items
export const playersItemsRelations = relations(playersItemsTable, ({ one }) => ({
    player: one(playersTable, { fields: [playersItemsTable.discordId], references: [playersTable.discordId] }),
    item: one(itemTable, { fields: [playersItemsTable.itemId], references: [itemTable.id] }),
}))

//// Defining Inserts & Selects

// Players
export type InsertPlayer = typeof playersTable.$inferInsert
export type SelectPlayer = typeof playersTable.$inferSelect
// Items
export type InsertItem = typeof itemTable.$inferInsert
export type SelectItem = typeof itemTable.$inferSelect
// PlayersItems
export type InsertPlayerItem = typeof playersItemsTable.$inferInsert
export type SelectPlayerItem = typeof playersItemsTable.$inferSelect