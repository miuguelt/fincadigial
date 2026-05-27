export {
  checkAnimalDependencies,
  checkDependencies,
  clearAnimalDependencyCache,
  clearDependencyCache,
} from './api/dependencyCheck.service';

export type {
  DependencyCheckResult,
} from './api/dependencyCheck.types';

export {
  getRouteCoverageJSON,
} from './api/routesCoverage.service';
