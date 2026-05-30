import type { EntityState } from "@/types/canvas";

/**
 * Create an empty entity state
 */
export function createEntityState<T extends { id: string }>(): EntityState<T> {
  return {
    ids: [],
    entities: {},
  };
}

/**
 * Add a single entity to the state
 */
export function addEntity<T extends { id: string }>(
  state: EntityState<T>,
  entity: T
): EntityState<T> {
  return {
    ids: [...state.ids, entity.id],
    entities: {
      ...state.entities,
      [entity.id]: entity,
    },
  };
}

/**
 * Update an entity with partial changes
 */
export function updateEntity<T extends { id: string }>(
  state: EntityState<T>,
  id: string,
  changes: Partial<T>
): EntityState<T> {
  const existingEntity = state.entities[id];
  if (!existingEntity) {
    return state;
  }

  return {
    ...state,
    entities: {
      ...state.entities,
      [id]: {
        ...existingEntity,
        ...changes,
      },
    },
  };
}

/**
 * Remove a single entity from the state
 */
export function removeEntity<T extends { id: string }>(
  state: EntityState<T>,
  id: string
): EntityState<T> {
  const newEntities = { ...state.entities };
  delete newEntities[id];

  return {
    ids: state.ids.filter((existingId) => existingId !== id),
    entities: newEntities,
  };
}

/**
 * Remove multiple entities by ID array
 */
export function removeMany<T extends { id: string }>(
  state: EntityState<T>,
  ids: string[]
): EntityState<T> {
  const idsToRemove = new Set(ids);
  const newEntities = { ...state.entities };

  ids.forEach((id) => {
    delete newEntities[id];
  });

  return {
    ids: state.ids.filter((id) => !idsToRemove.has(id)),
    entities: newEntities,
  };
}

/**
 * Remove all entities
 */
export function removeAll<T extends { id: string }>(): EntityState<T> {
  return createEntityState<T>();
}
