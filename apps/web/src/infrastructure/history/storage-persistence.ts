// TJ-ARCH-MOB-001 compliant

/** `navigator.storage.persisted()`; false when the browser has no such API or it fails. */
export async function readStoragePersisted(): Promise<boolean> {
  try {
    return (await navigator.storage.persisted()) === true;
  } catch {
    return false;
  }
}

/**
 * Asks the browser not to clear this site's storage under pressure
 * (`navigator.storage.persist()`). The browser may answer without a prompt; false when it
 * declines or the API is missing. Call it from a user action: some browsers refuse
 * otherwise.
 */
export async function requestStoragePersistence(): Promise<boolean> {
  try {
    return (await navigator.storage.persist()) === true;
  } catch {
    return false;
  }
}
