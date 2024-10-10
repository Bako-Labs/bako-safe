export * from './utils';
export * from './modules';
export * from './modules/service';
export * from './utils/assets';

/**
 * we have this package here because on build ;
 * the fuels replace not include export * from './sway/predicates/BakoPredicateLoader' on
 * the fuels.config.ts file destination
 *
 * */
export * from './sway/predicates/BakoPredicateLoader';
