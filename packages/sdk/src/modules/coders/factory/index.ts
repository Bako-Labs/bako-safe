/**
 * Coder factory module for Bako Safe
 *
 * This module provides factory classes for creating and configuring
 * different types of coders used in the Bako Safe system.
 *
 * The module includes:
 * - CoderFactory: Basic coder creation
 * - CoderConfigurationFactory: Advanced coder configuration with multiple encoders
 * - CoderConfiguration: Type definitions for coder configurations
 *
 * @module coder-factory
 */

export * from './CoderFactory';
export * from './CoderConfigurationFactory';
export type { CoderConfiguration } from './CoderConfigurationFactory';
