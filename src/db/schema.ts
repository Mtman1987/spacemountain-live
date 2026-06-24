import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  username: text('username').notNull().unique(),
  recoveryEmail: text('recovery_email'),
  role: text('role').notNull().default('Passenger'),
  status: text('status').notNull().default('Offline'),
  points: integer('points').notNull().default(0),
  avatarSpeaking: integer('avatar_speaking', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

export const communityTools = sqliteTable('community_tools', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  badge: text('badge').notNull(), // emoji or key representation
  miniLabel: text('mini_label').notNull(),
  statusText: text('status_text').notNull(),
  statusType: text('status_type').notNull().default('default'), // 'live', 'warn', 'pink', 'default'
  route: text('route').notNull(),
  pointsFlow: integer('points_flow').notNull().default(0),
});

export const userPreferences = sqliteTable('user_preferences', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  theme: text('theme').notNull().default('Nebula Purple'),
  glowIntensity: integer('glow_intensity').notNull().default(75),
  starDensity: integer('star_density').notNull().default(70),
  shootingStars: integer('shooting_stars', { mode: 'boolean' }).notNull().default(true),
  sidebarCollapsed: integer('sidebar_collapsed', { mode: 'boolean' }).notNull().default(false),
});
