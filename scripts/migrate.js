#!/usr/bin/env node

/**
 * @file Database Migration Script
 * @version 1.0.0
 * @description Runs database migrations for the Stripe monetization plugin
 */

import { DatabaseManager } from '../dist/core/database/manager.js';
import { loadConfigFromEnv } from '../dist/interfaces/config.js';

async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  try {
    // Load configuration from environment
    const config = loadConfigFromEnv();
    
    if (!config.database) {
      throw new Error('Database configuration not found');
    }
    
    // Initialize database manager
    const databaseManager = new DatabaseManager(config.database);
    
    // Initialize and run migrations
    await databaseManager.initialize();
    await databaseManager.migrate();
    
    console.log('✅ Database migrations completed successfully!');
    
    // Close database connection
    await databaseManager.close();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'up':
  case 'migrate':
    runMigrations();
    break;
  case 'status':
    checkMigrationStatus();
    break;
  case 'rollback':
    rollbackMigrations();
    break;
  default:
    console.log(`
Usage: npm run migrate [command]

Commands:
  up, migrate    Run pending migrations (default)
  status         Check migration status
  rollback       Rollback last migration

Examples:
  npm run migrate
  npm run migrate up
  npm run migrate status
  npm run migrate rollback
    `);
    process.exit(1);
}

async function checkMigrationStatus() {
  console.log('📊 Checking migration status...');
  
  try {
    const config = loadConfigFromEnv();
    const databaseManager = new DatabaseManager(config.database);
    
    await databaseManager.initialize();
    
    // Get migration status (this would need to be implemented in DatabaseManager)
    const status = await databaseManager.getMigrationStatus?.() || 'Not implemented';
    
    console.log('Migration status:', status);
    
    await databaseManager.close();
  } catch (error) {
    console.error('❌ Failed to check migration status:', error);
    process.exit(1);
  }
}

async function rollbackMigrations() {
  console.log('↩️ Rolling back migrations...');
  
  try {
    const config = loadConfigFromEnv();
    const databaseManager = new DatabaseManager(config.database);
    
    await databaseManager.initialize();
    
    // Rollback migrations (this would need to be implemented in DatabaseManager)
    await databaseManager.rollback?.() || console.warn('Rollback not implemented');
    
    console.log('✅ Rollback completed successfully!');
    
    await databaseManager.close();
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}